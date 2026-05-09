import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/format";

// Pas de cache : la liste reflète la DB
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const files = await prisma.file.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div>
      <div className="mb-12">
        <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-soft mb-3">
          Catalogue · {files.length} document{files.length > 1 ? "s" : ""}
        </p>
        <h1 className="text-5xl md:text-6xl font-serif leading-none">
          Documents <span className="italic text-accent">disponibles</span>
        </h1>
      </div>

      {files.length === 0 ? (
        <div className="border border-dashed border-border p-12 text-center">
          <p className="text-slate font-serif text-lg italic">
            Aucun document n&apos;a encore été publié.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border border-y border-border">
          {files.map((file) => (
            <li key={file.id}>
              <Link
                href={`/files/${file.id}`}
                className="group flex items-center gap-6 py-5 px-2 hover:bg-ink hover:text-cream transition-colors"
              >
                <span className="font-mono text-xs text-slate-soft group-hover:text-cream/60 w-24 flex-shrink-0">
                  {formatDate(file.uploadedAt).split(" à ")[0]}
                </span>
                <span className="font-serif text-lg flex-1 truncate">
                  {file.name}
                </span>
                <span className="font-mono text-xs text-slate group-hover:text-cream/80 flex-shrink-0">
                  {formatBytes(file.size)}
                </span>
                <span className="font-mono text-xs text-accent group-hover:text-cream uppercase tracking-widest flex-shrink-0">
                  Voir →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
