import { supabase } from "@/lib/supabaseClient";

export type WeeklyFillScorePoint = {
  label: string;
  score: number;
  weekStart: string;
};

function weekStartKey(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

export async function loadAthleteWeeklyFillScoreHistory(
  athleteId: string,
  weeks = 8,
): Promise<WeeklyFillScorePoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const { data } = await supabase
    .from("athlete_exercise_sets")
    .select("created_at")
    .eq("athlete_id", athleteId)
    .gte("created_at", since.toISOString());

  const counts = new Map<string, number>();
  for (const row of data || []) {
    const key = weekStartKey(new Date(row.created_at as string));
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  const points: WeeklyFillScorePoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const ref = new Date();
    ref.setDate(ref.getDate() - i * 7);
    const key = weekStartKey(ref);
    const count = counts.get(key) || 0;
    points.push({
      weekStart: key,
      label: ref.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }),
      score: count,
    });
  }

  return points;
}

export async function loadTeamFillScores(coachId: string, isAdmin = false) {
  let query = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet");

  if (!isAdmin) query = query.eq("coach_id", coachId);

  const { data: athletes } = await query;
  const { loadAthleteWeeklyFillScore } = await import("@/lib/athleteWeeklyFillScore");

  const rows = [];
  for (const athlete of athletes || []) {
    const result = await loadAthleteWeeklyFillScore(
      athlete.id as string,
      (athlete.full_name as string) || "Atleet",
    );
    rows.push({
      athleteId: athlete.id as string,
      athleteName: (athlete.full_name as string) || "Atleet",
      fillScore: result.percentage,
    });
  }

  return rows;
}
