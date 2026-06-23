import { supabase } from "@/lib/supabaseClient";

export type CreateProgramBlockInput = {
  athleteId: string;
  title: string;
  description?: string;
  startDate: string;
  macrocycleId?: string | null;
};

export async function createProgramBlockForAthlete(
  input: CreateProgramBlockInput,
): Promise<{ blockId: string | null; error: string | null }> {
  const { data, error } = await supabase.rpc("create_program_block_for_athlete", {
    p_athlete_id: input.athleteId,
    p_title: input.title.trim(),
    p_description: input.description?.trim() || "",
    p_start_date: input.startDate,
    p_macrocycle_id: input.macrocycleId || null,
  });

  if (error) {
    return { blockId: null, error: error.message };
  }

  return { blockId: data as string, error: null };
}
