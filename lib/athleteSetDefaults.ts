type ExerciseLike = {
  name: string;
  reps: string | null;
  rpe: string | null;
  load?: string | null;
};

type SetRowLike = {
  reps?: string | null;
  rpe?: string | null;
};

export function isSbdExercise(name: string) {
  const clean = name.toLowerCase();
  return (
    clean.includes("squat") ||
    clean.includes("bench") ||
    clean.includes("deadlift")
  );
}

export function getCoachRepsDefault(exercise: ExerciseLike) {
  if (!isSbdExercise(exercise.name)) return "";
  return exercise.reps?.trim() || "";
}

export function getCoachRpeDefault(exercise: ExerciseLike) {
  if (isSbdExercise(exercise.name)) return "";

  const programmedRpe = exercise.rpe?.trim();
  if (!programmedRpe) return "";

  const numeric = programmedRpe.replace(/[^\d.,]/g, "").replace(",", ".");
  return numeric || programmedRpe;
}

export function applyAthleteSetDefaults<T extends SetRowLike>(
  exercise: ExerciseLike,
  row: T,
): T {
  return {
    ...row,
    reps: row.reps?.trim() ? row.reps : getCoachRepsDefault(exercise),
    rpe: row.rpe?.trim() ? row.rpe : getCoachRpeDefault(exercise),
  };
}
