"use client";

import { useCallback, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import { useRouter } from "next/navigation";

type UploadState = {
  file: File;
  progress: number; // 0..100
  status: "uploading" | "done" | "error";
  error?: string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} Ko`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} Mo`;
  return `${(n / 1024 ** 3).toFixed(2)} Go`;
}

/**
 * Upload via XMLHttpRequest pour avoir le `progress` réel
 * (fetch n'expose toujours pas l'upload progress en 2026).
 * On envoie le fichier en raw body avec X-File-Name + Content-Type.
 */
function uploadFile(
  file: File,
  onProgress: (pct: number) => void,
): Promise<{ id: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.setRequestHeader("Content-Type", file.type || "application/pdf");
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Réponse serveur invalide"));
        }
      } else {
        let msg = `Erreur ${xhr.status}`;
        try {
          msg = JSON.parse(xhr.responseText).error ?? msg;
        } catch {}
        reject(new Error(msg));
      }
    };
    xhr.onerror = () => reject(new Error("Erreur réseau"));
    xhr.onabort = () => reject(new Error("Upload annulé"));

    xhr.send(file);
  });
}

export default function Dropzone({
  maxSizeBytes,
}: {
  maxSizeBytes: number;
}) {
  const router = useRouter();
  const [uploads, setUploads] = useState<UploadState[]>([]);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejections: FileRejection[]) => {
      // Pré-affichage des rejets (mauvais type / trop gros)
      if (rejections.length) {
        setUploads((prev) => [
          ...prev,
          ...rejections.map((r) => ({
            file: r.file,
            progress: 0,
            status: "error" as const,
            error: r.errors[0]?.message ?? "Fichier rejeté",
          })),
        ]);
      }

      // Upload séquentiel : on évite de saturer le serveur avec plusieurs
      // gros fichiers en parallèle. Un par un, avec progression réelle.
      for (const file of acceptedFiles) {
        setUploads((prev) => [
          ...prev,
          { file, progress: 0, status: "uploading" },
        ]);
        try {
          await uploadFile(file, (pct) => {
            setUploads((prev) =>
              prev.map((u) =>
                u.file === file ? { ...u, progress: pct } : u,
              ),
            );
          });
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file ? { ...u, status: "done", progress: 100 } : u,
            ),
          );
          router.refresh(); // reload de la liste
        } catch (err) {
          setUploads((prev) =>
            prev.map((u) =>
              u.file === file
                ? { ...u, status: "error", error: (err as Error).message }
                : u,
            ),
          );
        }
      }
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    maxSize: maxSizeBytes,
    multiple: true,
  });

  return (
    <div>
      <div
        {...getRootProps()}
        className={[
          "relative border-2 border-dashed p-12 text-center cursor-pointer transition-all",
          isDragActive
            ? "border-accent bg-accent/5"
            : "border-border hover:border-ink",
        ].join(" ")}
      >
        <input {...getInputProps()} />

        {/* Coins décoratifs type cadre archive */}
        <span className="absolute top-2 left-2 w-3 h-3 border-t border-l border-ink" />
        <span className="absolute top-2 right-2 w-3 h-3 border-t border-r border-ink" />
        <span className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-ink" />
        <span className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-ink" />

        <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-slate-soft mb-3">
          Dépôt
        </p>
        <p className="font-serif text-2xl mb-2">
          {isDragActive ? (
            <span className="italic text-accent">Lâche le fichier…</span>
          ) : (
            <>
              Glisse un PDF ici{" "}
              <span className="italic text-slate">ou clique</span>
            </>
          )}
        </p>
        <p className="text-xs font-mono text-slate-soft">
          PDF uniquement · max {formatBytes(maxSizeBytes)}
        </p>
      </div>

      {/* Liste des uploads en cours / terminés */}
      {uploads.length > 0 && (
        <ul className="mt-6 space-y-3">
          {uploads.map((u, i) => (
            <li
              key={`${u.file.name}-${i}`}
              className="border border-border p-4"
            >
              <div className="flex items-baseline justify-between gap-4 mb-2">
                <span className="font-serif truncate flex-1">{u.file.name}</span>
                <span className="font-mono text-xs text-slate flex-shrink-0">
                  {formatBytes(u.file.size)}
                </span>
              </div>

              {u.status === "uploading" && (
                <>
                  <div className="h-1 bg-border overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all duration-150"
                      style={{ width: `${u.progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs font-mono text-slate-soft">
                    {u.progress}% · upload en cours…
                  </p>
                </>
              )}
              {u.status === "done" && (
                <p className="text-xs font-mono text-accent uppercase tracking-widest">
                  ✓ Publié
                </p>
              )}
              {u.status === "error" && (
                <p className="text-xs font-mono text-danger uppercase tracking-widest">
                  ✗ {u.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
