import { supabase } from "@/lib/supabaseClient";

export type ProgramMacrocycle = {
  id: string;
  athlete_id: string;
  title: string;
  sort_order: number;
  created_at?: string | null;
};

export async function loadProgramMacrocycles(athleteId: string) {
  const { data, error } = await supabase
    .from("program_macrocycles")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Macrocycles laden mislukt:", error.message);
    return [] as ProgramMacrocycle[];
  }

  return (data || []) as ProgramMacrocycle[];
}

export async function createProgramMacrocycle(
  athleteId: string,
  title: string,
  createdBy: string,
  sortOrder: number,
) {
  return supabase
    .from("program_macrocycles")
    .insert({
      athlete_id: athleteId,
      title: title.trim(),
      sort_order: sortOrder,
      created_by: createdBy,
    })
    .select("*")
    .single();
}

export async function assignBlockToMacrocycle(
  blockId: string,
  macrocycleId: string | null,
) {
  return supabase
    .from("program_blocks")
    .update({ macrocycle_id: macrocycleId })
    .eq("id", blockId)
    .select("*")
    .single();
}
