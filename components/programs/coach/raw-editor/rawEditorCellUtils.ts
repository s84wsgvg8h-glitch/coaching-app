import { SHOW_EXERCISE_PRIORITY_UI } from "@/lib/programWeek/editorFlags";
import type { RawColKey } from "@/lib/programWeek/rawClipboard";

export const MIN_VISIBLE_ROWS = 12;

export const ALL_COL_KEYS = [
  "name",
  "sets",
  "reps",
  "intensity",
  "load",
  "priority",
  "notes",
] as const;

export type ColKey = RawColKey;

export type CellRef = {
  dayId: string;
  rowIndex: number;
  colKey: ColKey;
};

export function getVisibleColKeys(): ColKey[] {
  return SHOW_EXERCISE_PRIORITY_UI
    ? [...ALL_COL_KEYS]
    : ALL_COL_KEYS.filter((key) => key !== "priority");
}

export function isRawEditorActiveContext(
  editorEl: HTMLElement | null,
  selectedCell: CellRef | null,
) {
  if (!editorEl) return false;

  const active = document.activeElement;
  if (active instanceof Node && editorEl.contains(active)) return true;

  if (!selectedCell) return false;

  if (
    active === document.body ||
    active === document.documentElement ||
    active === null
  ) {
    return true;
  }

  return false;
}

export function getRawSbdCellClass(exerciseName: string | null | undefined): string {
  const clean = (exerciseName || "").toLowerCase();
  if (clean.includes("squat")) return "is-sbd-squat";
  if (
    clean.includes("benchpress") ||
    clean.includes("bench press") ||
    clean.includes("bench")
  ) {
    return "is-sbd-bench";
  }
  if (clean.includes("deadlift")) return "is-sbd-deadlift";
  return "";
}

export const COL_LABELS: Record<ColKey, string> = {
  name: "Oefening",
  sets: "Sets",
  reps: "Reps",
  intensity: "Int.",
  load: "Load",
  priority: "Priority",
  notes: "Notes",
};
