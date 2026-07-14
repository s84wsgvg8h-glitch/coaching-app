import { supabase } from "@/lib/supabaseClient";
import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";
import { createProgramWeekForBlock } from "@/lib/programWeekCreate";
import { buildProgramWeekDayDates } from "@/lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramDay } from "@/lib/programWeek/types";

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
  dayId?: string | null;
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

export function pickClosestProgramDayId(
  days: Pick<ProgramDay, "id" | "day_number" | "scheduled_date" | "title">[],
  block: ProgramBlockRow,
  week: ProgramWeekRow,
) {
  if (days.length === 0) return null;

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  let closestDay = days[0];
  let closestDiff = Number.POSITIVE_INFINITY;

  const dayDates = buildProgramWeekDayDates(
    block as ProgramBlock,
    week,
    days as ProgramDay[],
  );

  for (const day of days) {
    const date = dayDates.get(day.id);
    if (!date) continue;

    const dayDate = new Date(date);
    dayDate.setHours(12, 0, 0, 0);
    const diff = Math.abs(dayDate.getTime() - today.getTime());

    if (diff < closestDiff) {
      closestDiff = diff;
      closestDay = day;
    }
  }

  return closestDay.id;
}

async function loadClosestDayIdForWeek(
  week: ProgramWeekRow,
  block: ProgramBlockRow,
) {
  const { data: days, error } = await supabase
    .from("program_days")
    .select("id, day_number, scheduled_date, title")
    .eq("program_week_id", week.id)
    .order("day_number", { ascending: true });

  if (error || !days || days.length === 0) {
    return null;
  }

  return pickClosestProgramDayId(days, block, week);
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
    const { week: createdWeek, error: createWeekError } =
      await createProgramWeekForBlock({
        blockId: block.id,
        title: "Week 1",
        weekNumber: 1,
      });

    if (createWeekError || !createdWeek) {
      return {
        data: null,
        error: createWeekError || "Week kon niet worden aangemaakt",
      };
    }

    week = createdWeek as ProgramWeekRow;
  }

  const dayId = await loadClosestDayIdForWeek(week, block);

  return {
    data: {
      blockId: block.id,
      weekId: week.id,
      athleteId,
      dayId,
    },
    error: null,
  };
}

export async function resolveProgramEntryForAthleteAtPosition(
  athleteId: string,
  actingUserId: string,
  context: {
    blockTitle?: string | null;
    weekNumber?: number | null;
  },
): Promise<{ data: ResolvedProgramEntry | null; error: string | null }> {
  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, athlete_id, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    return { data: null, error: blocksError.message };
  }

  if (!blocks || blocks.length === 0) {
    return resolveProgramEntryForAthlete(athleteId, actingUserId);
  }

  const normalizedTitle = context.blockTitle?.trim() || "";
  const block =
    (normalizedTitle
      ? blocks.find((item) => item.title?.trim() === normalizedTitle)
      : null) || pickCurrentBlock(blocks as ProgramBlockRow[]);

  if (!block) {
    return resolveProgramEntryForAthlete(athleteId, actingUserId);
  }

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id, title, week_number, program_block_id")
    .eq("program_block_id", block.id)
    .order("week_number", { ascending: true });

  if (weeksError) {
    return { data: null, error: weeksError.message };
  }

  const weekRows = (weeks || []) as ProgramWeekRow[];
  let week: ProgramWeekRow | null = null;

  if (context.weekNumber != null) {
    week = weekRows.find((item) => item.week_number === context.weekNumber) || null;
  }

  if (!week) {
    week = pickCurrentWeek(weekRows, block.start_date);
  }

  if (!week) {
    return resolveProgramEntryForAthlete(athleteId, actingUserId);
  }

  const dayId = await loadClosestDayIdForWeek(week, block as ProgramBlockRow);

  return {
    data: {
      blockId: block.id,
      weekId: week.id,
      athleteId,
      dayId,
    },
    error: null,
  };
}

export function buildProgramWeekPath(
  entry: ResolvedProgramEntry,
  options?: { coachViewingAthlete?: boolean },
) {
  const base = `/programs/${entry.blockId}/weeks/${entry.weekId}`;
  const queryParts: string[] = [];

  if (options?.coachViewingAthlete) {
    queryParts.push(`athlete=${encodeURIComponent(entry.athleteId)}`);
  }

  if (entry.dayId) {
    queryParts.push(`focusDay=${encodeURIComponent(entry.dayId)}`);
  }

  const query = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return `${base}${query}`;
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
    .select("id, title, week_number, program_block_id")
    .eq("program_block_id", blockId)
    .order("week_number", { ascending: true });

  if (weeksError) {
    return { data: null, error: weeksError.message };
  }

  const blockRow = block as ProgramBlockRow;
  const week = pickCurrentWeek((weeks || []) as ProgramWeekRow[], blockRow.start_date);

  if (!week) {
    return { data: null, error: "Geen week gevonden in dit programma." };
  }

  const dayId = await loadClosestDayIdForWeek(week, blockRow);

  return {
    data: { blockId, weekId: week.id, athleteId, dayId },
    error: null,
  };
}
