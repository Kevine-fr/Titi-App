import { NextResponse, type NextRequest } from "next/server";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { unlink, rename } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateStorageKey,
  getFilePath,
  MAX_UPLOAD_SIZE_BYTES,
} from "@/lib/storage";

// On a besoin de Node (streams natifs, fs) — pas de Edge runtime ici.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Laisse le temps à un upload lent de finir (en secondes).
export const maxDuration = 600;

/**
 * Convention d'upload :
 *  - method  : POST /api/upload
 *  - headers :
 *      Content-Type   : application/pdf
 *      Content-Length : <taille en octets>
 *      X-File-Name    : <nom original, encodé URL>
 *  - body    : les octets bruts du fichier (pas de multipart, pas de FormData)
 *
 * On stream directement vers le disque, sans bufferiser en RAM.
 */
export async function POST(req: NextRequest) {
  // --- 1. Auth admin ---
  const session = await getSession();
  if (!session.adminId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  // --- 2. Validation des headers ---
  const rawFilename = req.headers.get("x-file-name");
  if (!rawFilename) {
    return NextResponse.json(
      { error: "Header X-File-Name manquant" },
      { status: 400 },
    );
  }
  const filename = decodeURIComponent(rawFilename);

  const mimeType = req.headers.get("content-type") ?? "application/octet-stream";
  if (mimeType !== "application/pdf") {
    return NextResponse.json(
      { error: "Seuls les fichiers PDF sont acceptés" },
      { status: 415 },
    );
  }

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > 0 && contentLength > MAX_UPLOAD_SIZE_BYTES) {
    return NextResponse.json(
      { error: `Fichier trop volumineux (max ${MAX_UPLOAD_SIZE_BYTES} octets)` },
      { status: 413 },
    );
  }

  if (!req.body) {
    return NextResponse.json({ error: "Corps de requête vide" }, { status: 400 });
  }

  // --- 3. Préparation du stream vers disque ---
  const storageKey = generateStorageKey();
  const finalPath = getFilePath(storageKey);
  const tempPath = `${finalPath}.part`;

  const hash = createHash("sha256");
  let bytesWritten = 0;

  // Transform stream qui inspecte chaque chunk : compte + hash + limite.
  const inspector = new Transform({
    transform(chunk, _enc, cb) {
      bytesWritten += chunk.length;
      if (bytesWritten > MAX_UPLOAD_SIZE_BYTES) {
        return cb(new Error("LIMIT_EXCEEDED"));
      }
      hash.update(chunk);
      cb(null, chunk);
    },
  });

  // --- 4. Pipeline : Web stream → Node stream → inspector → disque ---
  try {
    await pipeline(
      // Cast nécessaire : les types Web/Node de ReadableStream divergent
      Readable.fromWeb(req.body as unknown as import("stream/web").ReadableStream),
      inspector,
      createWriteStream(tempPath),
    );
  } catch (err) {
    // Cleanup du fichier partiel
    await unlink(tempPath).catch(() => {});
    const isLimit = (err as Error).message === "LIMIT_EXCEEDED";
    return NextResponse.json(
      { error: isLimit ? "Fichier trop volumineux" : "Échec de l'upload" },
      { status: isLimit ? 413 : 500 },
    );
  }

  // --- 5. Rename atomique vers la position finale ---
  try {
    await rename(tempPath, finalPath);
  } catch {
    await unlink(tempPath).catch(() => {});
    return NextResponse.json({ error: "Échec du commit du fichier" }, { status: 500 });
  }

  // --- 6. Création du record DB ---
  const file = await prisma.file.create({
    data: {
      name: filename,
      storageKey,
      size: BigInt(bytesWritten),
      mimeType,
      checksum: hash.digest("hex"),
      uploadedBy: session.adminEmail,
    },
  });

  return NextResponse.json({
    id: file.id,
    name: file.name,
    size: bytesWritten,
  });
}
