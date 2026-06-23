import type { ProgramExercise } from "@/lib/programWeek/types";

export type ExerciseFormat = "normal" | "amrap" | "superset";

export function normalizeExerciseFormat(value: string | null | undefined): ExerciseFormat {
  if (value === "amrap" || value === "superset") return value;
  return "normal";
}

export function formatExerciseFormatLabel(format: ExerciseFormat) {
  if (format === "amrap") return "AMRAP";
  if (format === "superset") return "Superset";
  return "";
}

export function getExerciseRestSeconds(exercise: Pick<ProgramExercise, "rest_seconds">) {
  const value = exercise.rest_seconds;
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
}

export function groupExercisesBySuperset<T extends Pick<ProgramExercise, "id" | "superset_group">>(
  exercises: T[],
) {
  const groups: Array<{ key: string; exercises: T[] }> = [];
  let currentKey = "";
  let current: T[] = [];

  for (const exercise of exercises) {
    const group = exercise.superset_group?.trim() || "";
    if (group && group === currentKey) {
      current.push(exercise);
      continue;
    }

    if (current.length > 0) {
      groups.push({ key: currentKey, exercises: current });
    }

    currentKey = group;
    current = [exercise];
  }

  if (current.length > 0) {
    groups.push({ key: currentKey, exercises: current });
  }

  return groups;
}
