import { supabase } from "@/lib/supabaseClient";

export type CoachAthleteNote = {
  id: string;
  coach_id: string;
  athlete_id: string;
  notes: string;
  updated_at: string;
};

export async function loadCoachAthleteNotes(
  coachId: string,
  athleteId: string,
): Promise<CoachAthleteNote | null> {
  const { data, error } = await supabase
    .from("coach_athlete_notes")
    .select("*")
    .eq("coach_id", coachId)
    .eq("athlete_id", athleteId)
    .maybeSingle();

  if (error) {
    console.error("Coach notities laden mislukt:", error.message);
    return null;
  }

  return data as CoachAthleteNote | null;
}

export async function saveCoachAthleteNotes(
  coachId: string,
  athleteId: string,
  notes: string,
) {
  return supabase.from("coach_athlete_notes").upsert(
    {
      coach_id: coachId,
      athlete_id: athleteId,
      notes,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "coach_id,athlete_id" },
  );
}
