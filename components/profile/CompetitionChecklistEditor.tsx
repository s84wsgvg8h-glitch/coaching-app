"use client";

import { useEffect, useRef, useState } from "react";
import {
  COMPETITION_CHECKLIST,
  type CompetitionChecklistItem,
  type CompetitionChecklistSection,
} from "@/lib/competitionChecklist";

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function cleanChecklistSections(sections: CompetitionChecklistSection[]) {
  return sections
    .map((section) => ({
      ...section,
      title: section.title.trim(),
      items: section.items.filter((item) => item.label.trim()),
    }))
    .filter((section) => section.title && section.items.length > 0);
}

type CompetitionChecklistEditorProps = {
  sections: CompetitionChecklistSection[];
  onChange: (sections: CompetitionChecklistSection[]) => void;
  compact?: boolean;
  title?: string;
  description?: string;
};

export default function CompetitionChecklistEditor({
  sections,
  onChange,
  compact = false,
  title = "Wedstrijd checklist",
  description,
}: CompetitionChecklistEditorProps) {
  function updateSectionTitle(sectionIndex: number, value: string) {
    onChange(
      sections.map((section, index) =>
        index === sectionIndex ? { ...section, title: value } : section,
      ),
    );
  }

  function updateItem(
    sectionIndex: number,
    itemIndex: number,
    patch: Partial<CompetitionChecklistItem>,
  ) {
    onChange(
      sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              items: section.items.map((item, currentItemIndex) =>
                currentItemIndex === itemIndex ? { ...item, ...patch } : item,
              ),
            }
          : section,
      ),
    );
  }

  function addSection() {
    onChange([
      ...sections,
      {
        id: createId("section"),
        title: "Nieuwe sectie",
        items: [{ id: createId("item"), label: "Nieuw item" }],
      },
    ]);
  }

  function removeSection(sectionIndex: number) {
    if (!window.confirm("Deze sectie en alle items verwijderen?")) return;
    onChange(sections.filter((_, index) => index !== sectionIndex));
  }

  function addItem(sectionIndex: number) {
    onChange(
      sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              items: [
                ...section.items,
                { id: createId("item"), label: "Nieuw item" },
              ],
            }
          : section,
      ),
    );
  }

  function removeItem(sectionIndex: number, itemIndex: number) {
    onChange(
      sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          items: section.items.filter(
            (_, currentItemIndex) => currentItemIndex !== itemIndex,
          ),
        };
      }),
    );
  }

  const inputClass = compact
    ? "w-full min-h-[44px] rounded-lg border border-app-border bg-app-surface px-2 py-1 text-sm text-app-text outline-none placeholder:text-app-subtle focus:border-app-accent/50 focus:ring-2 focus:ring-app-accent/20 md:min-h-[36px]"
    : "w-full min-h-[44px] rounded-xl border border-app-border bg-app-surface px-3 py-2 text-app-text outline-none placeholder:text-app-subtle focus:border-app-accent/50 focus:ring-2 focus:ring-app-accent/20";

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-app-text">{title}</h2>
        {description ? (
          <p className="mt-1 text-[13px] text-app-muted">{description}</p>
        ) : null}
      </div>

      {sections.map((section, sectionIndex) => (
        <section
          key={section.id}
          className={`rounded-2xl border border-app-border bg-app-surface-muted ${
            compact ? "p-3" : "p-4 sm:p-5"
          }`}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={section.title}
              onChange={(event) =>
                updateSectionTitle(sectionIndex, event.target.value)
              }
              className={`${inputClass} min-w-0 flex-1 font-semibold sm:min-w-[180px]`}
              placeholder="Sectienaam"
            />
            <button
              type="button"
              onClick={() => removeSection(sectionIndex)}
              className="inline-flex min-h-[44px] items-center rounded-lg border border-red-500/30 bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 app-focus-ring md:min-h-[36px]"
            >
              Sectie ×
            </button>
          </div>

          <div className="space-y-2">
            {section.items.map((item, itemIndex) => (
              <div
                key={item.id}
                className={`grid gap-2 rounded-xl border border-app-border bg-app-surface ${
                  compact
                    ? "grid-cols-1 px-2 py-1.5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto]"
                    : "grid-cols-1 p-3 md:grid-cols-2"
                }`}
              >
                <input
                  value={item.label}
                  onChange={(event) =>
                    updateItem(sectionIndex, itemIndex, {
                      label: event.target.value,
                    })
                  }
                  placeholder="Item"
                  className={inputClass}
                />
                <input
                  value={item.note || ""}
                  onChange={(event) =>
                    updateItem(sectionIndex, itemIndex, {
                      note: event.target.value,
                    })
                  }
                  placeholder="Notitie"
                  className={inputClass}
                />
                <label className="flex min-h-[44px] items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-app-muted md:min-h-0">
                  <input
                    type="checkbox"
                    checked={Boolean(item.emphasis)}
                    onChange={(event) =>
                      updateItem(sectionIndex, itemIndex, {
                        emphasis: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-[var(--app-accent)]"
                  />
                  Belangrijk
                </label>
                <button
                  type="button"
                  onClick={() => removeItem(sectionIndex, itemIndex)}
                  className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-red-500/30 bg-red-500/15 px-2 py-1 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 app-focus-ring md:min-h-[36px] md:min-w-[36px]"
                  aria-label="Item verwijderen"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addItem(sectionIndex)}
            className="mt-2 inline-flex min-h-[44px] items-center rounded-lg border border-app-border bg-app-surface px-3 py-1 text-xs font-semibold text-app-muted transition hover:bg-app-surface-hover hover:text-app-text app-focus-ring md:min-h-[32px]"
          >
            + Item
          </button>
        </section>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="app-btn-secondary min-h-[44px] text-sm"
      >
        Sectie toevoegen
      </button>
    </div>
  );
}

export function useAutoSaveChecklist(
  sections: CompetitionChecklistSection[],
  save: (sections: CompetitionChecklistSection[]) => Promise<void>,
  enabled: boolean,
) {
  const readyRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );

  useEffect(() => {
    readyRef.current = false;
    const timer = window.setTimeout(() => {
      readyRef.current = true;
    }, 200);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !readyRef.current) return;

    if (timerRef.current) window.clearTimeout(timerRef.current);

    timerRef.current = window.setTimeout(() => {
      void (async () => {
        setStatus("saving");
        try {
          await save(cleanChecklistSections(sections));
          setStatus("saved");
          window.setTimeout(() => setStatus("idle"), 2000);
        } catch {
          setStatus("error");
        }
      })();
    }, 700);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [sections, enabled, save]);

  return status;
}

export { COMPETITION_CHECKLIST };
