import { supabase } from "@/lib/supabaseClient";
import type { HabitFrequency } from "@/lib/habitFrequency";

export type AthleteDashboardItemType = "todo" | "habit";
export type AthleteDashboardItemCreator = "coach" | "atleet";

export type AthleteDashboardItem = {
  id: string;
  athlete_id: string;
  coach_id: string | null;
  title: string;
  item_type: AthleteDashboardItemType;
  created_by: AthleteDashboardItemCreator;
  habit_frequency: HabitFrequency | null;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function loadAthleteDashboardItems(athleteId: string) {
  const { data, error } = await supabase
    .from("athlete_dashboard_items")
    .select("*")
    .eq("athlete_id", athleteId)
    .order("completed", { ascending: true })
    .order("created_at", { ascending: false });

  return {
    data: (data || []) as AthleteDashboardItem[],
    error,
  };
}

export async function createAthleteDashboardItem(input: {
  athleteId: string;
  coachId?: string | null;
  title: string;
  itemType: AthleteDashboardItemType;
  createdBy: AthleteDashboardItemCreator;
  habitFrequency?: HabitFrequency | null;
}) {
  const title = input.title.trim();
  if (!title) {
    return { data: null, error: new Error("Vul een titel in.") };
  }

  if (input.itemType === "habit" && input.createdBy !== "atleet") {
    return { data: null, error: new Error("Habits kunnen alleen door atleten worden toegevoegd.") };
  }

  const habitFrequency =
    input.itemType === "habit" ? input.habitFrequency ?? "daily" : null;

  const { data, error } = await supabase
    .from("athlete_dashboard_items")
    .insert({
      athlete_id: input.athleteId,
      coach_id: input.coachId ?? null,
      title,
      item_type: input.itemType,
      created_by: input.createdBy,
      habit_frequency: habitFrequency,
    })
    .select("*")
    .single();

  return {
    data: (data || null) as AthleteDashboardItem | null,
    error,
  };
}

export async function toggleAthleteDashboardItem(item: AthleteDashboardItem) {
  const nextCompleted = !item.completed;
  const { data, error } = await supabase
    .from("athlete_dashboard_items")
    .update({
      completed: nextCompleted,
      completed_at: nextCompleted ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", item.id)
    .select("*")
    .single();

  return {
    data: (data || null) as AthleteDashboardItem | null,
    error,
  };
}

export async function updateAthleteDashboardItemHabitFrequency(
  itemId: string,
  frequency: HabitFrequency,
) {
  const { data, error } = await supabase
    .from("athlete_dashboard_items")
    .update({
      habit_frequency: frequency,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .select("*")
    .single();

  return {
    data: (data || null) as AthleteDashboardItem | null,
    error,
  };
}

export async function deleteAthleteDashboardItem(itemId: string) {
  const { error } = await supabase
    .from("athlete_dashboard_items")
    .delete()
    .eq("id", itemId);

  return { error };
}
