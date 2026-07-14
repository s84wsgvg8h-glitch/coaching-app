import type { ProgramExercise } from "@/lib/programWeek/types";

export function isPendingExerciseId(exerciseId: string) {
  return exerciseId.startsWith("pending-");
}

export function stripPendingExercises(
  current: Record<string, ProgramExercise[]>,
): Record<string, ProgramExercise[]> {
  const next: Record<string, ProgramExercise[]> = {};

  for (const [dayId, list] of Object.entries(current)) {
    next[dayId] = (list || []).filter(
      (exercise) => !isPendingExerciseId(exercise.id),
    );
  }

  return next;
}

/** Prefer non-empty pending optimistic fields when swapping temp id for server row. */
export function mergePendingExerciseFields(
  pending: ProgramExercise,
  real: ProgramExercise,
): ProgramExercise {
  const pickText = (
    field: "sets" | "reps" | "notes" | "load" | "rpe" | "priority",
  ) => {
    const pendingVal = String(pending[field] ?? "").trim();
    if (pendingVal) return pendingVal;
    return String(real[field] ?? "").trim();
  };

  const pendingName = String(pending.name ?? "").trim();

  return {
    ...real,
    name: pendingName || real.name,
    sets: pickText("sets"),
    reps: pickText("reps"),
    notes: pickText("notes"),
    load: pickText("load"),
    rpe: pickText("rpe"),
    priority: pickText("priority") || real.priority || "",
  };
}

export function diffExerciseFieldUpdates(
  base: ProgramExercise,
  merged: ProgramExercise,
): Partial<
  Pick<
    ProgramExercise,
    "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
  >
> {
  const fields: Array<
    keyof Pick<
      ProgramExercise,
      "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
    >
  > = ["name", "sets", "reps", "load", "rpe", "notes", "priority"];

  const updates: Partial<
    Pick<
      ProgramExercise,
      "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
    >
  > = {};

  for (const field of fields) {
    const baseVal = String(base[field] ?? "").trim();
    const mergedVal = String(merged[field] ?? "").trim();
    if (baseVal !== mergedVal) {
      updates[field] = mergedVal;
    }
  }

  return updates;
}
