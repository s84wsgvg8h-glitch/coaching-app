"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { X } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import {
  getDemoPages,
  groupDemoPages,
  type DemoPageLink,
} from "@/lib/demo/demoPages";
import { getDemoPersona } from "@/lib/demo/demoMode";

type DemoPagesSheetProps = {
  open: boolean;
  onClose: () => void;
};

export default function DemoPagesSheet({ open, onClose }: DemoPagesSheetProps) {
  const [query, setQuery] = useState("");
  const persona = getDemoPersona();
  const pages = useMemo(() => getDemoPages(persona), [persona, open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (page) =>
        page.label.toLowerCase().includes(q) ||
        page.group.toLowerCase().includes(q) ||
        page.href.toLowerCase().includes(q),
    );
  }, [pages, query]);

  const grouped = useMemo(() => groupDemoPages(filtered), [filtered]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Sluit pagina-overzicht"
        onClick={onClose}
      />
      <div className="demo-pages-sheet absolute inset-x-0 bottom-0 flex max-h-[min(88dvh,720px)] flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0d1018] shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/8 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-300">
              Demo verkenner
            </p>
            <h2 className="text-[15px] font-semibold text-white">
              {persona === "atleet" ? "Alle atleet-pagina's" : "Alle coach-pagina's"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ui-icon-btn app-focus-ring"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 px-4 py-3">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Zoek pagina…"
            variant="rounded"
            showClear={false}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {grouped.length === 0 ? (
            <p className="py-8 text-center text-[13px] text-app-muted">
              Geen pagina&apos;s gevonden.
            </p>
          ) : (
            grouped.map(([group, items]) => (
              <section key={group} className="mb-4">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-app-muted">
                  {group}
                </p>
                <ul className="space-y-1">
                  {items.map((page) => (
                    <DemoPageRow key={page.href} page={page} onNavigate={onClose} />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function DemoPageRow({
  page,
  onNavigate,
}: {
  page: DemoPageLink;
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={page.href}
        onClick={onNavigate}
        className="app-focus-ring flex min-h-[44px] items-center justify-between gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-[13px] font-medium text-app-text transition hover:border-sky-500/30 hover:bg-sky-500/10"
      >
        <span>{page.label}</span>
        <span className="text-[11px] text-app-muted">→</span>
      </Link>
    </li>
  );
}
