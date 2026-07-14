import { supabase } from "@/lib/supabaseClient";
import type { ProgramWeek } from "@/lib/programWeek/types";

export type CreateProgramWeekInput = {
  blockId: string;
  title: string;
  weekNumber: number;
};

export async function createProgramWeekForBlock(
  input: CreateProgramWeekInput,
): Promise<{ week: ProgramWeek | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_program_week_for_block", {
    p_block_id: input.blockId,
    p_title: input.title.trim(),
    p_week_number: input.weekNumber,
  });

  if (error) {
    return { week: null, error: error.message };
  }

  return { week: (data ?? null) as ProgramWeek | null, error: null };
}
