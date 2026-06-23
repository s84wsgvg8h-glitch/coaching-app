import { supabase } from "@/lib/supabaseClient";
import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";

export const NO_ATHLETE_PROGRAM_MESSAGE =
  "Vraag je coach om je programma in te zetten.";

export function isNoAthleteProgramMessage(error: string | null | undefined) {
  return error === NO_ATHLETE_PROGRAM_MESSAGE;
}

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

function toDateOnly(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function pickCurrentBlock(blocks: ProgramBlockRow[]) {
  if (blocks.length === 0) return null;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return (
    [...blocks]
      .reverse()
      .find((block) => {
        const start = toDateOnly(block.start_date);
        return start ? start <= today : false;
      }) || blocks[blocks.length - 1]
  );
}

function pickCurrentWeek(
  weeks: ProgramWeekRow[],
  blockStartDate: string | null | undefined,
) {
  if (weeks.length === 0) return null;

  const blockStart = toDateOnly(blockStartDate);
  if (!blockStart) return weeks[weeks.length - 1];

  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diffDays = Math.floor(
    (today.getTime() - blockStart.getTime()) / (1000 * 60 * 60 * 24),
  );
  const weekIndex = Math.max(0, Math.floor(diffDays / 7));
  return weeks[Math.min(weekIndex, weeks.length - 1)];
}

export async function resolveProgramEntryForAthlete(
  athleteId: string,
  actingUserId: string,
): Promise<{ data: ResolvedProgramEntry | null; error: string | null }> {
  const isAthleteViewingOwnProgram = actingUserId === athleteId;

  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, athlete_id, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    return { data: null, error: blocksError.message };
  }

  let block: ProgramBlockRow | null = pickCurrentBlock(
    (blocks || []) as ProgramBlockRow[],
  );

  if (!block) {
    if (isAthleteViewingOwnProgram) {
      return { data: null, error: NO_ATHLETE_PROGRAM_MESSAGE };
    }

    const { blockId, error: createError } = await createProgramBlockForAthlete({
      athleteId,
      title: "Block 1",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
    });

    if (createError || !blockId) {
      return {
        data: null,
        error: createError || "Programma kon niet worden aangemaakt.",
      };
    }

    const { data: createdBlock, error: loadBlockError } = await supabase
      .from("program_blocks")
      .select("id, title, athlete_id, start_date")
      .eq("id", blockId)
      .maybeSingle();

    if (loadBlockError || !createdBlock) {
      return {
        data: null,
        error: loadBlockError?.message || "Programma kon niet worden geladen.",
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

  let week: ProgramWeekRow | null = pickCurrentWeek(
    (weeks || []) as ProgramWeekRow[],
    block.start_date,
  );

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
