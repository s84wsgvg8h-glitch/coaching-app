import { supabase } from "@/lib/supabaseClient";

export type DailyBwPoint = {
  date: string;
  value: number;
  label: string;
  dayTitle: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
};

export type BwWeekOption = {
  id: string;
  blockId: string;
  weekId: string;
  blockTitle: string;
  weekTitle: string;
  weekNumber: number;
  firstFilledDate: string;
  lastFilledDate: string;
};

function parseNumber(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function addDays(dateString: string | null, days: number) {
  if (!dateString) return null;

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;

  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
}

export function formatShortDate(dateString: string | null) {
  if (!dateString) return "";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export function formatBwNumber(value: number | null) {
  if (value === null) return "-";

  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(".", ",");
}

export function buildBwWeekOptions(points: DailyBwPoint[]): BwWeekOption[] {
  const grouped = new Map<string, DailyBwPoint[]>();

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

export function filterBwPointsByDateRange(
  points: DailyBwPoint[],
  startDate: string,
  endDate: string,
) {
  return points.filter((point) => {
    if (startDate && point.date < startDate) return false;
    if (endDate && point.date > endDate) return false;
    return true;
  });
}

export async function loadAthleteDailyBwData(athleteId: string) {
  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    throw new Error(blocksError.message);
  }

  if (!blocks?.length) {
    return [] as DailyBwPoint[];
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
    return [] as DailyBwPoint[];
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
    return [] as DailyBwPoint[];
  }

  const dayById = Object.fromEntries(days.map((day) => [day.id, day]));
  const dayIds = days.map((day) => day.id);

  const { data: checkins, error: checkinsError } = await supabase
    .from("athlete_day_checkins")
    .select("program_day_id, athlete_id, bw")
    .eq("athlete_id", athleteId)
    .in("program_day_id", dayIds);

  if (checkinsError) {
    throw new Error(checkinsError.message);
  }

  const points: DailyBwPoint[] = [];

  for (const checkin of checkins || []) {
    const bw = parseNumber(checkin.bw);
    if (bw === null) continue;

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
      value: bw,
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
