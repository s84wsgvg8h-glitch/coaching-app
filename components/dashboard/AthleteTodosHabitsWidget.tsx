"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  createAthleteDashboardItem,
  deleteAthleteDashboardItem,
  toggleAthleteDashboardItem,
  updateAthleteDashboardItemHabitFrequency,
  type AthleteDashboardItem,
} from "@/lib/athleteDashboardItems";
import {
  HABIT_FREQUENCY_OPTIONS,
  getHabitFrequencyLabel,
  type HabitFrequency,
} from "@/lib/habitFrequency";
import {
  invalidateAthleteDashboardItems,
  useAthleteDashboardItems,
} from "@/hooks/useAthleteDashboardItems";

type AthleteTodosHabitsWidgetProps = {
  athleteId: string;
  homePreview?: boolean;
};

type AddMode = "todo" | "habit" | null;

function ItemRow({
  item,
  onToggle,
  onDelete,
  onEditHabit,
  isEditing,
  editFrequency,
  onEditFrequencyChange,
  onSaveEdit,
  onCancelEdit,
  savingEdit,
  canDelete,
}: {
  item: AthleteDashboardItem;
  onToggle: (item: AthleteDashboardItem) => void;
  onDelete: (itemId: string) => void;
  onEditHabit?: (item: AthleteDashboardItem) => void;
  isEditing?: boolean;
  editFrequency?: HabitFrequency;
  onEditFrequencyChange?: (frequency: HabitFrequency) => void;
  onSaveEdit?: () => void;
  onCancelEdit?: () => void;
  savingEdit?: boolean;
  canDelete: boolean;
}) {
  const isHabit = item.item_type === "habit";
  const frequencyLabel = isHabit
    ? getHabitFrequencyLabel(item.habit_frequency)
    : "";
  const metaParts = [
    item.created_by === "coach" ? "Coach" : null,
    frequencyLabel || null,
  ].filter(Boolean);

  return (
    <li className="athlete-dashboard-item-row">
      <button
        type="button"
        onClick={() => onToggle(item)}
        className={`athlete-dashboard-item-check app-focus-ring${
          item.completed ? " athlete-dashboard-item-check--done" : ""
        }`}
        aria-label={item.completed ? "Als niet gedaan markeren" : "Als gedaan markeren"}
      >
        {item.completed ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[13px] font-medium leading-tight ${
            item.completed ? "text-app-muted line-through" : "text-app-text"
          }`}
        >
          {item.title}
        </p>
        {metaParts.length > 0 ? (
          <p className="mt-0.5 truncate text-[10px] text-app-subtle">
            {metaParts.join(" · ")}
          </p>
        ) : null}
        {isHabit && isEditing && onEditFrequencyChange ? (
          <div className="mt-2 flex items-center gap-1.5">
            <select
              value={editFrequency ?? "daily"}
              onChange={(event) =>
                onEditFrequencyChange(event.target.value as HabitFrequency)
              }
              className="athlete-dashboard-habit-frequency athlete-dashboard-habit-frequency--full min-h-[36px] flex-1 app-focus-ring"
              aria-label="Herhaling kiezen"
            >
              {HABIT_FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={savingEdit}
              className="athlete-dashboard-item-edit-action athlete-dashboard-item-edit-action--save app-focus-ring"
              aria-label="Herhaling opslaan"
            >
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={savingEdit}
              className="athlete-dashboard-item-edit-action app-focus-ring"
              aria-label="Annuleren"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>
      {isHabit && canDelete && onEditHabit && !isEditing ? (
        <button
          type="button"
          onClick={() => onEditHabit(item)}
          className="athlete-dashboard-item-edit app-focus-ring"
          aria-label="Herhaling aanpassen"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="athlete-dashboard-item-delete app-focus-ring"
          aria-label="Verwijderen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </li>
  );
}

export default function AthleteTodosHabitsWidget({
  athleteId,
  homePreview = false,
}: AthleteTodosHabitsWidgetProps) {
  const queryClient = useQueryClient();
  const { data: items = [], isPending } = useAthleteDashboardItems(
    athleteId,
    Boolean(athleteId),
  );
  const [addMode, setAddMode] = useState<AddMode>(null);
  const [draft, setDraft] = useState("");
  const [habitFrequency, setHabitFrequency] = useState<HabitFrequency>("daily");
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);
  const [editFrequency, setEditFrequency] = useState<HabitFrequency>("daily");
  const [saving, setSaving] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sortedItems = useMemo(() => {
    const openTodos: AthleteDashboardItem[] = [];
    const openHabits: AthleteDashboardItem[] = [];
    const doneItems: AthleteDashboardItem[] = [];

    for (const item of items) {
      if (item.completed) {
        doneItems.push(item);
        continue;
      }
      if (item.item_type === "habit") openHabits.push(item);
      else openTodos.push(item);
    }

    return [...openTodos, ...openHabits, ...doneItems];
  }, [items]);

  const showSkeleton = isPending && items.length === 0;

  const previewItems = useMemo(() => {
    if (!homePreview) return sortedItems;
    return sortedItems.filter((item) => !item.completed).slice(0, 2);
  }, [homePreview, sortedItems]);

  async function refresh() {
    await invalidateAthleteDashboardItems(queryClient, athleteId);
  }

  async function handleToggle(item: AthleteDashboardItem) {
    setError(null);
    const { error: toggleError } = await toggleAthleteDashboardItem(item);
    if (toggleError) {
      setError(toggleError.message);
      return;
    }
    await refresh();
  }

  async function handleDelete(itemId: string) {
    setError(null);
    const { error: deleteError } = await deleteAthleteDashboardItem(itemId);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    await refresh();
  }

  async function handleFrequencyChange(itemId: string, frequency: HabitFrequency) {
    setError(null);
    const { error: updateError } = await updateAthleteDashboardItemHabitFrequency(
      itemId,
      frequency,
    );
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    await refresh();
    return true;
  }

  function startEditHabit(item: AthleteDashboardItem) {
    setAddMode(null);
    setDraft("");
    setEditingHabitId(item.id);
    setEditFrequency(item.habit_frequency ?? "daily");
    setError(null);
  }

  function cancelEditHabit() {
    setEditingHabitId(null);
    setEditFrequency("daily");
  }

  async function saveEditHabit() {
    if (!editingHabitId) return;
    setSavingEdit(true);
    setError(null);
    const ok = await handleFrequencyChange(editingHabitId, editFrequency);
    setSavingEdit(false);
    if (ok) cancelEditHabit();
  }

  async function handleAdd() {
    if (!addMode) return;
    setSaving(true);
    setError(null);

    const { error: createError } = await createAthleteDashboardItem({
      athleteId,
      title: draft,
      itemType: addMode,
      createdBy: "atleet",
      habitFrequency: addMode === "habit" ? habitFrequency : null,
    });

    setSaving(false);

    if (createError) {
      setError(createError.message);
      return;
    }

    setDraft("");
    setAddMode(null);
    setHabitFrequency("daily");
    await refresh();
  }

  if (showSkeleton) {
    return (
      <div className="athlete-dashboard-card athlete-dashboard-todos-widget animate-pulse max-lg:flex-1 max-lg:min-h-0">
        <Skeleton className="h-3 w-24" />
        <div className="mt-2 space-y-1.5">
          <Skeleton className="h-8 w-full rounded-lg" />
          <Skeleton className="h-8 w-full rounded-lg" />
        </div>
      </div>
    );
  }

  const hasItems = items.length > 0;

  return (
    <section
      className={`athlete-dashboard-card athlete-dashboard-todos-widget max-lg:flex max-lg:min-h-0 max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden${
        homePreview ? " athlete-dashboard-todos-widget--home-preview" : ""
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={homePreview ? "athlete-dashboard-stat-title" : "athlete-dashboard-eyebrow"}>
            {homePreview ? "Habits en todo vandaag" : "Taken & habits"}
          </p>
        </div>
        {homePreview ? (
          <Link href="/todo" className="athlete-dashboard-todos-view-all app-focus-ring">
            Bekijk alles
          </Link>
        ) : (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setAddMode((mode) => (mode === "todo" ? null : "todo"));
                setDraft("");
                setEditingHabitId(null);
                setError(null);
              }}
              className="athlete-dashboard-todos-add-btn app-focus-ring"
            >
              <Plus className="h-3 w-3" />
              Todo
            </button>
            <button
              type="button"
              onClick={() => {
                setAddMode((mode) => (mode === "habit" ? null : "habit"));
                setDraft("");
                setEditingHabitId(null);
                setError(null);
              }}
              className="athlete-dashboard-todos-add-btn app-focus-ring"
            >
              <Plus className="h-3 w-3" />
              Habit
            </button>
          </div>
        )}
      </div>

      {!homePreview && addMode ? (
        <form
          className="mt-2 flex shrink-0 flex-col gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAdd();
          }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={
                addMode === "habit"
                  ? "Nieuwe habit, bijv. 2L water"
                  : "Nieuwe todo, bijv. Video uploaden"
              }
              className="athlete-dashboard-input min-h-[40px] min-w-0 flex-1 text-sm"
              autoFocus
              maxLength={120}
            />
            <button
              type="submit"
              disabled={saving || !draft.trim()}
              className="athlete-dashboard-log-btn min-h-[40px] shrink-0 px-3 text-xs disabled:opacity-50"
            >
              {saving ? "…" : "Voeg toe"}
            </button>
          </div>
          {addMode === "habit" ? (
            <select
              value={habitFrequency}
              onChange={(event) =>
                setHabitFrequency(event.target.value as HabitFrequency)
              }
              className="athlete-dashboard-habit-frequency athlete-dashboard-habit-frequency--full app-focus-ring"
              aria-label="Herhaling"
            >
              {HABIT_FREQUENCY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}
        </form>
      ) : null}

      {error ? (
        <p className="mt-1.5 shrink-0 text-[11px] text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      <div
        className={`athlete-dashboard-todos-scroll mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain${
          homePreview ? " athlete-dashboard-todos-scroll--home-preview" : ""
        }`}
      >
        {!hasItems ? (
          <p className="athlete-dashboard-todos-empty">
            {homePreview
              ? "Geen open taken voor vandaag."
              : "Nog geen taken. Voeg er zelf een toe, of wacht op taken van je coach."}
          </p>
        ) : previewItems.length === 0 ? (
          <p className="athlete-dashboard-todos-empty">Alles afgevinkt voor vandaag.</p>
        ) : (
          <ul className="athlete-dashboard-todos-list">
            {previewItems.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onEditHabit={homePreview ? undefined : startEditHabit}
                isEditing={!homePreview && editingHabitId === item.id}
                editFrequency={editFrequency}
                onEditFrequencyChange={setEditFrequency}
                onSaveEdit={() => void saveEditHabit()}
                onCancelEdit={cancelEditHabit}
                savingEdit={savingEdit}
                canDelete={!homePreview && item.created_by === "atleet"}
              />
            ))}
          </ul>
        )}
      </div>

    </section>
  );
}
