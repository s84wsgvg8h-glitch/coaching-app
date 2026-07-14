import type { ProgramExercise } from "@/lib/programWeek/types";

function sortByNumber(list: ProgramExercise[]) {
  return [...list].sort(
    (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
  );
}

/** Merge freshly fetched server exercises with local optimistic state. */
export function mergeServerExercisesWithLocal(
  current: Record<string, ProgramExercise[]>,
  server: Record<string, ProgramExercise[]>,
  fieldOverrides: Map<string, Partial<ProgramExercise>>,
): Record<string, ProgramExercise[]> {
  const merged: Record<string, ProgramExercise[]> = {};
  const dayIds = new Set([...Object.keys(current), ...Object.keys(server)]);

  for (const dayId of dayIds) {
    const serverList = sortByNumber(server[dayId] || []);
    const currentList = sortByNumber(current[dayId] || []);
    const byId = new Map(serverList.map((exercise) => [exercise.id, { ...exercise }]));

    for (const exercise of currentList) {
      if (!exercise.id.startsWith("pending-")) continue;
      if (!byId.has(exercise.id)) {
        byId.set(exercise.id, { ...exercise });
      }
    }

    for (const [exerciseId, patch] of fieldOverrides) {
      const existing = byId.get(exerciseId);
      if (!existing) continue;
      byId.set(exerciseId, { ...existing, ...patch });
    }

    merged[dayId] = sortByNumber([...byId.values()]);
  }

  return merged;
}

export function applyExerciseFieldOverride(
  overrides: Map<string, Partial<ProgramExercise>>,
  exerciseId: string,
  field: keyof ProgramExercise,
  value: string,
) {
  const prev = overrides.get(exerciseId) || {};
  overrides.set(exerciseId, { ...prev, [field]: value });
}

export function pruneExerciseFieldOverrides(
  overrides: Map<string, Partial<ProgramExercise>>,
  server: Record<string, ProgramExercise[]>,
) {
  for (const [exerciseId, patch] of overrides) {
    const serverExercise = Object.values(server)
      .flat()
      .find((exercise) => exercise.id === exerciseId);
    if (!serverExercise) continue;

    const nextPatch = { ...patch };
    let allMatch = true;

    for (const [field, expected] of Object.entries(patch)) {
      const serverValue = serverExercise[field as keyof ProgramExercise];
      const normalizedServer =
        serverValue == null ? "" : String(serverValue);
      const normalizedExpected =
        expected == null ? "" : String(expected);

      if (normalizedServer === normalizedExpected) {
        delete nextPatch[field as keyof ProgramExercise];
      } else {
        allMatch = false;
      }
    }

    if (Object.keys(nextPatch).length === 0) {
      overrides.delete(exerciseId);
    } else if (!allMatch) {
      overrides.set(exerciseId, nextPatch);
    }
  }
}
