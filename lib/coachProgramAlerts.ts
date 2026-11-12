import { supabase } from "@/lib/supabaseClient";
import { parseWeekdayFromDayTitle } from "@/lib/programWeek/weekdayFromTitle";

export type AthleteProgramAlert = {
  athleteId: string;
  athleteName: string;
  blockId: string;
  blockTitle: string;
  endDate: string;
  daysPastEnd: number;
};

function toDateOnly(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getBlockEndDate(startDate: string, weekCount: number) {
  const start = toDateOnly(startDate);
  if (!start || weekCount <= 0) return null;

  const end = new Date(start);
  end.setDate(end.getDate() + weekCount * 7 - 1);
  return end;
}

export async function loadAthletesNeedingNewProgram(
  coachId: string,
  isAdmin = false,
): Promise<AthleteProgramAlert[]> {
  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  if (!isAdmin) {
    athletesQuery = athletesQuery.eq("coach_id", coachId);
  }

  const { data: athletes, error: athletesError } = await athletesQuery;
  if (athletesError || !athletes?.length) return [];

  const athleteIds = athletes.map((athlete) => athlete.id);

  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, title, start_date")
    .in("athlete_id", athleteIds)
    .order("start_date", { ascending: true });

  if (blocksError || !blocks?.length) return [];

  const blockIds = blocks.map((block) => block.id);
  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id, program_block_id")
    .in("program_block_id", blockIds);

  if (weeksError) return [];

  const weekCountByBlock = new Map<string, number>();
  for (const week of weeks || []) {
    weekCountByBlock.set(
      week.program_block_id,
      (weekCountByBlock.get(week.program_block_id) || 0) + 1,
    );
  }

  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const alerts: AthleteProgramAlert[] = [];

  for (const athlete of athletes) {
    const athleteBlocks = (blocks || []).filter(
      (block) => block.athlete_id === athlete.id,
    );
    if (athleteBlocks.length === 0) continue;

    const currentBlock =
      [...athleteBlocks]
        .reverse()
        .find((block) => {
          const start = toDateOnly(block.start_date);
          return start ? start <= today : false;
        }) || athleteBlocks[athleteBlocks.length - 1];

    const weekCount = weekCountByBlock.get(currentBlock.id) || 0;
    const endDate = getBlockEndDate(currentBlock.start_date, weekCount);
    if (!endDate || endDate >= today) continue;

    const daysPastEnd = Math.floor(
      (today.getTime() - endDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    alerts.push({
      athleteId: athlete.id,
      athleteName: athlete.full_name || "Naamloos",
      blockId: currentBlock.id,
      blockTitle: currentBlock.title || "Block",
      endDate: endDate.toISOString().slice(0, 10),
      daysPastEnd,
    });
  }

  return alerts.sort((a, b) => b.daysPastEnd - a.daysPastEnd);
}

export function programAlertAutoKey(athleteId: string, blockId: string) {
  return `program:${athleteId}:${blockId}`;
}

export type NextWeekProgramNeed = {
  athleteId: string;
  athleteName: string;
  reason: "ending_this_week" | "missing_this_week";
  blockId: string | null;
  blockTitle: string | null;
  endDate: string | null;
  /** Days until due (negative = overdue). */
  daysUntilDue: number;
  dueLabel: string;
  dueTone: "upcoming" | "today" | "overdue";
};

const DUTCH_WEEKDAY_LABELS = [
  "zondag",
  "maandag",
  "dinsdag",
  "woensdag",
  "donderdag",
  "vrijdag",
  "zaterdag",
] as const;

function dateOnlyAtNoon(date: Date) {
  const value = new Date(date);
  value.setHours(12, 0, 0, 0);
  return value;
}

/** Next calendar date with weekday `weekday` on/after `from` (0=Sun … 6=Sat). */
function onOrAfterWeekday(from: Date, weekday: number) {
  const value = dateOnlyAtNoon(from);
  const diff = (weekday - value.getDay() + 7) % 7;
  value.setDate(value.getDate() + diff);
  return value;
}

function dueMeta(dueDate: Date, today: Date) {
  const daysUntilDue = Math.round(
    (dateOnlyAtNoon(dueDate).getTime() - dateOnlyAtNoon(today).getTime()) /
      (1000 * 60 * 60 * 24),
  );

  if (daysUntilDue > 0) {
    return {
      daysUntilDue,
      dueLabel: DUTCH_WEEKDAY_LABELS[dueDate.getDay()] || "weekstart",
      dueTone: "upcoming" as const,
    };
  }
  if (daysUntilDue === 0) {
    return {
      daysUntilDue,
      dueLabel: "vandaag",
      dueTone: "today" as const,
    };
  }
  return {
    daysUntilDue,
    dueLabel: `${Math.abs(daysUntilDue)}d`,
    dueTone: "overdue" as const,
  };
}

function weekStartWeekdayFromBlockStart(startDate: string | null) {
  const start = startDate ? toDateOnly(startDate) : null;
  return start ? start.getDay() : 1;
}

function weekdayFromFirstDay(day: {
  title?: string | null;
  scheduled_date?: string | null;
} | null) {
  if (!day) return null;
  const fromTitle = parseWeekdayFromDayTitle(day.title);
  if (fromTitle !== null) return fromTitle;
  if (day.scheduled_date) {
    const scheduled = toDateOnly(day.scheduled_date);
    if (scheduled) return scheduled.getDay();
  }
  return null;
}

function startOfWeekMonday(date: Date) {
  const value = new Date(date);
  value.setHours(12, 0, 0, 0);
  const day = value.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  value.setDate(value.getDate() + diff);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function blockRange(
  startDate: string | null,
  weekCount: number,
): { start: Date; end: Date } | null {
  if (!startDate || weekCount <= 0) return null;
  const start = toDateOnly(startDate);
  const end = getBlockEndDate(startDate, weekCount);
  if (!start || !end) return null;
  return { start, end };
}

function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return aStart <= bEnd && aEnd >= bStart;
}

type BlockRow = {
  id: string;
  athlete_id: string;
  title: string | null;
  start_date: string | null;
};

/** Athletes who need a new program for next week: block ends this week, or no block/week this week. */
export async function loadAthletesNeedingProgramNextWeek(
  coachId: string,
  isAdmin = false,
): Promise<NextWeekProgramNeed[]> {
  // Keep athletes + blocks as separate queries: program_blocks has no FK to
  // profiles, so a nested select fails and would incorrectly return [].
  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  if (!isAdmin) {
    athletesQuery = athletesQuery.eq("coach_id", coachId);
  }

  const { data: athletes, error: athletesError } = await athletesQuery;
  if (athletesError || !athletes?.length) return [];

  const athleteIds = athletes.map((athlete) => athlete.id);

  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, title, start_date")
    .in("athlete_id", athleteIds)
    .order("start_date", { ascending: true });

  if (blocksError) return [];

  const allBlocks = (blocks || []) as BlockRow[];
  const blocksByAthlete = new Map<string, BlockRow[]>();

  for (const block of allBlocks) {
    const list = blocksByAthlete.get(block.athlete_id);
    if (list) list.push(block);
    else blocksByAthlete.set(block.athlete_id, [block]);
  }

  const blockIds = allBlocks.map((block) => block.id);
  const weekCountByBlock = new Map<string, number>();
  const latestWeekByBlock = new Map<string, string>();
  const weekdayByAthlete = new Map<string, number>();

  if (blockIds.length > 0) {
    // One week-count query + one first-day query in parallel where possible.
    const weeksPromise = supabase
      .from("program_weeks")
      .select("id, program_block_id, created_at")
      .in("program_block_id", blockIds)
      .order("created_at", { ascending: false });

    const { data: weeks, error: weeksError } = await weeksPromise;
    if (weeksError) return [];

    for (const week of weeks || []) {
      weekCountByBlock.set(
        week.program_block_id,
        (weekCountByBlock.get(week.program_block_id) || 0) + 1,
      );
      if (!latestWeekByBlock.has(week.program_block_id)) {
        latestWeekByBlock.set(week.program_block_id, week.id);
      }
    }

    // Only resolve first-day weekday from each athlete's latest block.
    const sampleWeekIds: string[] = [];
    const sampleWeekToAthlete = new Map<string, string>();
    for (const athlete of athletes) {
      const athleteBlocks = blocksByAthlete.get(athlete.id) || [];
      const latestBlock = athleteBlocks[athleteBlocks.length - 1];
      if (!latestBlock) continue;
      const weekId = latestWeekByBlock.get(latestBlock.id);
      if (!weekId) continue;
      sampleWeekIds.push(weekId);
      sampleWeekToAthlete.set(weekId, athlete.id);
    }

    if (sampleWeekIds.length > 0) {
      const { data: firstDays } = await supabase
        .from("program_days")
        .select("program_week_id, title, scheduled_date")
        .in("program_week_id", sampleWeekIds)
        .eq("day_number", 1);

      for (const day of firstDays || []) {
        const athleteId = sampleWeekToAthlete.get(day.program_week_id);
        if (!athleteId || weekdayByAthlete.has(athleteId)) continue;
        const weekday = weekdayFromFirstDay(day);
        if (weekday !== null) weekdayByAthlete.set(athleteId, weekday);
      }
    }
  }

  const today = dateOnlyAtNoon(new Date());
  const thisWeekStart = startOfWeekMonday(today);
  const thisWeekEnd = addDays(thisWeekStart, 6);
  const nextWeekStart = addDays(thisWeekStart, 7);
  const nextWeekEnd = addDays(thisWeekEnd, 7);

  const needs: NextWeekProgramNeed[] = [];

  for (const athlete of athletes) {
    const athleteBlocks = blocksByAthlete.get(athlete.id) || [];

    let coversThisWeek = false;
    let coversNextWeek = false;
    let coveringBlockStart: string | null = null;
    let endingThisWeek:
      | {
          blockId: string;
          blockTitle: string;
          endDate: Date;
          startDate: string | null;
        }
      | null = null;

    for (const block of athleteBlocks) {
      const weekCount = Math.max(1, weekCountByBlock.get(block.id) || 0);
      const range = blockRange(block.start_date, weekCount);
      if (!range) continue;

      if (rangesOverlap(range.start, range.end, thisWeekStart, thisWeekEnd)) {
        coversThisWeek = true;
        coveringBlockStart = block.start_date;
      }
      if (rangesOverlap(range.start, range.end, nextWeekStart, nextWeekEnd)) {
        coversNextWeek = true;
      }
      if (range.end >= thisWeekStart && range.end <= thisWeekEnd) {
        if (!endingThisWeek || range.end > endingThisWeek.endDate) {
          endingThisWeek = {
            blockId: block.id,
            blockTitle: block.title || "Block",
            endDate: range.end,
            startDate: block.start_date,
          };
        }
      }
    }

    const resolveWeekday = (startDate: string | null) =>
      weekdayByAthlete.get(athlete.id) ??
      weekStartWeekdayFromBlockStart(startDate);

    if (!coversThisWeek) {
      const referenceStart =
        coveringBlockStart ||
        endingThisWeek?.startDate ||
        athleteBlocks[athleteBlocks.length - 1]?.start_date ||
        null;
      const weekday = resolveWeekday(referenceStart);
      const dueDate = onOrAfterWeekday(thisWeekStart, weekday);
      const dueThisWeek =
        dueDate > thisWeekEnd ? addDays(dueDate, -7) : dueDate;
      const meta = dueMeta(dueThisWeek, today);
      needs.push({
        athleteId: athlete.id,
        athleteName: athlete.full_name || "Naamloos",
        reason: "missing_this_week",
        blockId: null,
        blockTitle: null,
        endDate: null,
        ...meta,
      });
      continue;
    }

    if (endingThisWeek && !coversNextWeek) {
      const weekday = resolveWeekday(endingThisWeek.startDate);
      const dueDate = onOrAfterWeekday(nextWeekStart, weekday);
      const meta = dueMeta(dueDate, today);
      needs.push({
        athleteId: athlete.id,
        athleteName: athlete.full_name || "Naamloos",
        reason: "ending_this_week",
        blockId: endingThisWeek.blockId,
        blockTitle: endingThisWeek.blockTitle,
        endDate: endingThisWeek.endDate.toISOString().slice(0, 10),
        ...meta,
      });
    }
  }

  return needs.sort((a, b) => {
    if (a.daysUntilDue !== b.daysUntilDue) {
      return a.daysUntilDue - b.daysUntilDue;
    }
    return a.athleteName.localeCompare(b.athleteName, "nl");
  });
}
