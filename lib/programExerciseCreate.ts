import { supabase } from "@/lib/supabaseClient";
import type { ProgramExercise } from "@/lib/programWeek/types";

export type InsertProgramExerciseInput = {
  dayId: string;
  name: string;
  sets?: string;
  reps?: string;
  load?: string;
  rpe?: string;
  notes?: string;
  priority?: string;
  exerciseNumber?: number;
  exerciseFormat?: string | null;
  supersetGroup?: string | null;
  restSeconds?: number | null;
  exerciseLibraryId?: string | null;
};

export async function insertProgramExerciseForDay(
  input: InsertProgramExerciseInput,
): Promise<{ exercise: ProgramExercise | null; error: string | null }> {
  const { data, error } = await supabase.rpc("insert_program_exercise_for_day", {
    p_day_id: input.dayId,
    p_name: input.name.trim(),
    p_sets: (input.sets ?? "").trim(),
    p_reps: (input.reps ?? "").trim(),
    p_load: input.load ?? "",
    p_rpe: input.rpe ?? "",
    p_notes: (input.notes ?? "").trim(),
    p_priority: input.priority ?? "",
    p_exercise_number: input.exerciseNumber ?? 1,
    p_exercise_format: input.exerciseFormat ?? "normal",
    p_superset_group: input.supersetGroup ?? null,
    p_rest_seconds: input.restSeconds ?? null,
    p_exercise_library_id: input.exerciseLibraryId ?? null,
  });

  if (error) {
    return { exercise: null, error: error.message };
  }

  return { exercise: (data ?? null) as ProgramExercise | null, error: null };
}
