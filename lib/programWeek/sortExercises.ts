import type { ProgramExercise } from "@/lib/programWeek/types";

export function sortExercisesForDay(exercises: ProgramExercise[]) {
  return [...exercises].sort(
    (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
  );
}
