import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getFilePath } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session.adminId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const { id } = await params;
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) {
    return NextResponse.json({ error: "Fichier introuvable" }, { status: 404 });
  }

  // On supprime le record DB d'abord, puis le fichier disque.
  // Si le rm disque échoue, le record est déjà parti — on log juste.
  await prisma.file.delete({ where: { id } });
  try {
    await unlink(getFilePath(file.storageKey));
  } catch (err) {
    console.warn(`[delete] Fichier disque déjà absent ou erreur:`, err);
  }

  return NextResponse.json({ ok: true });
}
