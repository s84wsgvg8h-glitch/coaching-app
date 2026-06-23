"use client";

import { useEffect, useMemo, useState } from "react";
import {
  COMPETITION_CHECKLIST,
  getAllChecklistItemIds,
  getCompetitionChecklistStorageKey,
  loadCompetitionChecklistTemplate,
} from "@/lib/competitionChecklist";
import type { CompetitionChecklistSection } from "@/lib/competitionChecklist";

type CompetitionChecklistPanelProps = {
  userId: string;
  compact?: boolean;
};

export default function CompetitionChecklistPanel({
  userId,
  compact = false,
}: CompetitionChecklistPanelProps) {
  const [sections, setSections] = useState<CompetitionChecklistSection[]>(
    COMPETITION_CHECKLIST,
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const template = await loadCompetitionChecklistTemplate(userId);
      setSections(template.sections);

      try {
        const raw = localStorage.getItem(getCompetitionChecklistStorageKey(userId));
        if (raw) {
          setCheckedItems(JSON.parse(raw) as Record<string, boolean>);
        }
      } catch {
        setCheckedItems({});
      }

      setLoading(false);
    }

    void load();
  }, [userId]);

  useEffect(() => {
    if (!userId || loading) return;

    localStorage.setItem(
      getCompetitionChecklistStorageKey(userId),
      JSON.stringify(checkedItems),
    );
  }, [checkedItems, loading, userId]);

  const progress = useMemo(() => {
    const allItems = sections.flatMap((section) => section.items);
    const checkedCount = allItems.filter((item) => checkedItems[item.id]).length;
    return {
      checkedCount,
      totalCount: allItems.length,
    };
  }, [checkedItems, sections]);

  function toggleItem(itemId: string) {
    setCheckedItems((current) => ({
      ...current,
      [itemId]: !current[itemId],
    }));
  }

  if (loading) {
    return <p className="text-sm text-app-muted">Checklist laden...</p>;
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-app-text">
            {progress.checkedCount} van {progress.totalCount} items afgevinkt
          </p>
          <button
            type="button"
            onClick={() =>
              setCheckedItems(
                Object.fromEntries(
                  getAllChecklistItemIds(sections).map((itemId) => [itemId, false]),
                ),
              )
            }
            className="text-xs font-semibold text-app-muted hover:text-app-text"
          >
            Reset
          </button>
        </div>
      )}

      {sections.map((section) => (
        <section
          key={section.id}
          className="overflow-hidden rounded-2xl border border-app-border bg-app-surface"
        >
          <div className="border-b border-app-border bg-app-surface-muted px-4 py-2">
            <h3 className="text-sm font-bold text-app-text">{section.title}</h3>
          </div>
          <div className="divide-y divide-app-border">
            {section.items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-app-surface-muted"
              >
                <input
                  type="checkbox"
                  checked={Boolean(checkedItems[item.id])}
                  onChange={() => toggleItem(item.id)}
                  className="h-4 w-4 accent-brand-purple"
                />
                <span className="text-sm text-app-text">{item.label}</span>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
