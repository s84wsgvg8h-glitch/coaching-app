"use client";

import { useMemo, useState } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  createAthleteDashboardItem,
  deleteAthleteDashboardItem,
  toggleAthleteDashboardItem,
  type AthleteDashboardItem,
} from "@/lib/athleteDashboardItems";
import {
  invalidateAthleteDashboardItems,
  useAthleteDashboardItems,
} from "@/hooks/useAthleteDashboardItems";

type CoachAthleteDashboardTodosProps = {
  athleteId: string;
  coachId: string;
};

export default function CoachAthleteDashboardTodos({
  athleteId,
  coachId,
}: CoachAthleteDashboardTodosProps) {
  const queryClient = useQueryClient();
  const { data: items = [], isPending } = useAthleteDashboardItems(
    athleteId,
    Boolean(athleteId),
  );
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const coachTodos = useMemo(
    () => items.filter((item) => item.item_type === "todo" && item.created_by === "coach"),
    [items],
  );

  async function refresh() {
    await invalidateAthleteDashboardItems(queryClient, athleteId);
  }

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { error: createError } = await createAthleteDashboardItem({
      athleteId,
      coachId,
      title: draft,
      itemType: "todo",
      createdBy: "coach",
    });

    setSaving(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    setDraft("");
    setAdding(false);
    await refresh();
  }

  async function handleToggle(item: AthleteDashboardItem) {
    const { error: toggleError } = await toggleAthleteDashboardItem(item);
    if (toggleError) setError(toggleError.message);
    else await refresh();
  }

  async function handleDelete(itemId: string) {
    const { error: deleteError } = await deleteAthleteDashboardItem(itemId);
    if (deleteError) setError(deleteError.message);
    else await refresh();
  }

  return (
    <section className="app-card mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
            Dashboard todos
          </p>
          <h2 className="mt-1 text-lg font-semibold text-app-text">
            Taken voor op Home
          </h2>
          <p className="mt-1 text-sm text-app-muted">
            Deze todos verschijnen op het dashboard van de atleet.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setAdding((value) => !value);
            setError(null);
          }}
          className="app-btn-secondary inline-flex min-h-[44px] items-center gap-2 text-sm"
        >
          <Plus className="h-4 w-4" />
          Todo toevoegen
        </button>
      </div>

      {adding ? (
        <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={handleAdd}>
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Bijv. Upload squat video"
            className="app-input min-h-[44px] min-w-0 flex-1"
            autoFocus
            maxLength={120}
          />
          <button
            type="submit"
            disabled={saving || !draft.trim()}
            className="app-btn-primary min-h-[44px] shrink-0 px-5 disabled:opacity-50"
          >
            {saving ? "Opslaan…" : "Opslaan"}
          </button>
        </form>
      ) : null}

      {error ? (
        <p className="mt-3 text-sm text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="mt-4 space-y-2">
        {isPending && coachTodos.length === 0 ? (
          <li className="text-sm text-app-muted">Todos laden…</li>
        ) : null}
        {!isPending && coachTodos.length === 0 ? (
          <li className="rounded-xl border border-dashed border-app-panel-border px-4 py-5 text-sm text-app-muted">
            Nog geen coach-todos voor dit dashboard.
          </li>
        ) : null}
        {coachTodos.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-xl border border-app-panel-border bg-app-panel-inset px-3 py-2.5"
          >
            <button
              type="button"
              onClick={() => void handleToggle(item)}
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                item.completed
                  ? "border-brand-purple/50 bg-brand-purple text-white"
                  : "border-app-panel-border-strong"
              }`}
              aria-label={item.completed ? "Todo openzetten" : "Todo afvinken"}
            >
              {item.completed ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
            </button>
            <span
              className={`min-w-0 flex-1 text-sm ${
                item.completed ? "text-app-muted line-through" : "text-app-text"
              }`}
            >
              {item.title}
            </span>
            <button
              type="button"
              onClick={() => void handleDelete(item.id)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-app-muted transition hover:bg-red-500/10 hover:text-red-400"
              aria-label="Todo verwijderen"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
