import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import { supabase } from "@/lib/supabaseClient";

export type CoachProgramAthleteRow = {
  id: string;
  full_name: string | null;
};

export async function loadCoachProgramAthletes(
  coachId: string,
): Promise<CoachProgramAthleteRow[]> {
  const ctx = await loadCoachOrgContext(coachId);
  if (!ctx) return [];

  let query = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet")
    .order("full_name", { ascending: true })
    .limit(50);

  query = applyAthleteScope(query, ctx);
  const { data } = await query;

  return data || [];
}
