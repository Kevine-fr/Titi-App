import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Archive — Documents",
  description: "Bibliothèque de documents PDF",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <header className="border-b border-border">
          <div className="max-w-5xl mx-auto px-6 py-5 flex items-baseline justify-between">
            <Link href="/" className="group flex items-baseline gap-3">
              <span className="font-serif text-2xl tracking-tight">Archive</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-soft">
                / documents
              </span>
            </Link>
            <nav className="flex items-center gap-6 text-xs uppercase tracking-widest font-mono text-slate">
              <Link href="/" className="hover:text-ink transition-colors">
                Catalogue
              </Link>
              <Link href="/admin" className="hover:text-ink transition-colors">
                Admin
              </Link>
            </nav>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-6 py-12">{children}</main>

        <footer className="mt-24 border-t border-border">
          <div className="max-w-5xl mx-auto px-6 py-6 flex justify-between items-center text-xs font-mono text-slate-soft">
            <span>© Archive</span>
            <span>self-hosted · pdf only</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
