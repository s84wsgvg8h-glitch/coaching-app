import { supabase } from "@/lib/supabaseClient";
import { loadCoachAthleteOverview } from "@/lib/coachAthleteOverview";

export type PeriodizationAlert = {
  id: string;
  coach_id: string;
  athlete_id: string;
  alert_type: string;
  message: string;
  dismissed_at: string | null;
  created_at: string;
  athlete_name?: string;
};

export async function loadActivePeriodizationAlerts(
  coachId: string,
  role: string,
): Promise<PeriodizationAlert[]> {
  const { data, error } = await supabase
    .from("periodization_alerts")
    .select("*")
    .eq("coach_id", coachId)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data?.length) return [];

  const athleteIds = [...new Set(data.map((row) => row.athlete_id))];
  const { data: athletes } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", athleteIds);

  const nameMap = new Map(
    (athletes || []).map((a) => [a.id, a.full_name || "Atleet"]),
  );

  return (data as PeriodizationAlert[]).map((row) => ({
    ...row,
    athlete_name: nameMap.get(row.athlete_id),
  }));
}

export async function dismissPeriodizationAlert(alertId: string) {
  return supabase
    .from("periodization_alerts")
    .update({ dismissed_at: new Date().toISOString() })
    .eq("id", alertId);
}

export async function detectAndInsertPeriodizationAlerts(
  coachId: string,
  role: string,
) {
  const overview = await loadCoachAthleteOverview(coachId, role);
  const atRisk = overview.filter((row) => row.fillScore < 70);

  for (const athlete of atRisk) {
    const { data: existing } = await supabase
      .from("periodization_alerts")
      .select("id")
      .eq("coach_id", coachId)
      .eq("athlete_id", athlete.id)
      .eq("alert_type", "low_fill_high_fatigue")
      .is("dismissed_at", null)
      .limit(1);

    if (existing?.length) continue;

    await supabase.from("periodization_alerts").insert({
      coach_id: coachId,
      athlete_id: athlete.id,
      alert_type: "low_fill_high_fatigue",
      message: `${athlete.fullName} heeft een invulscore van ${athlete.fillScore}% — overweeg deload of check-in.`,
    });
  }
}
