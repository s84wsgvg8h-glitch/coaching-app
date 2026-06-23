import { supabase } from "@/lib/supabaseClient";
import {
  isUpcomingCompetition,
  loadAthleteUpcomingCompetitions,
  type Competition,
} from "@/lib/competitions";
import { normalizeJoinedCompetition } from "@/lib/orgAthleteScope";

export type MeetWeekEntry = {
  competition: Competition;
  goals: string | null;
  coachNotes: string | null;
  meetResults: {
    squatKg: number | null;
    benchKg: number | null;
    deadliftKg: number | null;
    totalKg: number | null;
  };
};

export async function loadAthleteMeetWeekEntries(
  athleteId: string,
): Promise<MeetWeekEntry[]> {
  const { data: rows } = await supabase
    .from("athlete_competitions")
    .select(
      "competition_id, coach_notes, goals, squat_kg, bench_kg, deadlift_kg, total_kg, wedstrijden(*)",
    )
    .eq("athlete_id", athleteId)
    .order("created_at", { ascending: false });

  return (rows || [])
    .map((row) => {
      const raw = normalizeJoinedCompetition(row.wedstrijden);
      if (!raw?.id || !raw.start_date || !raw.end_date || !raw.naam) return null;

      return {
        competition: raw as Competition,
        goals: (row.goals as string | null) ?? null,
        coachNotes: (row.coach_notes as string | null) ?? null,
        meetResults: {
          squatKg: row.squat_kg != null ? Number(row.squat_kg) : null,
          benchKg: row.bench_kg != null ? Number(row.bench_kg) : null,
          deadliftKg: row.deadlift_kg != null ? Number(row.deadlift_kg) : null,
          totalKg: row.total_kg != null ? Number(row.total_kg) : null,
        },
      };
    })
    .filter(
      (entry): entry is MeetWeekEntry =>
        Boolean(entry && isUpcomingCompetition(entry.competition)),
    )
    .sort((a, b) =>
      a.competition.start_date.localeCompare(b.competition.start_date),
    );
}

export async function loadAthleteMeetWeekContext(athleteId: string) {
  const [entries, calendarMeets] = await Promise.all([
    loadAthleteMeetWeekEntries(athleteId),
    loadAthleteUpcomingCompetitions(athleteId),
  ]);

  return { entries, calendarMeets };
}

export function pickMeetEntry(
  entries: MeetWeekEntry[],
  competitionId: string | null,
) {
  if (competitionId) {
    return entries.find((entry) => entry.competition.id === competitionId) || null;
  }

  return entries[0] || null;
}
