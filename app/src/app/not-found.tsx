import Link from "next/link";

export default function NotFound() {
  return (
    <div className="text-center py-24">
      <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-slate-soft mb-4">
        404
      </p>
      <h1 className="text-5xl font-serif mb-4">
        <span className="italic text-accent">Introuvable</span>
      </h1>
      <p className="text-slate font-serif italic mb-8">
        Ce document n&apos;existe pas ou a été retiré.
      </p>
      <Link href="/" className="btn-ghost">
        ← Retour au catalogue
      </Link>
    </div>
  );
}
