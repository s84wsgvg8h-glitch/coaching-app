import { supabase } from "@/lib/supabaseClient";

export type AthleteCurrentMaxes = {
  current_max_squat: number | null;
  current_max_bench: number | null;
  current_max_deadlift: number | null;
};

export type SbdLiftKey = "squat" | "bench" | "deadlift";

export const SBD_LIFT_LABELS: Record<SbdLiftKey, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
};

function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function emptyCurrentMaxes(): AthleteCurrentMaxes {
  return {
    current_max_squat: null,
    current_max_bench: null,
    current_max_deadlift: null,
  };
}

export async function loadAthleteCurrentMaxes(
  athleteId: string,
): Promise<AthleteCurrentMaxes> {
  const { data, error } = await supabase
    .from("profiles")
    .select("current_max_squat, current_max_bench, current_max_deadlift")
    .eq("id", athleteId)
    .single();

  if (error || !data) return emptyCurrentMaxes();

  return {
    current_max_squat: parseNumeric(data.current_max_squat),
    current_max_bench: parseNumeric(data.current_max_bench),
    current_max_deadlift: parseNumeric(data.current_max_deadlift),
  };
}

export async function saveAthleteCurrentMaxes(
  athleteId: string,
  values: AthleteCurrentMaxes,
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      current_max_squat: values.current_max_squat,
      current_max_bench: values.current_max_bench,
      current_max_deadlift: values.current_max_deadlift,
    })
    .eq("id", athleteId);

  return { error };
}

export function getMaxForLift(
  maxes: AthleteCurrentMaxes,
  lift: SbdLiftKey,
): number | null {
  if (lift === "squat") return maxes.current_max_squat;
  if (lift === "bench") return maxes.current_max_bench;
  return maxes.current_max_deadlift;
}

export function formatCurrentMax(value: number | null) {
  if (value === null || Number.isNaN(value)) return "—";
  return `${value} kg`;
}

export function parseMaxInput(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number.parseFloat(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
