import { supabase } from "@/lib/supabaseClient";

export type ProgramPlanningNotes = {
  weekNotes: Record<string, string>;
  blockNotes: Record<string, string>;
};

export async function loadProgramPlanningNotes(
  athleteId: string,
  weekIds: string[],
  blockIds: string[],
): Promise<{ data: ProgramPlanningNotes; error: unknown }> {
  const weekNotes: Record<string, string> = {};
  const blockNotes: Record<string, string> = {};

  if (weekIds.length === 0 && blockIds.length === 0) {
    return { data: { weekNotes, blockNotes }, error: null };
  }

  let query = supabase
    .from("program_planning_notes")
    .select("program_week_id, program_block_id, note")
    .eq("athlete_id", athleteId);

  if (weekIds.length > 0 && blockIds.length > 0) {
    query = query.or(
      `program_week_id.in.(${weekIds.join(",")}),program_block_id.in.(${blockIds.join(",")})`,
    );
  } else if (weekIds.length > 0) {
    query = query.in("program_week_id", weekIds);
  } else {
    query = query.in("program_block_id", blockIds);
  }

  const { data, error } = await query;

  if (error) {
    return { data: { weekNotes, blockNotes }, error };
  }

  for (const row of data || []) {
    const note = (row.note as string) || "";
    if (row.program_week_id) {
      weekNotes[row.program_week_id as string] = note;
    }
    if (row.program_block_id) {
      blockNotes[row.program_block_id as string] = note;
    }
  }

  return { data: { weekNotes, blockNotes }, error: null };
}

export async function saveProgramPlanningWeekNote(input: {
  programWeekId: string;
  athleteId: string;
  coachId: string;
  note: string;
}) {
  const trimmed = input.note.trim();

  if (!trimmed) {
    const { error } = await supabase
      .from("program_planning_notes")
      .delete()
      .eq("program_week_id", input.programWeekId)
      .eq("athlete_id", input.athleteId);
    return { error };
  }

  const { error } = await supabase.from("program_planning_notes").upsert(
    {
      program_week_id: input.programWeekId,
      program_block_id: null,
      athlete_id: input.athleteId,
      coach_id: input.coachId,
      note: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id,program_week_id" },
  );

  return { error };
}

export async function saveProgramPlanningBlockNote(input: {
  programBlockId: string;
  athleteId: string;
  coachId: string;
  note: string;
}) {
  const trimmed = input.note.trim();

  if (!trimmed) {
    const { error } = await supabase
      .from("program_planning_notes")
      .delete()
      .eq("program_block_id", input.programBlockId)
      .eq("athlete_id", input.athleteId);
    return { error };
  }

  const { error } = await supabase.from("program_planning_notes").upsert(
    {
      program_week_id: null,
      program_block_id: input.programBlockId,
      athlete_id: input.athleteId,
      coach_id: input.coachId,
      note: trimmed,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "athlete_id,program_block_id" },
  );

  return { error };
}
