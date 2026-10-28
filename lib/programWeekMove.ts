import {
  buildProgramWeekDayDates,
  getBlockWeekCount,
  sortBlockWeeks,
} from "@/lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramDay, ProgramWeek } from "@/lib/programWeek/types";
import { supabase } from "@/lib/supabaseClient";

export type MoveProgramWeekInput = {
  weekId: string;
  sourceBlockId: string;
  targetBlockId: string;
  /** 0-based index within the target block week list after removal from source. */
  targetWeekIndex: number;
  navBlocks: ProgramBlock[];
  weeksByBlock: Record<string, ProgramWeek[]>;
};

export type WeekDropIndicator = {
  blockId: string;
  targetWeekId: string | null;
  position: "before" | "after";
};

function toIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDaysToIso(startIso: string, days: number) {
  const date = new Date(`${startIso}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

export function buildWeeksByBlockAfterMove(input: MoveProgramWeekInput) {
  const movedWeek = (input.weeksByBlock[input.sourceBlockId] || []).find(
    (week) => week.id === input.weekId,
  );

  if (!movedWeek) {
    return null;
  }

  const next: Record<string, ProgramWeek[]> = {};

  for (const [blockId, weeks] of Object.entries(input.weeksByBlock)) {
    next[blockId] = weeks.filter((week) => week.id !== input.weekId);
  }

  if (!next[input.targetBlockId]) {
    next[input.targetBlockId] = [];
  }

  const targetWeeks = [...next[input.targetBlockId]];
  const clampedIndex = Math.max(
    0,
    Math.min(input.targetWeekIndex, targetWeeks.length),
  );
  targetWeeks.splice(clampedIndex, 0, {
    ...movedWeek,
    program_block_id: input.targetBlockId,
  });

  next[input.targetBlockId] = targetWeeks;

  for (const blockId of Object.keys(next)) {
    next[blockId] = next[blockId]
      .sort((a, b) => a.week_number - b.week_number)
      .map((week, index) => ({
        ...week,
        week_number: index + 1,
        program_block_id: blockId,
      }));
  }

  return next;
}

/** Chain block start dates: each block starts when the previous block ends. */
export function computeChainedBlockStartDates(
  blocks: ProgramBlock[],
  weeksByBlock: Record<string, ProgramWeek[]>,
) {
  const ordered = [...blocks]
    .filter((block) => block.start_date)
    .sort((a, b) => String(a.start_date).localeCompare(String(b.start_date)));

  const updates = new Map<string, string>();
  if (ordered.length <= 1) return updates;

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    const weekCount = getBlockWeekCount(weeksByBlock[previous.id] || []);
    const nextStart = addDaysToIso(String(previous.start_date), weekCount * 7);

    if (current.start_date !== nextStart) {
      updates.set(current.id, nextStart);
      ordered[index] = { ...current, start_date: nextStart };
    }
  }

  return updates;
}

function blockWithStartDate(
  blocks: ProgramBlock[],
  blockId: string,
  startDateUpdates: Map<string, string>,
) {
  const block = blocks.find((item) => item.id === blockId);
  if (!block) return null;
  const start_date = startDateUpdates.get(blockId) ?? block.start_date;
  return { ...block, start_date };
}

/** Renumber weeks to 1…n within a block when stored week_number has gaps. */
export async function normalizeBlockWeekNumbersIfNeeded(
  blockWeeks: ProgramWeek[],
): Promise<ProgramWeek[] | null> {
  const sorted = sortBlockWeeks(blockWeeks);
  const updates: Array<{ id: string; week_number: number }> = [];

  sorted.forEach((week, index) => {
    const expected = index + 1;
    if (week.week_number !== expected) {
      updates.push({ id: week.id, week_number: expected });
    }
  });

  if (updates.length === 0) {
    return null;
  }

  for (const update of updates) {
    const { error } = await supabase
      .from("program_weeks")
      .update({ week_number: update.week_number })
      .eq("id", update.id);

    if (error) {
      throw new Error(error.message);
    }
  }

  return sorted.map((week, index) => ({ ...week, week_number: index + 1 }));
}

async function syncWeekDayScheduledDates(
  block: ProgramBlock,
  week: ProgramWeek,
  blockWeeks: ProgramWeek[],
) {
  const { data: days, error } = await supabase
    .from("program_days")
    .select("*")
    .eq("program_week_id", week.id)
    .order("day_number", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  if (!days?.length) return;

  const dayRows = days as ProgramDay[];
  const dayDates = buildProgramWeekDayDates(block, week, dayRows, blockWeeks);

  await Promise.all(
    dayRows.map(async (day) => {
      const computedDate = dayDates.get(day.id);
      if (!computedDate) return;

      const scheduled_date = toIsoDate(computedDate);
      const { error: updateError } = await supabase
        .from("program_days")
        .update({ scheduled_date })
        .eq("id", day.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }),
  );
}

export async function syncBlockDayScheduledDates(
  block: ProgramBlock,
  weeks: ProgramWeek[],
) {
  const orderedWeeks = sortBlockWeeks(weeks);
  for (const week of orderedWeeks) {
    await syncWeekDayScheduledDates(block, week, orderedWeeks);
  }
}

export async function moveProgramWeekBetweenBlocks(
  input: MoveProgramWeekInput,
): Promise<{
  weeksByBlock: Record<string, ProgramWeek[]> | null;
  error: string | null;
}> {
  const nextWeeksByBlock = buildWeeksByBlockAfterMove(input);

  if (!nextWeeksByBlock) {
    return { weeksByBlock: null, error: "Week niet gevonden." };
  }

  const startDateUpdates = computeChainedBlockStartDates(
    input.navBlocks,
    nextWeeksByBlock,
  );

  const weekUpdates: ProgramWeek[] = [];
  for (const weeks of Object.values(nextWeeksByBlock)) {
    weekUpdates.push(...weeks);
  }

  for (const week of weekUpdates) {
    const { error } = await supabase
      .from("program_weeks")
      .update({
        program_block_id: week.program_block_id,
        week_number: week.week_number,
      })
      .eq("id", week.id);

    if (error) {
      return { weeksByBlock: null, error: error.message };
    }
  }

  for (const [blockId, startDate] of startDateUpdates.entries()) {
    const { error } = await supabase
      .from("program_blocks")
      .update({ start_date: startDate })
      .eq("id", blockId);

    if (error) {
      return { weeksByBlock: null, error: error.message };
    }
  }

  const blocksNeedingDaySync = new Set<string>([
    input.sourceBlockId,
    input.targetBlockId,
    ...startDateUpdates.keys(),
  ]);

  try {
    for (const blockId of blocksNeedingDaySync) {
      const block = blockWithStartDate(
        input.navBlocks,
        blockId,
        startDateUpdates,
      );
      if (!block) continue;

      const blockWeeks = sortBlockWeeks(nextWeeksByBlock[blockId] || []);
      for (const week of blockWeeks) {
        await syncWeekDayScheduledDates(block, week, blockWeeks);
      }
    }
  } catch (error) {
    return {
      weeksByBlock: null,
      error: error instanceof Error ? error.message : "Datums sync mislukt.",
    };
  }

  return { weeksByBlock: nextWeeksByBlock, error: null };
}

export function resolveWeekDropIndex(
  blockWeeks: ProgramWeek[],
  indicator: WeekDropIndicator,
) {
  if (indicator.targetWeekId === null) {
    return blockWeeks.length;
  }

  const targetIndex = blockWeeks.findIndex(
    (week) => week.id === indicator.targetWeekId,
  );

  if (targetIndex === -1) {
    return blockWeeks.length;
  }

  return indicator.position === "after" ? targetIndex + 1 : targetIndex;
}
