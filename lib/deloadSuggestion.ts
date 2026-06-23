import { supabase } from "@/lib/supabaseClient";

const DELOAD_RPE_THRESHOLD = 8.5;
const MIN_SETS = 6;

function parseRpe(value: string | null | undefined) {
  const match = (value || "").replace(",", ".").match(/[\d.]+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function weekKey(date: Date) {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

export type DeloadSuggestion = {
  show: boolean;
  currentAvg: number;
  previousAvg: number;
  message: string;
};

export async function loadDeloadSuggestion(
  athleteId: string,
): Promise<DeloadSuggestion> {
  const since = new Date();
  since.setDate(since.getDate() - 21);

  const { data: sets } = await supabase
    .from("athlete_exercise_sets")
    .select("rpe, created_at")
    .eq("athlete_id", athleteId)
    .gte("created_at", since.toISOString())
    .not("rpe", "is", null);

  const byWeek = new Map<string, number[]>();

  for (const row of sets || []) {
    const rpe = parseRpe(row.rpe as string);
    if (rpe === null) continue;
    const key = weekKey(new Date(row.created_at as string));
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key)!.push(rpe);
  }

  const weekKeys = [...byWeek.keys()].sort();
  if (weekKeys.length < 2) {
    return {
      show: false,
      currentAvg: 0,
      previousAvg: 0,
      message: "",
    };
  }

  const currentKey = weekKeys[weekKeys.length - 1]!;
  const previousKey = weekKeys[weekKeys.length - 2]!;
  const current = byWeek.get(currentKey) || [];
  const previous = byWeek.get(previousKey) || [];

  if (current.length < MIN_SETS / 2 || previous.length < MIN_SETS / 2) {
    return {
      show: false,
      currentAvg: 0,
      previousAvg: 0,
      message: "",
    };
  }

  const currentAvg =
    current.reduce((s, v) => s + v, 0) / current.length;
  const previousAvg =
    previous.reduce((s, v) => s + v, 0) / previous.length;

  const rising =
    currentAvg >= DELOAD_RPE_THRESHOLD &&
    currentAvg >= previousAvg + 0.4;

  return {
    show: rising,
    currentAvg,
    previousAvg,
    message: rising
      ? `Gemiddelde RPE steeg naar ${currentAvg.toFixed(1)} (was ${previousAvg.toFixed(1)}). Overweeg een deload-week.`
      : "",
  };
}
