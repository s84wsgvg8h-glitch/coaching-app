import { supabase } from "@/lib/supabaseClient";
import {
  addDays,
  formatShortDate,
  type BwWeekOption,
} from "@/lib/chatBwData";

export type ExternalMetric = "recovery" | "fatigue";

export type DailyExternalPoint = {
  date: string;
  recovery: number | null;
  fatigue: number | null;
  label: string;
  dayTitle: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
};

export function formatExternalMetricLabel(metric: ExternalMetric) {
  return metric === "recovery" ? "Herstel" : "Fatigue";
}

export function formatExternalNumber(value: number | null) {
  if (value === null) return "-";
  return String(value);
}

export function formatExternalWeekOptionLabel(week: BwWeekOption) {
  const start = formatShortDate(week.firstFilledDate);
  const end = formatShortDate(week.lastFilledDate);
  const dateRange = start === end ? start : `${start} – ${end}`;

  return `${week.blockTitle} · ${week.weekTitle} (${dateRange})`;
}

export function buildExternalWeekOptions(
  points: DailyExternalPoint[],
): BwWeekOption[] {
  const grouped = new Map<string, DailyExternalPoint[]>();

  for (const point of points) {
    const key = `${point.blockId}:${point.weekId}`;
    const existing = grouped.get(key) || [];
    existing.push(point);
    grouped.set(key, existing);
  }

  return Array.from(grouped.entries())
    .map(([id, weekPoints]) => {
      const sorted = [...weekPoints].sort((a, b) => a.date.localeCompare(b.date));
      const first = sorted[0];

      return {
        id,
        blockId: first.blockId,
        weekId: first.weekId,
        blockTitle: first.blockTitle,
        weekTitle: first.weekTitle,
        weekNumber: first.weekNumber,
        firstFilledDate: sorted[0].date,
        lastFilledDate: sorted[sorted.length - 1].date,
      };
    })
    .sort((a, b) => {
      const blockCompare = a.blockTitle.localeCompare(b.blockTitle);
      if (blockCompare !== 0) return blockCompare;
      return a.weekNumber - b.weekNumber;
    });
}

export function filterExternalPointsByDateRange(
  points: DailyExternalPoint[],
  startDate: string,
  endDate: string,
) {
  return points.filter((point) => {
    if (startDate && point.date < startDate) return false;
    if (endDate && point.date > endDate) return false;
    return true;
  });
}

export function findExternalWeekOption(
  weekOptions: BwWeekOption[],
  weekId: string,
) {
  return weekOptions.find((option) => option.id === weekId);
}

export function resolveExternalDateRangeFromWeeks(
  weekOptions: BwWeekOption[],
  beginWeekId: string,
  endWeekId: string,
  allStartDate: string,
  allEndDate: string,
) {
  if (!beginWeekId && !endWeekId) {
    return { startDate: allStartDate, endDate: allEndDate };
  }

  const beginWeek = beginWeekId
    ? findExternalWeekOption(weekOptions, beginWeekId)
    : undefined;
  const endWeek = endWeekId
    ? findExternalWeekOption(weekOptions, endWeekId)
    : undefined;

  let startDate = beginWeek?.firstFilledDate || allStartDate;
  let endDate = endWeek?.lastFilledDate || allEndDate;

  if (beginWeek && endWeek) {
    const beginIndex = weekOptions.findIndex((option) => option.id === beginWeek.id);
    const endIndex = weekOptions.findIndex((option) => option.id === endWeek.id);

    if (beginIndex > endIndex) {
      startDate = endWeek.firstFilledDate;
      endDate = beginWeek.lastFilledDate;
    }
  }

  if (startDate > endDate) {
    if (beginWeek && !endWeek) {
      endDate = beginWeek.lastFilledDate;
    } else if (endWeek && !beginWeek) {
      startDate = endWeek.firstFilledDate;
    }
  }

  return { startDate, endDate };
}

export function getExternalMetricValue(
  point: DailyExternalPoint,
  metric: ExternalMetric,
) {
  return metric === "recovery" ? point.recovery : point.fatigue;
}

export async function loadAthleteDailyExternalData(athleteId: string) {
  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    throw new Error(blocksError.message);
  }

  if (!blocks?.length) {
    return [] as DailyExternalPoint[];
  }

  const blockById = Object.fromEntries(blocks.map((block) => [block.id, block]));
  const blockIds = blocks.map((block) => block.id);

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id, title, week_number, program_block_id")
    .in("program_block_id", blockIds)
    .order("week_number", { ascending: true });

  if (weeksError) {
    throw new Error(weeksError.message);
  }

  if (!weeks?.length) {
    return [] as DailyExternalPoint[];
  }

  const weekById = Object.fromEntries(weeks.map((week) => [week.id, week]));
  const weekIds = weeks.map((week) => week.id);

  const { data: days, error: daysError } = await supabase
    .from("program_days")
    .select("id, title, day_number, program_week_id")
    .in("program_week_id", weekIds)
    .order("day_number", { ascending: true });

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (!days?.length) {
    return [] as DailyExternalPoint[];
  }

  const dayById = Object.fromEntries(days.map((day) => [day.id, day]));
  const dayIds = days.map((day) => day.id);

  const { data: checkins, error: checkinsError } = await supabase
    .from("athlete_day_checkins")
    .select("program_day_id, athlete_id, recovery, fatigue")
    .eq("athlete_id", athleteId)
    .in("program_day_id", dayIds);

  if (checkinsError) {
    throw new Error(checkinsError.message);
  }

  const points: DailyExternalPoint[] = [];

  for (const checkin of checkins || []) {
    const recovery =
      checkin.recovery !== null && checkin.recovery !== undefined
        ? checkin.recovery
        : null;
    const fatigue =
      checkin.fatigue !== null && checkin.fatigue !== undefined
        ? checkin.fatigue
        : null;

    if (recovery === null && fatigue === null) continue;

    const day = dayById[checkin.program_day_id];
    if (!day) continue;

    const week = weekById[day.program_week_id];
    if (!week) continue;

    const block = blockById[week.program_block_id];
    if (!block?.start_date) continue;

    const date = addDays(
      block.start_date,
      (week.week_number - 1) * 7 + (day.day_number - 1),
    );

    if (!date) continue;

    points.push({
      date,
      recovery,
      fatigue,
      label: `${block.title || "Block"} · ${week.title || `Week ${week.week_number}`} · ${day.title}`,
      dayTitle: day.title,
      blockId: block.id,
      blockTitle: block.title || "Block",
      weekId: week.id,
      weekTitle: week.title || `Week ${week.week_number}`,
      weekNumber: week.week_number,
    });
  }

  return points.sort((a, b) => a.date.localeCompare(b.date));
}
