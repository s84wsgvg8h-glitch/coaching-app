import { normalizeExerciseName } from "@/lib/programWeek/exerciseUtils";
import {
  applyIntensityInput,
  applyLoadKgInput,
} from "@/lib/programWeek/intensityInput";
import {
  buildRawSeedFromRowValues,
  type RawColKey,
} from "@/lib/programWeek/rawClipboard";
import { mergePendingExerciseFields } from "@/lib/programWeek/pendingExercise";
import type { ProgramExercise } from "@/lib/programWeek/types";

export type RawPasteTarget = {
  dayId: string;
  rowIndex: number;
  rowValues: Partial<Record<RawColKey, string>>;
};

export type RawPastePersistOp =
  | {
      type: "update";
      exerciseId: string;
      fields: Partial<
        Pick<
          ProgramExercise,
          "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
        >
      >;
    }
  | {
      type: "insert";
      dayId: string;
      afterIndex: number;
      tempId: string;
      seed: Partial<
        Pick<
          ProgramExercise,
          "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
        >
      >;
    };

function sortExerciseList(list: ProgramExercise[]) {
  return [...list].sort(
    (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
  );
}

function rowValuesHaveContent(
  rowValues: Partial<Record<RawColKey, string>>,
) {
  return Object.values(rowValues).some(
    (value) => value !== undefined && value !== "",
  );
}

function rowValuesHasDefinedFields(
  rowValues: Partial<Record<RawColKey, string>>,
) {
  return Object.keys(rowValues).length > 0;
}

function applyRowValuesToExercise(
  exercise: ProgramExercise,
  rowValues: Partial<Record<RawColKey, string>>,
): ProgramExercise {
  const next = { ...exercise };

  if (rowValues.name !== undefined) {
    next.name = normalizeExerciseName(rowValues.name);
  }
  if (rowValues.sets !== undefined) {
    next.sets = rowValues.sets;
  }
  if (rowValues.reps !== undefined) {
    next.reps = rowValues.reps;
  }
  if (rowValues.notes !== undefined) {
    next.notes = rowValues.notes;
  }
  if (rowValues.priority !== undefined) {
    next.priority = rowValues.priority.toLowerCase();
  }
  if (rowValues.intensity !== undefined) {
    const updates = applyIntensityInput(exercise, rowValues.intensity);
    next.rpe = updates.rpe || "";
    next.load = updates.load || "";
  }
  if (rowValues.load !== undefined) {
    const updates = applyLoadKgInput(exercise, rowValues.load);
    next.rpe = updates.rpe || "";
    next.load = updates.load || "";
  }

  return next;
}

function exerciseFieldsFromRowValues(
  rowValues: Partial<Record<RawColKey, string>>,
) {
  const fields: Partial<
    Pick<
      ProgramExercise,
      "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
    >
  > = {};

  if (rowValues.name !== undefined) {
    fields.name = normalizeExerciseName(rowValues.name);
  }
  if (rowValues.sets !== undefined) {
    fields.sets = rowValues.sets;
  }
  if (rowValues.reps !== undefined) {
    fields.reps = rowValues.reps;
  }
  if (rowValues.notes !== undefined) {
    fields.notes = rowValues.notes;
  }
  if (rowValues.priority !== undefined) {
    fields.priority = rowValues.priority.toLowerCase();
  }
  if (rowValues.intensity !== undefined) {
    const parsed = applyIntensityInput({ load: "", rpe: "" }, rowValues.intensity);
    fields.rpe = parsed.rpe || "";
    fields.load = parsed.load || "";
  }
  if (rowValues.load !== undefined) {
    const parsed = applyLoadKgInput({ load: "", rpe: "" }, rowValues.load);
    fields.rpe = parsed.rpe || "";
    fields.load = parsed.load || "";
  }

  return fields;
}

function insertExerciseAt(
  list: ProgramExercise[],
  dayId: string,
  insertAt: number,
  rowValues: Partial<Record<RawColKey, string>>,
  ops: RawPastePersistOp[],
) {
  const seed = buildRawSeedFromRowValues(rowValues);
  const tempId = `pending-${crypto.randomUUID()}`;
  const clampedInsertAt = Math.min(Math.max(insertAt, 0), list.length);
  const name =
    seed.name === undefined
      ? "Nieuwe oefening"
      : normalizeExerciseName(seed.name);

  const newExercise: ProgramExercise = {
    id: tempId,
    program_day_id: dayId,
    name,
    sets: (seed.sets ?? "").trim(),
    reps: (seed.reps ?? "").trim(),
    load: seed.load ?? "",
    rpe: seed.rpe ?? "",
    notes: (seed.notes ?? "").trim(),
    exercise_number: clampedInsertAt + 1,
    priority: seed.priority ?? "",
  };

  const next = [...list];
  next.splice(clampedInsertAt, 0, newExercise);
  const renumbered = next.map((exercise, index) => ({
    ...exercise,
    exercise_number: index + 1,
  }));

  ops.push({
    type: "insert",
    dayId,
    afterIndex: clampedInsertAt - 1,
    tempId,
    seed,
  });

  return renumbered;
}

function applyInsertTargets(
  list: ProgramExercise[],
  dayId: string,
  initialListLength: number,
  insertTargets: RawPasteTarget[],
  ops: RawPastePersistOp[],
) {
  const embedding = insertTargets.filter(
    (target) => target.rowIndex < initialListLength,
  );
  const appending = insertTargets.filter(
    (target) => target.rowIndex >= initialListLength,
  );

  // Insert into the middle bottom-up so row indices stay stable.
  for (const target of [...embedding].sort(
    (a, b) => b.rowIndex - a.rowIndex,
  )) {
    list = insertExerciseAt(
      list,
      dayId,
      target.rowIndex,
      target.rowValues,
      ops,
    );
  }

  // Append new rows top-down; bottom-up breaks when list.length < target row.
  for (const target of [...appending].sort(
    (a, b) => a.rowIndex - b.rowIndex,
  )) {
    list = insertExerciseAt(list, dayId, list.length, target.rowValues, ops);
  }

  return list;
}

export function buildRawPasteApplication(
  current: Record<string, ProgramExercise[]>,
  targets: RawPasteTarget[],
): {
  next: Record<string, ProgramExercise[]>;
  ops: RawPastePersistOp[];
} {
  const next: Record<string, ProgramExercise[]> = { ...current };
  const ops: RawPastePersistOp[] = [];
  const byDay = new Map<string, RawPasteTarget[]>();

  for (const target of targets) {
    if (!rowValuesHasDefinedFields(target.rowValues)) continue;
    const dayTargets = byDay.get(target.dayId) || [];
    dayTargets.push(target);
    byDay.set(target.dayId, dayTargets);
  }

  for (const [dayId, dayTargets] of byDay) {
    const initialList = sortExerciseList(next[dayId] || []);
    let list = [...initialList];
    const orderedTargets = [...dayTargets].sort(
      (a, b) => a.rowIndex - b.rowIndex,
    );

    // Updates use the initial row snapshot so later inserts don't shift targets.
    for (const target of orderedTargets) {
      const existing = initialList[target.rowIndex];
      if (!existing) continue;

      const fields = exerciseFieldsFromRowValues(target.rowValues);
      if (Object.keys(fields).length === 0) continue;

      list = list.map((exercise) =>
        exercise.id === existing.id
          ? applyRowValuesToExercise(exercise, target.rowValues)
          : exercise,
      );
      ops.push({
        type: "update",
        exerciseId: existing.id,
        fields,
      });
    }

    const insertTargets = orderedTargets.filter(
      (target) =>
        !initialList[target.rowIndex] &&
        rowValuesHaveContent(target.rowValues),
    );
    list = applyInsertTargets(
      list,
      dayId,
      initialList.length,
      insertTargets,
      ops,
    );

    next[dayId] = list;
  }

  return { next, ops };
}

export function replacePendingExerciseId(
  current: Record<string, ProgramExercise[]>,
  tempId: string,
  realExercise: ProgramExercise,
) {
  const next: Record<string, ProgramExercise[]> = { ...current };

  for (const dayId of Object.keys(next)) {
    next[dayId] = (next[dayId] || []).map((exercise) => {
      if (exercise.id !== tempId) return exercise;
      return mergePendingExerciseFields(exercise, realExercise);
    });
  }

  return next;
}
