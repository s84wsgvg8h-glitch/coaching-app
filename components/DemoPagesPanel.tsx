"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import {
  getDemoPages,
  groupDemoPages,
} from "@/lib/demo/demoPages";
import { getDemoPersona } from "@/lib/demo/demoMode";

/** Desktop sidebar panel — all demo pages for current persona */
export default function DemoPagesPanel() {
  const [query, setQuery] = useState("");
  const persona = getDemoPersona();
  const pages = useMemo(() => getDemoPages(persona), [persona]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pages;
    return pages.filter(
      (page) =>
        page.label.toLowerCase().includes(q) ||
        page.group.toLowerCase().includes(q),
    );
  }, [pages, query]);

  const grouped = useMemo(() => groupDemoPages(filtered), [filtered]);

  return (
    <aside className="demo-pages-panel hidden shrink-0 xl:block xl:w-[220px]">
      <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] max-h-[calc(100dvh-5rem-env(safe-area-inset-top))] overflow-y-auto rounded-2xl border border-sky-500/20 bg-sky-500/[0.06] p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-sky-300">
          Demo verkenner
        </p>
        <p className="mt-0.5 text-[12px] font-medium text-sky-100/90">
          {persona === "atleet" ? "Atleet-pagina's" : "Coach-pagina's"}
        </p>

        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-2.5 py-1.5">
          <Search className="h-3.5 w-3.5 text-app-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek…"
            className="w-full bg-transparent text-[12px] text-app-text outline-none placeholder:text-app-muted"
          />
        </div>

        <div className="mt-3 space-y-3">
          {grouped.map(([group, items]) => (
            <div key={group}>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-app-muted">
                {group}
              </p>
              <ul className="space-y-0.5">
                {items.map((page) => (
                  <li key={page.href}>
                    <Link
                      href={page.href}
                      className="block rounded-lg px-2 py-1.5 text-[12px] font-medium text-app-text/90 transition hover:bg-sky-500/15 hover:text-white"
                    >
                      {page.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
