"use client";

import { useCallback, useEffect, useState } from "react";
import SearchInput from "@/components/ui/SearchInput";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { trackEvent } from "@/lib/analytics";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import {
  useCommandPaletteSearch,
  useFilteredCommandItems,
} from "@/hooks/useCommandPaletteSearch";
import type { CommandItem } from "@/lib/commandPaletteSearch";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
};

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const { role } = useAuth();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const { items } = useCommandPaletteSearch({ enabled: open });
  const filtered = useFilteredCommandItems(items, query);

  useEffect(() => {
    if (!open) {
      deferEffectUpdate(() => {
        setQuery("");
        setSelected(0);
      });
      return;
    }

    trackEvent("command_palette_opened");
  }, [open]);

  const run = useCallback(
    (item: CommandItem) => {
      onClose();
      if (item.href) router.push(item.href);
    },
    [onClose, router],
  );

  useEffect(() => {
    deferEffectUpdate(() => {
      setSelected(0);
    });
  }, [query, open]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelected((value) => Math.min(value + 1, filtered.length - 1));
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelected((value) => Math.max(value - 1, 0));
      }

      if (event.key === "Enter" && filtered[selected]) {
        event.preventDefault();
        run(filtered[selected]);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtered, onClose, open, selected, run]);

  if (!open) return null;

  let lastGroup = "";

  return (
    <div
      className="ui-command-overlay animate-fade-in fixed inset-0 z-[1000] flex items-start justify-center bg-black/55 p-4 pt-[10vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="ui-command-panel animate-scale-in w-full max-w-xl overflow-hidden"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="flex items-center gap-2 border-b border-app-border px-4 py-3">
          <span className="text-[13px] font-medium text-app-subtle">⌘K</span>
          <SearchInput
            autoFocus
            value={query}
            onChange={setQuery}
            placeholder={
              role === "atleet"
                ? "Zoek pagina's, acties, programma…"
                : "Zoek atleten, programma's, berichten, pagina's…"
            }
            variant="ghost"
            hideIcon
            showClear={false}
            className="flex-1"
            aria-label="Zoeken"
          />
        </div>
        <ul className="max-h-[min(52vh,420px)] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <li className="px-4 py-8 text-center text-[13px] text-app-muted">
              Geen resultaten
            </li>
          ) : (
            filtered.map((item, index) => {
              const showGroup = item.group !== lastGroup;
              lastGroup = item.group;

              return (
                <li key={item.id}>
                  {showGroup ? (
                    <p className="px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                      {item.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => run(item)}
                    className={`ui-command-item app-focus-ring ${
                      index === selected ? "ui-command-item-active" : ""
                    }`}
                  >
                    <span className="font-medium text-app-text">{item.label}</span>
                    {item.hint ? (
                      <span className="truncate text-[12px] text-app-muted">
                        {item.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}
