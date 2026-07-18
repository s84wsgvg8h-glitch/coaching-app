import { supabase } from "@/lib/supabaseClient";
import type { ProgramWeek } from "@/lib/programWeek/types";

export type DuplicateProgramWeekInput = {
  sourceWeekId: string;
  targetBlockId: string;
  targetWeekNumber: number;
  targetTitle: string;
};

export async function duplicateProgramWeek(
  input: DuplicateProgramWeekInput,
): Promise<{ week: ProgramWeek | null; error: string | null }> {
  const { data: newWeekId, error } = await supabase.rpc("duplicate_program_week", {
    p_source_week_id: input.sourceWeekId,
    p_target_block_id: input.targetBlockId,
    p_target_week_number: input.targetWeekNumber,
    p_target_title: input.targetTitle.trim(),
  });

  if (error) {
    return { week: null, error: error.message };
  }

  if (!newWeekId || typeof newWeekId !== "string") {
    return { week: null, error: "Week kon niet worden gekopieerd." };
  }

  const { data: week, error: fetchError } = await supabase
    .from("program_weeks")
    .select("*")
    .eq("id", newWeekId)
    .single();

  if (fetchError || !week) {
    return {
      week: null,
      error: fetchError?.message ?? "Gekopieerde week kon niet worden geladen.",
    };
  }

  return { week: week as ProgramWeek, error: null };
}
