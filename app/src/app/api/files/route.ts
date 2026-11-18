import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { instrumenter } from "@/lib/metrics";

export const runtime = "nodejs";

export const GET = instrumenter("/api/files", async () => {
  const files = await prisma.file.findMany({
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      name: true,
      size: true,
      mimeType: true,
      description: true,
      uploadedAt: true,
    },
  });

  // BigInt n'est pas JSON-serializable par défaut → on convertit en number
  return NextResponse.json(
    files.map((f) => ({ ...f, size: Number(f.size) })),
  );
});
