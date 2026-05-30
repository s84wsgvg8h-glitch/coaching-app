import { supabase } from "@/lib/supabaseClient";

export type ProgramBlockRow = {
  id: string;
  title: string;
  description?: string | null;
  athlete_id: string | null;
  start_date: string | null;
};

export type ProgramWeekRow = {
  id: string;
  title: string;
  week_number: number;
  program_block_id: string;
};

export type ResolvedProgramEntry = {
  blockId: string;
  weekId: string;
  athleteId: string;
};

export async function resolveProgramEntryForAthlete(
  athleteId: string,
  actingUserId: string,
): Promise<{ data: ResolvedProgramEntry | null; error: string | null }> {
  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, athlete_id, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    return { data: null, error: blocksError.message };
  }

  let block: ProgramBlockRow | null = (blocks?.[0] as ProgramBlockRow) || null;

  if (!block) {
    const { data: createdBlock, error: createBlockError } = await supabase
      .from("program_blocks")
      .insert({
        title: "Block 1",
        description: "",
        start_date: new Date().toISOString().split("T")[0],
        athlete_id: athleteId,
        created_by: actingUserId,
      })
      .select("id, title, athlete_id, start_date")
      .single();

    if (createBlockError || !createdBlock) {
      return {
        data: null,
        error: createBlockError?.message || "Block kon niet worden aangemaakt",
      };
    }

    block = createdBlock as ProgramBlockRow;
  }

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id, title, week_number, program_block_id")
    .eq("program_block_id", block.id)
    .order("week_number", { ascending: true });

  if (weeksError) {
    return { data: null, error: weeksError.message };
  }

  let week: ProgramWeekRow | null = (weeks?.[0] as ProgramWeekRow) || null;

  if (!week) {
    const { data: createdWeek, error: createWeekError } = await supabase
      .from("program_weeks")
      .insert({
        title: "Week 1",
        week_number: 1,
        program_block_id: block.id,
      })
      .select("id, title, week_number, program_block_id")
      .single();

    if (createWeekError || !createdWeek) {
      return {
        data: null,
        error: createWeekError?.message || "Week kon niet worden aangemaakt",
      };
    }

    week = createdWeek as ProgramWeekRow;
  }

  return {
    data: {
      blockId: block.id,
      weekId: week.id,
      athleteId,
    },
    error: null,
  };
}

export function buildProgramWeekPath(
  entry: ResolvedProgramEntry,
  options?: { coachViewingAthlete?: boolean },
) {
  const base = `/programs/${entry.blockId}/weeks/${entry.weekId}`;
  if (options?.coachViewingAthlete) {
    return `${base}?athlete=${entry.athleteId}`;
  }
  return base;
}

export async function resolveProgramEntryFromBlockId(
  blockId: string,
  athleteQuery?: string | null,
): Promise<{ data: ResolvedProgramEntry | null; error: string | null }> {
  const { data: block, error: blockError } = await supabase
    .from("program_blocks")
    .select("id, athlete_id")
    .eq("id", blockId)
    .maybeSingle();

  if (blockError) {
    return { data: null, error: blockError.message };
  }

  if (!block) {
    return { data: null, error: "Programma niet gevonden." };
  }

  const athleteId = athleteQuery || block.athlete_id;
  if (!athleteId) {
    return { data: null, error: "Geen atleet gekoppeld aan dit programma." };
  }

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id")
    .eq("program_block_id", blockId)
    .order("week_number", { ascending: true })
    .limit(1);

  if (weeksError) {
    return { data: null, error: weeksError.message };
  }

  const weekId = weeks?.[0]?.id;
  if (!weekId) {
    return { data: null, error: "Geen week gevonden in dit programma." };
  }

  return {
    data: { blockId, weekId, athleteId },
    error: null,
  };
}
