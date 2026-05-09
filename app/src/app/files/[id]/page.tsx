import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function FilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const file = await prisma.file.findUnique({ where: { id } });
  if (!file) notFound();

  const streamUrl = `/api/stream/${file.id}`;
  const downloadUrl = `${streamUrl}?download=1`;

  return (
    <div>
      {/* En-tête du document */}
      <div className="mb-8 pb-6 border-b border-border">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-soft mb-2">
          Document · {file.mimeType}
        </p>
        <h1 className="text-3xl md:text-4xl font-serif leading-tight mb-4">
          {file.name}
        </h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-mono text-slate">
          <span>{formatBytes(file.size)}</span>
          <span className="text-border">·</span>
          <span>Publié le {formatDate(file.uploadedAt)}</span>
          {file.checksum && (
            <>
              <span className="text-border">·</span>
              <span className="text-slate-soft">
                sha256:{file.checksum.slice(0, 12)}…
              </span>
            </>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <a href={downloadUrl} className="btn">
            ↓ Télécharger
          </a>
          <a
            href={streamUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost"
          >
            Ouvrir dans un onglet
          </a>
          <Link href="/" className="btn-ghost">
            ← Retour
          </Link>
        </div>
      </div>

      {/* Preview inline : le navigateur gère le rendu PDF.
          Avec Range support côté API, le viewer charge progressivement. */}
      <div className="border border-border bg-ink/5">
        <iframe
          src={streamUrl}
          title={file.name}
          className="w-full h-[80vh] block"
        />
      </div>

      <p className="mt-3 text-xs font-mono text-slate-soft text-center">
        Si la prévisualisation ne se charge pas, utilise « Télécharger ».
      </p>
    </div>
  );
}
