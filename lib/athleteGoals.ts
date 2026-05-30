import { supabase } from "@/lib/supabaseClient";
import type { SbdLiftKey } from "@/lib/athleteCurrentMaxes";

export type AthleteGoal = {
  id: string;
  athlete_id: string;
  lift: SbdLiftKey;
  target_weight: number;
  target_date: string;
  created_at: string;
};

export async function loadAthleteGoals(athleteId: string) {
  const { data, error } = await supabase
    .from("athlete_goals")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("target_date", { ascending: true });

  if (error) {
    console.error("Doelen laden mislukt:", error.message);
    return [] as AthleteGoal[];
  }

  return (data || []) as AthleteGoal[];
}

export async function createAthleteGoal(
  athleteId: string,
  lift: SbdLiftKey,
  targetWeight: number,
  targetDate: string,
) {
  return supabase
    .from("athlete_goals")
    .insert({
      athlete_id: athleteId,
      lift,
      target_weight: targetWeight,
      target_date: targetDate,
    })
    .select("*")
    .single();
}

export async function deleteAthleteGoal(goalId: string) {
  return supabase.from("athlete_goals").delete().eq("id", goalId);
}

export function calculateGoalProgress(current: number | null, target: number) {
  if (!current || current <= 0 || target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}
