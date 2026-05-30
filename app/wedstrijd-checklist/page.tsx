"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { isCoachLikeRole } from "@/lib/authRoles";
import { supabase } from "@/lib/supabaseClient";
import {
  COMPETITION_CHECKLIST,
  getAllChecklistItemIds,
  getCompetitionChecklistStorageKey,
  loadCompetitionChecklistTemplate,
} from "@/lib/competitionChecklist";
import type { CompetitionChecklistSection } from "@/lib/competitionChecklist";

export default function CompetitionChecklistPage() {
  const [userId, setUserId] = useState("");
  const [sections, setSections] = useState<CompetitionChecklistSection[]>(
    COMPETITION_CHECKLIST,
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Wedstrijd checklist";
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setUserId(user.id);

      if (isCoachLikeRole(profile?.role)) {
        window.location.href = "/profile?section=settings";
        return;
      }

      const template = await loadCompetitionChecklistTemplate(user.id);
      setSections(template.sections);

      try {
        const raw = localStorage.getItem(getCompetitionChecklistStorageKey(user.id));
        if (raw) {
          setCheckedItems(JSON.parse(raw) as Record<string, boolean>);
        }
      } catch {
        setCheckedItems({});
      }

      setLoading(false);
    }

    void load();
  }, []);

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

  function resetChecklist() {
    const resetState = Object.fromEntries(
      getAllChecklistItemIds(sections).map((itemId) => [itemId, false]),
    );
    setCheckedItems(resetState);
  }

  return (
    <AppShell contentClassName="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
              Wedstrijdvoorbereiding
            </p>
            <h1 className="text-3xl font-bold text-black">Competition checklist</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <p className="text-gray-600">
                Vink alles af wat je ingepakt of geregeld hebt voor je wedstrijd.
              </p>
              {!loading && (
                <p className="text-sm font-semibold text-gray-700">
                  {progress.checkedCount} van {progress.totalCount} items afgevinkt
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {!loading && (
              <button
                type="button"
                onClick={resetChecklist}
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-black hover:bg-gray-50"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-6 shadow-xl">
            <p className="text-gray-500">Checklist laden...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <section
                key={section.id}
                className="overflow-hidden rounded-2xl bg-white shadow-xl"
              >
                <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5">
                  <h2 className="text-base font-bold text-black">{section.title}</h2>
                </div>

                <div className="divide-y divide-gray-100">
                  {section.items.map((item) => {
                    const checked = Boolean(checkedItems[item.id]);

                    return (
                      <label
                        key={item.id}
                        className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(item.id)}
                          className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span className="text-sm font-semibold text-black">
                              {item.label}
                            </span>
                            {item.note && (
                              <span className="text-xs text-gray-500">{item.note}</span>
                            )}
                            {item.emphasis && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-red-700">
                                Belangrijk
                              </span>
                            )}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
