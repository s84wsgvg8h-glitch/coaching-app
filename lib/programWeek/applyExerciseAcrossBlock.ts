import { supabase } from "@/lib/supabaseClient";
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

type DaySlot = {
  id: string;
  title: string | null;
  day_number: number | null;
  program_week_id: string;
};

type ExerciseSlot = {
  id: string;
  program_day_id: string;
  exercise_number: number | null;
};

export function daySlotKey(day: {
  title?: string | null;
  day_number?: number | null;
}) {
  const weekday = parseWeekdayFromDayTitle(day.title);
  if (weekday !== null) return `weekday:${weekday}`;
  return `number:${day.day_number ?? 0}`;
}

export function siblingExerciseIds(input: {
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

  for (const list of byDay.values()) {
    list.sort(
      (left, right) =>
        (left.exercise_number ?? Number.MAX_SAFE_INTEGER) -
          (right.exercise_number ?? Number.MAX_SAFE_INTEGER) ||
        left.id.localeCompare(right.id),
    );
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
    const byNumber =
      source.exercise_number != null
        ? list.find(
            (exercise) => exercise.exercise_number === source.exercise_number,
          )
        : undefined;
    const match = byNumber || (sourceIndex >= 0 ? list[sourceIndex] : undefined);
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

  const { data: exercise, error: exerciseError } = await supabase
    .from("program_exercises")
    .select("id, program_day_id, exercise_number")
    .eq("id", input.exerciseId)
    .maybeSingle();

  if (exerciseError) throw exerciseError;
  if (!exercise?.program_day_id) return 0;

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", input.blockId);

  if (weeksError) throw weeksError;
  const weekIds = (weeks || []).map((week) => week.id);
  if (weekIds.length === 0) return 0;

  const { data: days, error: daysError } = await supabase
    .from("program_days")
    .select("id, title, day_number, program_week_id")
    .in("program_week_id", weekIds);

  if (daysError) throw daysError;

  const dayRows = (days || []) as DaySlot[];
  const dayIds = dayRows.map((day) => day.id);
  if (dayIds.length === 0) return 0;

  const { data: exercises, error: exercisesError } = await supabase
    .from("program_exercises")
    .select("id, program_day_id, exercise_number")
    .in("program_day_id", dayIds);

  if (exercisesError) throw exercisesError;

  const ids = siblingExerciseIds({
    sourceExerciseId: exercise.id,
    sourceDayId: exercise.program_day_id,
    days: dayRows,
    exercises: (exercises || []) as ExerciseSlot[],
  });

  if (ids.length === 0) return 0;

  const { error: updateError } = await supabase
    .from("program_exercises")
    .update(patch)
    .in("id", ids);

  if (updateError) throw updateError;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(PROGRAM_BLOCK_EXERCISES_UPDATED_EVENT, {
        detail: { blockId: input.blockId },
      }),
    );
  }

  return ids.length;
}
