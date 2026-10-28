import { supabase } from "@/lib/supabaseClient";
import type { ProgramWeek } from "@/lib/programWeek/types";

export type DuplicateProgramWeekInput = {
  sourceWeekId: string;
  targetBlockId: string;
  targetWeekNumber: number;
  targetTitle: string;
};

export async function duplicateProgramWeekId(
  input: DuplicateProgramWeekInput,
): Promise<{ weekId: string | null; error: string | null }> {
  const { data: newWeekId, error } = await supabase.rpc("duplicate_program_week", {
    p_source_week_id: input.sourceWeekId,
    p_target_block_id: input.targetBlockId,
    p_target_week_number: input.targetWeekNumber,
    p_target_title: input.targetTitle.trim(),
    p_extra_day_offset: null,
  });

  if (error) {
    return { weekId: null, error: error.message };
  }

  if (!newWeekId || typeof newWeekId !== "string") {
    return { weekId: null, error: "Week kon niet worden gekopieerd." };
  }

  return { weekId: newWeekId, error: null };
}

export async function duplicateProgramWeek(
  input: DuplicateProgramWeekInput,
): Promise<{ week: ProgramWeek | null; error: string | null }> {
  const { weekId, error } = await duplicateProgramWeekId(input);

  if (error || !weekId) {
    return { week: null, error: error || "Week kon niet worden gekopieerd." };
  }

  const { data: week, error: fetchError } = await supabase
    .from("program_weeks")
    .select("*")
    .eq("id", weekId)
    .single();

  if (fetchError || !week) {
    return {
      week: null,
      error: fetchError?.message ?? "Gekopieerde week kon niet worden geladen.",
    };
  }

  return { week: week as ProgramWeek, error: null };
}
