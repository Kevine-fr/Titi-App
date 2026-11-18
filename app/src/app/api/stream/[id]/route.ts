import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getFilePath } from "@/lib/storage";
import { instrumenter } from "@/lib/metrics";
import { lirePlage } from "@/lib/range";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/stream/[id]
 *   - sert le PDF avec support des Range requests (critique pour la preview inline :
 *     le viewer PDF du navigateur charge les pages à la demande au lieu de
 *     tout télécharger en bloc).
 *   - ?download=1 force Content-Disposition: attachment.
 */
export const GET = instrumenter("/api/stream/[id]", async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const url = new URL(req.url);
  const forceDownload = url.searchParams.get("download") === "1";

  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) {
    return new Response("Fichier introuvable", { status: 404 });
  }

  const filePath = getFilePath(file.storageKey);
  let fileSize: number;
  try {
    const s = await stat(filePath);
    fileSize = s.size;
  } catch {
    return new Response("Fichier disque manquant", { status: 410 });
  }

  // Encodage RFC 5987 pour les noms non-ASCII
  const encodedName = encodeURIComponent(file.name);
  const disposition = `${forceDownload ? "attachment" : "inline"}; filename*=UTF-8''${encodedName}`;

  const plage = lirePlage(req.headers.get("range"), fileSize);
  const baseHeaders: Record<string, string> = {
    "Content-Type": file.mimeType,
    "Accept-Ranges": "bytes",
    "Content-Disposition": disposition,
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };

  // --- Cas Range request (206 Partial Content) ---
  if (plage === "invalide") {
    return new Response("Range invalide", {
      status: 416,
      headers: { "Content-Range": `bytes */${fileSize}` },
    });
  }
  if (plage) {
    const { start, end } = plage;

    const chunkSize = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });
    return new Response(
      Readable.toWeb(nodeStream) as unknown as ReadableStream,
      {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Length": String(chunkSize),
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        },
      },
    );
  }

  // --- Cas full download (200) ---
  const nodeStream = createReadStream(filePath);
  return new Response(
    Readable.toWeb(nodeStream) as unknown as ReadableStream,
    {
      status: 200,
      headers: { ...baseHeaders, "Content-Length": String(fileSize) },
    },
  );
});
