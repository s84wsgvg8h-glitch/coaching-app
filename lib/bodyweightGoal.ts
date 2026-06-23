import { supabase } from "@/lib/supabaseClient";

export type BodyweightGoal = {
  kg: number | null;
  date: string | null;
};

export async function loadBodyweightGoal(
  athleteId: string,
): Promise<BodyweightGoal> {
  const { data } = await supabase
    .from("profiles")
    .select("bodyweight_goal_kg, bodyweight_goal_date")
    .eq("id", athleteId)
    .single();

  return {
    kg:
      data?.bodyweight_goal_kg !== null && data?.bodyweight_goal_kg !== undefined
        ? Number(data.bodyweight_goal_kg)
        : null,
    date: data?.bodyweight_goal_date || null,
  };
}

export async function saveBodyweightGoal(
  athleteId: string,
  goal: BodyweightGoal,
) {
  return supabase
    .from("profiles")
    .update({
      bodyweight_goal_kg: goal.kg,
      bodyweight_goal_date: goal.date,
    })
    .eq("id", athleteId);
}
