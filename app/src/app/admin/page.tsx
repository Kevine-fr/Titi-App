import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatBytes, formatDate } from "@/lib/format";
import Dropzone from "@/components/Dropzone";
import DeleteButton from "@/components/DeleteButton";
import LogoutButton from "@/components/LogoutButton";
import { MAX_UPLOAD_SIZE_BYTES } from "@/lib/storage";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await requireAdmin();
  const files = await prisma.file.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-12 gap-4 flex-wrap">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-soft mb-3">
            Connecté · {session.adminEmail}
          </p>
          <h1 className="text-5xl font-serif">
            Console <span className="italic text-accent">admin</span>
          </h1>
        </div>
        <LogoutButton />
      </div>

      {/* Zone de dépôt */}
      <section className="mb-16">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-soft mb-4">
          Publier un document
        </h2>
        <Dropzone maxSizeBytes={MAX_UPLOAD_SIZE_BYTES} />
      </section>

      {/* Table des fichiers */}
      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-soft mb-4">
          Documents publiés · {files.length}
        </h2>

        {files.length === 0 ? (
          <p className="text-slate font-serif italic py-8">
            Rien pour l&apos;instant.
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {files.map((file) => (
              <li
                key={file.id}
                className="flex items-center gap-4 py-4 px-2 flex-wrap"
              >
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/files/${file.id}`}
                    className="font-serif text-lg block truncate hover:text-accent transition-colors"
                  >
                    {file.name}
                  </Link>
                  <p className="text-xs font-mono text-slate-soft mt-0.5">
                    {formatDate(file.uploadedAt)} · {formatBytes(file.size)}
                  </p>
                </div>
                <a
                  href={`/api/stream/${file.id}?download=1`}
                  className="btn-ghost text-xs"
                >
                  ↓
                </a>
                <DeleteButton id={file.id} name={file.name} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
