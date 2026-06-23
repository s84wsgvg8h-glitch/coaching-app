import { supabase } from "@/lib/supabaseClient";

export type AthleteSetUpsertRow = {
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
};

export async function upsertAthleteSetRow(row: AthleteSetUpsertRow) {
  const { error } = await supabase.from("athlete_exercise_sets").upsert(row, {
    onConflict: "program_exercise_id,athlete_id,set_number",
  });
  return { error };
}

export function setRowKey(row: Pick<AthleteSetUpsertRow, "program_exercise_id" | "athlete_id" | "set_number">) {
  return `${row.program_exercise_id}:${row.athlete_id}:${row.set_number}`;
}
