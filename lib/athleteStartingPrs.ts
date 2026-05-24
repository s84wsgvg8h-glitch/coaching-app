import { supabase } from "@/lib/supabaseClient";

export type AthleteStartingPrs = {
  coaching_start_date: string | null;
  starting_pr_squat: number | null;
  starting_pr_bench: number | null;
  starting_pr_deadlift: number | null;
};

export function emptyStartingPrs(): AthleteStartingPrs {
  return {
    coaching_start_date: null,
    starting_pr_squat: null,
    starting_pr_bench: null,
    starting_pr_deadlift: null,
  };
}

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function loadAthleteStartingPrs(
  athleteId: string,
): Promise<AthleteStartingPrs> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "coaching_start_date, starting_pr_squat, starting_pr_bench, starting_pr_deadlift",
    )
    .eq("id", athleteId)
    .single();

  if (error || !data) return emptyStartingPrs();

  return {
    coaching_start_date: data.coaching_start_date || null,
    starting_pr_squat: parseNumeric(data.starting_pr_squat),
    starting_pr_bench: parseNumeric(data.starting_pr_bench),
    starting_pr_deadlift: parseNumeric(data.starting_pr_deadlift),
  };
}

export async function saveAthleteStartingPrs(
  athleteId: string,
  values: AthleteStartingPrs,
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      coaching_start_date: values.coaching_start_date || null,
      starting_pr_squat: values.starting_pr_squat,
      starting_pr_bench: values.starting_pr_bench,
      starting_pr_deadlift: values.starting_pr_deadlift,
    })
    .eq("id", athleteId);

  return { error };
}

export function formatStartingPr(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value} kg`;
}

export function formatCoachingStartDate(value: string | null) {
  if (!value) return "—";
  return new Date(`${value}T12:00:00`).toLocaleDateString("nl-NL");
}

export function parsePrInput(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
