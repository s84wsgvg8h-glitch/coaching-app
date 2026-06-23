"use client";

import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";

type LegalPageShellProps = {
  title: string;
  updated: string;
  children: React.ReactNode;
};

export default function LegalPageShell({
  title,
  updated,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-[100dvh] bg-app-bg px-4 py-8 pt-safe pb-safe">
      <div className="absolute right-4 top-4 z-10 pt-safe sm:right-6 sm:top-6">
        <ThemeToggle compact />
      </div>
      <article className="mx-auto max-w-3xl">
        <Link
          href="/login"
          className="text-[13px] font-medium text-app-accent hover:underline"
        >
          ← Terug naar login
        </Link>
        <header className="mt-6 border-b border-app-border/60 pb-6">
          <p className="text-[12px] font-medium uppercase tracking-wide text-app-subtle">
            Limitless Coaching
          </p>
          <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-app-text md:text-[32px]">
            {title}
          </h1>
          <p className="mt-2 text-[13px] text-app-muted">Laatst bijgewerkt: {updated}</p>
        </header>
        <div className="legal-prose mt-8 space-y-6 text-[15px] leading-relaxed text-app-text">
          {children}
        </div>
        <footer className="mt-12 flex flex-wrap gap-4 border-t border-app-border/60 pt-6 text-[13px] text-app-muted">
          <Link href="/privacy" className="hover:text-app-text hover:underline">
            Privacybeleid
          </Link>
          <Link href="/voorwaarden" className="hover:text-app-text hover:underline">
            Algemene voorwaarden
          </Link>
          <Link href="/login" className="hover:text-app-text hover:underline">
            Inloggen
          </Link>
        </footer>
      </article>
    </main>
  );
}
