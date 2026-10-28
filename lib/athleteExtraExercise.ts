import { supabase } from "@/lib/supabaseClient";
import type { ProgramExercise } from "@/lib/programWeek/types";

export const ATHLETE_EXTRA_EXERCISE_FORMAT = "athlete_extra";

export type AthleteExtraExerciseInput = {
  dayId: string;
  name: string;
  sets?: string;
  reps?: string;
  rpe?: string;
  exerciseLibraryId?: string | null;
};

export function isAthleteExtraExercise(
  exercise: Pick<ProgramExercise, "exercise_format">,
) {
  return exercise.exercise_format === ATHLETE_EXTRA_EXERCISE_FORMAT;
}

export async function insertAthleteExtraExerciseForDay(
  input: AthleteExtraExerciseInput,
): Promise<{ exercise: ProgramExercise | null; error: string | null }> {
  const { data, error } = await supabase.rpc("insert_athlete_extra_exercise_for_day", {
    p_day_id: input.dayId,
    p_name: input.name.trim(),
    p_exercise_library_id: input.exerciseLibraryId ?? null,
    p_sets: input.sets?.trim() || "1",
    p_reps: input.reps?.trim() || "",
    p_rpe: input.rpe?.trim() || "",
  });

  if (error) {
    return { exercise: null, error: error.message };
  }

  return { exercise: (data ?? null) as ProgramExercise | null, error: null };
}

export async function deleteAthleteExtraExercise(
  exerciseId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc("delete_athlete_extra_exercise", {
    p_exercise_id: exerciseId,
  });

  if (error) {
    return { error: error.message };
  }

  return { error: null };
}

export async function updateAthleteExtraExerciseName(
  exerciseId: string,
  name: string,
): Promise<{ exercise: ProgramExercise | null; error: string | null }> {
  const { data, error } = await supabase.rpc("update_athlete_extra_exercise_name", {
    p_exercise_id: exerciseId,
    p_name: name.trim(),
  });

  if (error) {
    return { exercise: null, error: error.message };
  }

  return { exercise: (data ?? null) as ProgramExercise | null, error: null };
}
