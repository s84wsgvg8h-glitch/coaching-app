import { getApiAuthHeaders } from "@/lib/apiClient";
import { parseWeekdayFromDayTitle } from "@/lib/programWeek/weekdayFromTitle";

export const APPLY_ALL_WEEKS_MS = 10 * 60 * 1000;
export const APPLY_ALL_WEEKS_STORAGE_KEY = "coach-apply-all-weeks-v1";
export const APPLY_ALL_WEEKS_EVENT = "coach-apply-all-weeks-change";
export const PROGRAM_BLOCK_EXERCISES_UPDATED_EVENT =
  "coach-program-block-exercises-updated";

type StoredApplyAllWeeks = {
  blockId: string;
  until: number;
};

export type DaySlot = {
  id: string;
  title: string | null;
  day_number: number | null;
  program_week_id: string;
};

export type ExerciseSlot = {
  id: string;
  name?: string | null;
  program_day_id: string;
  exercise_number: number | null;
};

function normalizeExerciseMatchName(name: string | null | undefined) {
  return (name || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function daySlotKey(day: {
  title?: string | null;
  day_number?: number | null;
}) {
  const weekday = parseWeekdayFromDayTitle(day.title);
  if (weekday !== null) return `weekday:${weekday}`;
  return `number:${day.day_number ?? 0}`;
}

function sortExercises(list: ExerciseSlot[]) {
  return [...list].sort(
    (left, right) =>
      (left.exercise_number ?? Number.MAX_SAFE_INTEGER) -
        (right.exercise_number ?? Number.MAX_SAFE_INTEGER) ||
      left.id.localeCompare(right.id),
  );
}

function occurrenceIndex(list: ExerciseSlot[], exerciseId: string) {
  const source = list.find((exercise) => exercise.id === exerciseId);
  if (!source) return -1;
  const name = normalizeExerciseMatchName(source.name);
  let index = 0;
  for (const exercise of list) {
    if (exercise.id === exerciseId) return index;
    if (normalizeExerciseMatchName(exercise.name) === name) index += 1;
  }
  return -1;
}

function matchSiblingExercise(
  sourceList: ExerciseSlot[],
  source: ExerciseSlot,
  sourceIndex: number,
  targetList: ExerciseSlot[],
) {
  if (source.exercise_number != null) {
    const sameNumber = targetList.filter(
      (exercise) => exercise.exercise_number === source.exercise_number,
    );
    if (sameNumber.length === 1) return sameNumber[0];
  }

  const name = normalizeExerciseMatchName(source.name);
  if (name) {
    const sameName = targetList.filter(
      (exercise) => normalizeExerciseMatchName(exercise.name) === name,
    );
    const namedIndex = occurrenceIndex(sourceList, source.id);
    if (namedIndex >= 0 && sameName[namedIndex]) return sameName[namedIndex];
    if (sameName.length === 1) return sameName[0];
  }

  return sourceIndex >= 0 ? targetList[sourceIndex] : undefined;
}

/** @deprecated Use findSiblingExerciseIds */
export function siblingExerciseIds(input: {
  sourceExerciseId: string;
  sourceDayId: string;
  days: DaySlot[];
  exercises: ExerciseSlot[];
}) {
  return findSiblingExerciseIds(input);
}

export function findSiblingExerciseIds(input: {
  sourceExerciseId: string;
  sourceDayId: string;
  days: DaySlot[];
  exercises: ExerciseSlot[];
}) {
  const sourceDay = input.days.find((day) => day.id === input.sourceDayId);
  if (!sourceDay) return [];

  const slot = daySlotKey(sourceDay);
  const dayIds = new Set(
    input.days.filter((day) => daySlotKey(day) === slot).map((day) => day.id),
  );

  const byDay = new Map<string, ExerciseSlot[]>();
  for (const exercise of input.exercises) {
    if (!dayIds.has(exercise.program_day_id)) continue;
    const list = byDay.get(exercise.program_day_id) || [];
    list.push(exercise);
    byDay.set(exercise.program_day_id, list);
  }

  for (const [dayId, list] of byDay) {
    byDay.set(dayId, sortExercises(list));
  }

  const sourceList = byDay.get(input.sourceDayId) || [];
  const sourceIndex = sourceList.findIndex(
    (exercise) => exercise.id === input.sourceExerciseId,
  );
  const source = sourceList[sourceIndex];
  if (!source) return [];

  const ids: string[] = [];
  for (const [dayId, list] of byDay) {
    if (dayId === input.sourceDayId) continue;
    const match = matchSiblingExercise(sourceList, source, sourceIndex, list);
    if (match && match.id !== input.sourceExerciseId) ids.push(match.id);
  }

  return ids;
}

export function readApplyAllWeeks(blockId: string) {
  if (typeof window === "undefined" || !blockId) {
    return { active: false, until: null as number | null };
  }

  try {
    const raw = window.sessionStorage.getItem(APPLY_ALL_WEEKS_STORAGE_KEY);
    if (!raw) return { active: false, until: null as number | null };
    const parsed = JSON.parse(raw) as StoredApplyAllWeeks;
    if (
      parsed.blockId !== blockId ||
      !Number.isFinite(parsed.until) ||
      parsed.until <= Date.now()
    ) {
      if (parsed.blockId === blockId) {
        window.sessionStorage.removeItem(APPLY_ALL_WEEKS_STORAGE_KEY);
      }
      return { active: false, until: null as number | null };
    }
    return { active: true, until: parsed.until };
  } catch {
    return { active: false, until: null as number | null };
  }
}

export function isApplyAllWeeksActive(blockId: string) {
  return readApplyAllWeeks(blockId).active;
}

export function setApplyAllWeeks(blockId: string, enabled: boolean) {
  if (typeof window === "undefined" || !blockId) return;

  if (!enabled) {
    window.sessionStorage.removeItem(APPLY_ALL_WEEKS_STORAGE_KEY);
  } else {
    const until = Date.now() + APPLY_ALL_WEEKS_MS;
    const stored: StoredApplyAllWeeks = { blockId, until };
    window.sessionStorage.setItem(
      APPLY_ALL_WEEKS_STORAGE_KEY,
      JSON.stringify(stored),
    );
  }

  window.dispatchEvent(new CustomEvent(APPLY_ALL_WEEKS_EVENT));
}

export async function applyExercisePatchAcrossBlock(input: {
  blockId: string;
  exerciseId: string;
  patch: Record<string, string | number | null>;
}) {
  const patch = Object.fromEntries(
    Object.entries(input.patch).filter(([, value]) => value !== undefined),
  );
  if (!input.blockId || !input.exerciseId || Object.keys(patch).length === 0) {
    return 0;
  }

  if (!isApplyAllWeeksActive(input.blockId)) {
    return 0;
  }

  const response = await fetch("/api/programs/apply-exercise-across-block", {
    method: "POST",
    headers: await getApiAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify({
      blockId: input.blockId,
      exerciseId: input.exerciseId,
      patch,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    updated?: number;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error || "Andere weken konden niet worden bijgewerkt.");
  }

  const updated = Number(payload?.updated || 0);

  if (updated > 0 && typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PROGRAM_BLOCK_EXERCISES_UPDATED_EVENT, {
        detail: { blockId: input.blockId, updated },
      }),
    );
  }

  return updated;
}
