import type { ProgramExercise } from "@/lib/programWeek/types";

export const EXERCISE_DROP_EMPTY_DAY = "__day_empty__";

export type ExerciseDropIndicator = {
  dayId: string;
  targetId: string;
  position: "before" | "after";
};

export function insertExerciseAtIndicator(
  exercises: ProgramExercise[],
  exercise: ProgramExercise,
  indicator: { targetId: string; position: "before" | "after" },
): ProgramExercise[] {
  const withoutDragged = exercises.filter((item) => item.id !== exercise.id);

  if (
    indicator.targetId === EXERCISE_DROP_EMPTY_DAY ||
    indicator.targetId === "__day_end__"
  ) {
    return [...withoutDragged, exercise];
  }

  const targetIndex = withoutDragged.findIndex(
    (item) => item.id === indicator.targetId,
  );

  if (targetIndex === -1) {
    return [...withoutDragged, exercise];
  }

  const insertIndex =
    indicator.position === "after" ? targetIndex + 1 : targetIndex;
  const next = [...withoutDragged];
  next.splice(insertIndex, 0, exercise);
  return next;
}

export function applyExerciseMovePreview(
  current: Record<string, ProgramExercise[]>,
  dragged: { dayId: string; exerciseId: string },
  indicator: ExerciseDropIndicator,
  draggedExerciseObj: ProgramExercise,
): Record<string, ProgramExercise[]> {
  const sourceDayId = dragged.dayId;
  const targetDayId = indicator.dayId;
  const next: Record<string, ProgramExercise[]> = {};

  for (const [dayId, exercises] of Object.entries(current)) {
    next[dayId] = exercises.filter((item) => item.id !== dragged.exerciseId);
  }

  if (next[sourceDayId]) {
    next[sourceDayId] = next[sourceDayId].map((item, index) => ({
      ...item,
      exercise_number: index + 1,
    }));
  }

  const movedExercise = {
    ...draggedExerciseObj,
    program_day_id: targetDayId,
  };
  const targetList = insertExerciseAtIndicator(
    next[targetDayId] || [],
    movedExercise,
    indicator,
  );

  next[targetDayId] = targetList.map((item, index) => ({
    ...item,
    exercise_number: index + 1,
  }));

  return next;
}

export function reorderExercisesList(
  sourceExercises: ProgramExercise[],
  draggedId: string,
  indicator: { targetId: string; position: "before" | "after" },
): ProgramExercise[] {
  const draggedExerciseObj = sourceExercises.find(
    (exercise) => exercise.id === draggedId,
  );

  if (!draggedExerciseObj) return sourceExercises;

  return insertExerciseAtIndicator(
    sourceExercises,
    draggedExerciseObj,
    indicator,
  ).map((exercise, index) => ({
    ...exercise,
    exercise_number: index + 1,
  }));
}
