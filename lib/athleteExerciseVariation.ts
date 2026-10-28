import { supabase } from "@/lib/supabaseClient";
import type { ProgramExercise } from "@/lib/programWeek/types";

export const ATHLETE_CHOICE_EXERCISE_FORMAT = "athlete_choice";

export function isAthleteChoiceExercise(
  exercise: Pick<
    ProgramExercise,
    "exercise_format" | "block_slot_key" | "variation_base_name"
  >,
) {
  return exercise.exercise_format === ATHLETE_CHOICE_EXERCISE_FORMAT;
}

export function getAthleteVariationBaseName(
  exercise: Pick<ProgramExercise, "variation_base_name" | "name">,
) {
  return exercise.variation_base_name?.trim() || exercise.name?.trim() || "";
}

export function hasAthleteChosenVariation(
  exercise: Pick<
    ProgramExercise,
    "exercise_format" | "variation_base_name" | "name"
  >,
) {
  if (!isAthleteChoiceExercise(exercise)) return false;

  const baseName = getAthleteVariationBaseName(exercise);
  const currentName = exercise.name?.trim() || "";

  if (!baseName || !currentName) return false;
  return currentName.toLowerCase() !== baseName.toLowerCase();
}

export async function setCoachExerciseAthleteVariationMode(
  exerciseId: string,
  enabled: boolean,
  baseName?: string,
): Promise<{ exercises: ProgramExercise[]; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "set_coach_exercise_athlete_variation_mode",
    {
      p_exercise_id: exerciseId,
      p_enabled: enabled,
      p_base_name: baseName?.trim() || null,
    },
  );

  if (error) {
    return { exercises: [], error: error.message };
  }

  return { exercises: (data ?? []) as ProgramExercise[], error: null };
}

export async function setAthleteExerciseVariationChoice(
  exerciseId: string,
  chosenName: string,
): Promise<{ exercises: ProgramExercise[]; error: string | null }> {
  const { data, error } = await supabase.rpc(
    "set_athlete_exercise_variation_choice",
    {
      p_exercise_id: exerciseId,
      p_chosen_name: chosenName.trim(),
    },
  );

  if (error) {
    return { exercises: [], error: error.message };
  }

  return { exercises: (data ?? []) as ProgramExercise[], error: null };
}
