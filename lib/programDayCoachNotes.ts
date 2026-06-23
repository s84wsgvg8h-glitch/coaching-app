import { supabase } from "@/lib/supabaseClient";

export type ProgramDayCoachNote = {
  id: string;
  program_day_id: string;
  athlete_id: string;
  coach_id: string;
  note: string;
};

export async function loadProgramDayCoachNotes(
  athleteId: string,
  dayIds: string[],
) {
  if (dayIds.length === 0) {
    return { data: {} as Record<string, string>, error: null };
  }

  const { data, error } = await supabase
    .from("program_day_coach_notes")
    .select("program_day_id, note")
    .eq("athlete_id", athleteId)
    .in("program_day_id", dayIds);

  if (error) {
    return { data: {} as Record<string, string>, error };
  }

  const map: Record<string, string> = {};
  for (const row of data || []) {
    map[row.program_day_id as string] = (row.note as string) || "";
  }

  return { data: map, error: null };
}

export async function saveProgramDayCoachNote(input: {
  programDayId: string;
  athleteId: string;
  coachId: string;
  note: string;
}) {
  const trimmed = input.note.trim();

  if (!trimmed) {
    const { error } = await supabase
      .from("program_day_coach_notes")
      .delete()
      .eq("program_day_id", input.programDayId)
      .eq("athlete_id", input.athleteId);
    return { error };
  }

  const { error } = await supabase.from("program_day_coach_notes").upsert(
    {
      program_day_id: input.programDayId,
      athlete_id: input.athleteId,
      coach_id: input.coachId,
      note: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "program_day_id,athlete_id" },
  );

  return { error };
}
