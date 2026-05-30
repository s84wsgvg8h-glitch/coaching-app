"use client";

import { useState } from "react";

type CollapsibleFilterSidebarProps = {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export default function CollapsibleFilterSidebar({
  title,
  children,
  defaultOpen = true,
}: CollapsibleFilterSidebarProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-app-border bg-app-surface transition-all duration-150 lg:flex ${
        open ? "w-52" : "w-12"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 border-b border-app-border px-2 py-3 text-left app-focus-ring"
        title={open ? "Navigatie inklappen" : "Navigatie uitklappen"}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-surface-muted text-sm">
          {open ? "◀" : "▶"}
        </span>
        {open && (
          <span className="truncate text-xs font-bold uppercase tracking-wide text-app-muted">
            {title}
          </span>
        )}
      </button>
      {open ? (
        <div className="min-h-0 flex-1 overflow-y-auto p-2 mobile-scroll">
          {children}
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center gap-2 py-2">
          <span
            className="text-[10px] font-bold uppercase tracking-widest text-app-muted [writing-mode:vertical-rl]"
            aria-hidden
          >
            {title.slice(0, 12)}
          </span>
        </div>
      )}
    </aside>
  );
}
