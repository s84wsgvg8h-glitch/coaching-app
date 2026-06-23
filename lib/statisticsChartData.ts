import {
  addDays,
  formatShortDate,
  type BwWeekOption,
} from "@/lib/chatBwData";
import {
  classifySbdLift,
  formatLiftLabel,
  type SbdLift,
  type WeeklyVolumeRow,
} from "@/lib/chatVolumeData";
import { estimateE1rmFromSet } from "@/lib/exercisePrescription";

export type StatisticsSetRow = {
  athleteId: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
  weekKey: string;
  weekStartDate: string;
  date: string;
  exerciseName: string;
  reps: number | null;
  weight: number | null;
  rpe: number | null;
  e1rm: number | null;
  sbdLift: SbdLift | null;
  intensityPct: number | null;
};

export type StatisticsBwRow = {
  athleteId: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
  weekKey: string;
  weekStartDate: string;
  date: string;
  bw: number;
};

export type StatisticsFatigueRow = {
  athleteId: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
  weekKey: string;
  weekStartDate: string;
  date: string;
  fatigue: number;
};

export type StatisticsRecoveryRow = {
  athleteId: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
  weekKey: string;
  weekStartDate: string;
  date: string;
  recovery: number;
};

export type DateRange = {
  startDate: string;
  endDate: string;
};

export type WeekChartPoint = {
  label: string;
  weekLabel: string;
  weekKey: string;
  shortBlockLabel: string;
  blockId: string;
  weekNumber: number;
  blockTitle: string;
  weekStartDate: string;
  date: string;
};

export type CombinedE1rmPoint = WeekChartPoint & {
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
};

export type SingleValuePoint = WeekChartPoint & {
  value: number | null;
};

export type IntensityPoint = WeekChartPoint & {
  rpe: number | null;
  intensityPct: number | null;
};

function parseNumber(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value
    .replace(",", ".")
    .replace("kg", "")
    .replace("KG", "")
    .trim();

  if (!normalized || normalized.includes("%")) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRpe(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value.replace(",", ".").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 10) return null;

  return Math.round(parsed * 10) / 10;
}

function roundMetric(value: number) {
  return Math.round(value * 10) / 10;
}

function average(values: number[]) {
  if (values.length === 0) return null;
  return roundMetric(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function applyReferenceMaxesToRows(
  rows: StatisticsSetRow[],
  maxes: Record<SbdLift, number | null>,
): StatisticsSetRow[] {
  return rows.map((row) => {
    if (!row.sbdLift || row.weight === null || row.weight <= 0) {
      return row;
    }

    const referenceOneRm = maxes[row.sbdLift];
    let intensityPct: number | null = null;

    if (referenceOneRm && referenceOneRm > 0) {
      intensityPct = roundMetric((row.weight / referenceOneRm) * 100);
    } else if (row.reps !== null && row.reps > 0) {
      const estimated = row.weight * (1 + row.reps / 30);
      intensityPct = roundMetric((row.weight / estimated) * 100);
    }

    return { ...row, intensityPct };
  });
}

export function buildStatisticsSetRows(input: {
  sets: Array<{
    program_exercise_id: string;
    athlete_id: string;
    reps: string | null;
    weight: string | null;
    rpe: string | null;
  }>;
  exerciseById: Record<
    string,
    { id: string; program_day_id: string; name: string | null }
  >;
  dayById: Record<string, { id: string; program_week_id: string; day_number: number }>;
  weekById: Record<
    string,
    { id: string; program_block_id: string; title: string | null; week_number: number }
  >;
  blockById: Record<
    string,
    { id: string; athlete_id: string | null; title: string | null; start_date: string | null }
  >;
  referenceMaxes: Record<SbdLift, number | null>;
}): StatisticsSetRow[] {
  const rows: StatisticsSetRow[] = [];

  for (const setRow of input.sets) {
    const exercise = input.exerciseById[setRow.program_exercise_id];
    if (!exercise) continue;

    const day = input.dayById[exercise.program_day_id];
    const week = day ? input.weekById[day.program_week_id] : null;
    const block = week ? input.blockById[week.program_block_id] : null;

    if (!day || !week || !block?.athlete_id || !block.start_date) continue;
    if (setRow.athlete_id !== block.athlete_id) continue;

    const date = addDays(
      block.start_date,
      (week.week_number - 1) * 7 + (day.day_number - 1),
    );
    if (!date) continue;

    const weekStartDate =
      addDays(block.start_date, (week.week_number - 1) * 7) || date;

    const reps = parseNumber(setRow.reps);
    const weight = parseNumber(setRow.weight);
    const rpe = parseRpe(setRow.rpe);
    const sbdLift = classifySbdLift(exercise.name || "");
    const e1rm =
      reps !== null && weight !== null
        ? estimateE1rmFromSet(weight, reps)
        : null;

    let intensityPct: number | null = null;
    if (weight !== null && weight > 0) {
      const referenceOneRm = sbdLift ? input.referenceMaxes[sbdLift] : null;
      if (referenceOneRm && referenceOneRm > 0) {
        intensityPct = roundMetric((weight / referenceOneRm) * 100);
      } else if (reps !== null && reps > 0) {
        const estimated = weight * (1 + reps / 30);
        intensityPct = roundMetric((weight / estimated) * 100);
      }
    }

    rows.push({
      athleteId: block.athlete_id,
      blockId: block.id,
      blockTitle: block.title || "Block",
      weekId: week.id,
      weekTitle: week.title || `Week ${week.week_number}`,
      weekNumber: week.week_number,
      weekKey: `${block.id}:${week.id}`,
      weekStartDate,
      date,
      exerciseName: exercise.name || "Oefening",
      reps,
      weight,
      rpe,
      e1rm,
      sbdLift,
      intensityPct,
    });
  }

  return rows;
}

export function buildStatisticsBwRows(input: {
  checkins: Array<{
    program_day_id: string;
    athlete_id: string;
    bw: string | null;
  }>;
  dayById: Record<string, { id: string; program_week_id: string; day_number: number }>;
  weekById: Record<
    string,
    { id: string; program_block_id: string; title: string | null; week_number: number }
  >;
  blockById: Record<
    string,
    { id: string; athlete_id: string | null; title: string | null; start_date: string | null }
  >;
}): StatisticsBwRow[] {
  const rows: StatisticsBwRow[] = [];

  for (const checkin of input.checkins) {
    const day = input.dayById[checkin.program_day_id];
    const week = day ? input.weekById[day.program_week_id] : null;
    const block = week ? input.blockById[week.program_block_id] : null;
    const bw = parseNumber(checkin.bw);

    if (!day || !week || !block?.athlete_id || !block.start_date || bw === null) {
      continue;
    }

    if (checkin.athlete_id !== block.athlete_id) continue;

    const date = addDays(
      block.start_date,
      (week.week_number - 1) * 7 + (day.day_number - 1),
    );
    if (!date) continue;

    const weekStartDate =
      addDays(block.start_date, (week.week_number - 1) * 7) || date;

    rows.push({
      athleteId: block.athlete_id,
      blockId: block.id,
      blockTitle: block.title || "Block",
      weekId: week.id,
      weekTitle: week.title || `Week ${week.week_number}`,
      weekNumber: week.week_number,
      weekKey: `${block.id}:${week.id}`,
      weekStartDate,
      date,
      bw,
    });
  }

  return rows;
}

export function buildStatisticsFatigueRows(input: {
  checkins: Array<{
    program_day_id: string;
    athlete_id: string;
    fatigue: number | null;
  }>;
  dayById: Record<string, { id: string; program_week_id: string; day_number: number }>;
  weekById: Record<
    string,
    { id: string; program_block_id: string; title: string | null; week_number: number }
  >;
  blockById: Record<
    string,
    { id: string; athlete_id: string | null; title: string | null; start_date: string | null }
  >;
}): StatisticsFatigueRow[] {
  const rows: StatisticsFatigueRow[] = [];

  for (const checkin of input.checkins) {
    const day = input.dayById[checkin.program_day_id];
    const week = day ? input.weekById[day.program_week_id] : null;
    const block = week ? input.blockById[week.program_block_id] : null;

    if (
      !day ||
      !week ||
      !block?.athlete_id ||
      !block.start_date ||
      checkin.fatigue === null
    ) {
      continue;
    }

    if (checkin.athlete_id !== block.athlete_id) continue;

    const date = addDays(
      block.start_date,
      (week.week_number - 1) * 7 + (day.day_number - 1),
    );
    if (!date) continue;

    const weekStartDate =
      addDays(block.start_date, (week.week_number - 1) * 7) || date;

    rows.push({
      athleteId: block.athlete_id,
      blockId: block.id,
      blockTitle: block.title || "Block",
      weekId: week.id,
      weekTitle: week.title || `Week ${week.week_number}`,
      weekNumber: week.week_number,
      weekKey: `${block.id}:${week.id}`,
      weekStartDate,
      date,
      fatigue: checkin.fatigue,
    });
  }

  return rows;
}

export function buildStatisticsRecoveryRows(input: {
  checkins: Array<{
    program_day_id: string;
    athlete_id: string;
    recovery: number | null;
  }>;
  dayById: Record<string, { id: string; program_week_id: string; day_number: number }>;
  weekById: Record<
    string,
    { id: string; program_block_id: string; title: string | null; week_number: number }
  >;
  blockById: Record<
    string,
    { id: string; athlete_id: string | null; title: string | null; start_date: string | null }
  >;
}): StatisticsRecoveryRow[] {
  const rows: StatisticsRecoveryRow[] = [];

  for (const checkin of input.checkins) {
    const day = input.dayById[checkin.program_day_id];
    const week = day ? input.weekById[day.program_week_id] : null;
    const block = week ? input.blockById[week.program_block_id] : null;

    if (
      !day ||
      !week ||
      !block?.athlete_id ||
      !block.start_date ||
      checkin.recovery === null
    ) {
      continue;
    }

    if (checkin.athlete_id !== block.athlete_id) continue;

    const date = addDays(
      block.start_date,
      (week.week_number - 1) * 7 + (day.day_number - 1),
    );
    if (!date) continue;

    const weekStartDate =
      addDays(block.start_date, (week.week_number - 1) * 7) || date;

    rows.push({
      athleteId: block.athlete_id,
      blockId: block.id,
      blockTitle: block.title || "Block",
      weekId: week.id,
      weekTitle: week.title || `Week ${week.week_number}`,
      weekNumber: week.week_number,
      weekKey: `${block.id}:${week.id}`,
      weekStartDate,
      date,
      recovery: checkin.recovery,
    });
  }

  return rows;
}

export function buildCheckinWeeklyChart<
  T extends {
    athleteId: string;
    blockId: string;
    blockTitle: string;
    weekId: string;
    weekTitle: string;
    weekNumber: number;
    weekKey: string;
    weekStartDate: string;
    date: string;
  },
>(
  rows: T[],
  getValue: (row: T) => number,
  mode: import("@/lib/statisticsE1rm").E1rmChartMode,
  range: DateRange = EMPTY_DATE_RANGE,
): SingleValuePoint[] {
  const filtered = filterRowsByDateRange(rows, range);

  if (mode === "raw") {
    return sortWeekPoints(
      filtered.map((row) =>
        finalizeWeekPoint({
          weekNumber: row.weekNumber,
          blockTitle: row.blockTitle,
          blockId: row.blockId,
          weekKey: row.weekKey,
          weekStartDate: row.weekStartDate,
          date: row.date,
          value: getValue(row),
        }),
      ),
    );
  }

  const grouped = new Map<
    string,
    {
      weekKey: string;
      weekNumber: number;
      blockTitle: string;
      blockId: string;
      weekStartDate: string;
      date: string;
      values: number[];
    }
  >();

  for (const row of filtered) {
    const existing =
      grouped.get(row.weekKey) ||
      {
        weekKey: row.weekKey,
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        values: [],
      };

    existing.values.push(getValue(row));
    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) => {
      const value =
        mode === "weekly_best"
          ? item.values.length > 0
            ? Math.max(...item.values)
            : null
          : item.values.length > 0
            ? roundMetric(
                item.values.reduce((sum, current) => sum + current, 0) /
                  item.values.length,
              )
            : null;

      return finalizeWeekPoint({
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        blockId: item.blockId,
        weekKey: item.weekKey,
        weekStartDate: item.weekStartDate,
        date: item.date,
        value,
      });
    }),
  );
}

export function buildStatisticsWeekOptions(
  rows: Array<{ weekKey: string; blockId: string; weekId: string; blockTitle: string; weekTitle: string; weekNumber: number; date: string }>,
): BwWeekOption[] {
  const grouped = new Map<string, typeof rows>();

  for (const row of rows) {
    const existing = grouped.get(row.weekKey) || [];
    existing.push(row);
    grouped.set(row.weekKey, existing);
  }

  return Array.from(grouped.entries())
    .map(([id, weekRows]) => {
      const sorted = [...weekRows].sort((a, b) => a.date.localeCompare(b.date));
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

export function formatStatisticsWeekLabel(week: BwWeekOption) {
  const start = formatShortDate(week.firstFilledDate);
  const end = formatShortDate(week.lastFilledDate);
  const dateRange = start === end ? start : `${start} – ${end}`;
  return `${week.blockTitle} · ${week.weekTitle} (${dateRange})`;
}

export function findStatisticsWeekOption(weekOptions: BwWeekOption[], weekId: string) {
  return weekOptions.find((option) => option.id === weekId);
}

export function resolveStatisticsDateRange(
  weekOptions: BwWeekOption[],
  beginWeekId: string,
  endWeekId: string,
  allStartDate: string,
  allEndDate: string,
): DateRange {
  if (!beginWeekId && !endWeekId) {
    return { startDate: allStartDate, endDate: allEndDate };
  }

  const beginWeek = beginWeekId
    ? findStatisticsWeekOption(weekOptions, beginWeekId)
    : undefined;
  const endWeek = endWeekId
    ? findStatisticsWeekOption(weekOptions, endWeekId)
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

export function filterRowsByDateRange<T extends { date: string }>(
  rows: T[],
  range: DateRange,
) {
  return rows.filter((row) => {
    if (range.startDate && row.date < range.startDate) return false;
    if (range.endDate && row.date > range.endDate) return false;
    return true;
  });
}

export function filterRowsByBlock<T extends { blockId: string }>(
  rows: T[],
  blockId: string,
) {
  if (!blockId) return rows;
  return rows.filter((row) => row.blockId === blockId);
}

function sortWeekPoints<T extends { weekStartDate?: string; date: string; weekNumber: number }>(
  points: T[],
) {
  return [...points].sort((a, b) => {
    const aKey = a.weekStartDate || a.date;
    const bKey = b.weekStartDate || b.date;
    const dateCompare = aKey.localeCompare(bKey);
    if (dateCompare !== 0) return dateCompare;
    return a.weekNumber - b.weekNumber;
  });
}

export function formatChartAxisDate(dateString: string) {
  if (!dateString) return "";

  const [year, month, day] = dateString.split("-").map(Number);
  if (!year || !month || !day) return "";

  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return "";

  const monthLabel = date
    .toLocaleDateString("nl-NL", { month: "short" })
    .replace(/\./g, "")
    .trim();

  return `${date.getDate()} ${monthLabel}`;
}

function formatShortBlockLabel(blockTitle: string) {
  const match = blockTitle.match(/^Block\s*\d+/i);
  if (match) {
    return match[0].replace(/\s+/g, " ");
  }

  const beforeDash = blockTitle.split("—")[0]?.trim();
  return beforeDash || blockTitle;
}

function finalizeWeekPoint<T extends {
  weekNumber: number;
  blockTitle: string;
  blockId: string;
  weekStartDate?: string;
  date: string;
  label?: string;
  weekKey?: string;
}>(item: T): T & WeekChartPoint {
  const weekStartDate = item.weekStartDate || item.date;

  return {
    ...item,
    weekStartDate,
    label: item.label || weekLabel(item.blockTitle, item.weekNumber),
    weekLabel: `W${item.weekNumber}`,
    weekKey: item.weekKey || `${item.blockId}:W${item.weekNumber}`,
    shortBlockLabel: formatShortBlockLabel(item.blockTitle),
  };
}

function weekLabel(blockTitle: string, weekNumber: number) {
  return `${formatShortBlockLabel(blockTitle)} · Week ${weekNumber}`;
}

export function buildCombinedE1rmChart(
  rows: StatisticsSetRow[],
  range: DateRange,
): CombinedE1rmPoint[] {
  const filtered = filterRowsByDateRange(rows, range);
  const grouped = new Map<
    string,
      {
        weekNumber: number;
        blockTitle: string;
        blockId: string;
        weekStartDate: string;
        date: string;
        squatValues: number[];
        benchValues: number[];
        deadliftValues: number[];
      }
  >();

  for (const row of filtered) {
    if (row.e1rm === null || !row.sbdLift) continue;

    const existing =
      grouped.get(row.weekKey) ||
      {
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        squatValues: [],
        benchValues: [],
        deadliftValues: [],
      };

    if (row.sbdLift === "squat") existing.squatValues.push(row.e1rm);
    if (row.sbdLift === "bench") existing.benchValues.push(row.e1rm);
    if (row.sbdLift === "deadlift") existing.deadliftValues.push(row.e1rm);

    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) =>
      finalizeWeekPoint({
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        blockId: item.blockId,
        weekStartDate: item.weekStartDate,
        date: item.date,
        squat:
          item.squatValues.length > 0 ? Math.max(...item.squatValues) : null,
        bench:
          item.benchValues.length > 0 ? Math.max(...item.benchValues) : null,
        deadlift:
          item.deadliftValues.length > 0 ? Math.max(...item.deadliftValues) : null,
      }),
    ),
  );
}

export const EMPTY_DATE_RANGE: DateRange = { startDate: "", endDate: "" };

export function buildLiftE1rmChart(
  rows: StatisticsSetRow[],
  lift: SbdLift,
  range: DateRange,
): SingleValuePoint[] {
  const filtered = filterRowsByDateRange(
    rows.filter((row) => row.sbdLift === lift && row.e1rm !== null),
    range,
  );

  const grouped = new Map<
    string,
    {
      weekNumber: number;
      blockTitle: string;
      blockId: string;
      weekStartDate: string;
      date: string;
      values: number[];
    }
  >();

  for (const row of filtered) {
    const existing =
      grouped.get(row.weekKey) ||
      {
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        values: [],
      };

    existing.values.push(row.e1rm as number);
    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) =>
      finalizeWeekPoint({
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        blockId: item.blockId,
        weekStartDate: item.weekStartDate,
        date: item.date,
        value: item.values.length > 0 ? Math.max(...item.values) : null,
      }),
    ),
  );
}

export function buildBwWeeklyChart(
  rows: StatisticsBwRow[],
  range: DateRange,
): SingleValuePoint[] {
  const filtered = filterRowsByDateRange(rows, range);
  const grouped = new Map<
    string,
    {
      weekNumber: number;
      blockTitle: string;
      blockId: string;
      weekStartDate: string;
      date: string;
      values: number[];
    }
  >();

  for (const row of filtered) {
    const existing =
      grouped.get(row.weekKey) ||
      {
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        values: [],
      };

    existing.values.push(row.bw);
    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) =>
      finalizeWeekPoint({
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        blockId: item.blockId,
        weekStartDate: item.weekStartDate,
        date: item.date,
        value:
          item.values.length > 0
            ? roundMetric(
                item.values.reduce((sum, value) => sum + value, 0) /
                  item.values.length,
              )
            : null,
      }),
    ),
  );
}

export function getProgramExerciseNames(rows: StatisticsSetRow[]) {
  return Array.from(new Set(rows.map((row) => row.exerciseName))).sort((a, b) =>
    a.localeCompare(b, "nl"),
  );
}

export function getAccessoryExerciseNames(rows: StatisticsSetRow[]) {
  const accessories = getProgramExerciseNames(rows).filter(
    (name) => classifySbdLift(name) === null,
  );
  return accessories.length > 0 ? accessories : getProgramExerciseNames(rows);
}

export function buildExerciseTonnageChart(
  rows: StatisticsSetRow[],
  exerciseName: string,
  range: DateRange,
): SingleValuePoint[] {
  const filtered = filterRowsByDateRange(
    rows.filter(
      (row) =>
        row.exerciseName === exerciseName &&
        row.weight !== null &&
        row.reps !== null,
    ),
    range,
  );

  const grouped = new Map<
    string,
    {
      weekNumber: number;
      blockTitle: string;
      blockId: string;
      weekStartDate: string;
      date: string;
      value: number;
    }
  >();

  for (const row of filtered) {
    const existing =
      grouped.get(row.weekKey) ||
      {
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        value: 0,
      };

    existing.value += (row.weight as number) * (row.reps as number);
    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) =>
      finalizeWeekPoint({
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        blockId: item.blockId,
        weekStartDate: item.weekStartDate,
        date: item.date,
        value: Math.round(item.value),
      }),
    ),
  );
}

export function buildExerciseVolumeChart(
  rows: StatisticsSetRow[],
  exerciseName: string,
  range: DateRange,
  type: "sets" | "reps",
): SingleValuePoint[] {
  const filtered = filterRowsByDateRange(
    rows.filter((row) => row.exerciseName === exerciseName),
    range,
  );

  const grouped = new Map<
    string,
    {
      weekNumber: number;
      blockTitle: string;
      blockId: string;
      weekStartDate: string;
      date: string;
      value: number;
    }
  >();

  for (const row of filtered) {
    const existing =
      grouped.get(row.weekKey) ||
      {
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        value: 0,
      };

    if (type === "sets") {
      existing.value += 1;
    } else if (row.reps !== null) {
      existing.value += row.reps;
    }

    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) =>
      finalizeWeekPoint({
        ...item,
        value: item.value,
      }),
    ),
  );
}

export function buildWeeklyIntensityChart(
  rows: StatisticsSetRow[],
  lift: SbdLift,
  range: DateRange,
  mode: "average" | "peak",
): IntensityPoint[] {
  const filtered = filterRowsByDateRange(
    rows.filter((row) => row.sbdLift === lift),
    range,
  );

  const grouped = new Map<
    string,
    {
      weekNumber: number;
      blockTitle: string;
      blockId: string;
      weekStartDate: string;
      date: string;
      rpes: number[];
      intensities: number[];
    }
  >();

  for (const row of filtered) {
    const existing =
      grouped.get(row.weekKey) ||
      {
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        rpes: [],
        intensities: [],
      };

    if (row.rpe !== null) existing.rpes.push(row.rpe);
    if (row.intensityPct !== null) existing.intensities.push(row.intensityPct);

    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) =>
      finalizeWeekPoint({
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        blockId: item.blockId,
        weekStartDate: item.weekStartDate,
        date: item.date,
        rpe:
          mode === "average"
            ? average(item.rpes)
            : item.rpes.length > 0
              ? Math.max(...item.rpes)
              : null,
        intensityPct:
          mode === "average"
            ? average(item.intensities)
            : item.intensities.length > 0
              ? Math.max(...item.intensities)
              : null,
      }),
    ),
  );
}

export function buildLoadProgressionChart(
  rows: StatisticsSetRow[],
  lift: SbdLift,
  range: DateRange,
): SingleValuePoint[] {
  const filtered = filterRowsByDateRange(
    rows.filter((row) => row.sbdLift === lift && row.weight !== null),
    range,
  );

  const grouped = new Map<
    string,
    {
      weekNumber: number;
      blockTitle: string;
      blockId: string;
      weekStartDate: string;
      date: string;
      values: number[];
    }
  >();

  for (const row of filtered) {
    const existing =
      grouped.get(row.weekKey) ||
      {
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        values: [],
      };

    if (row.weight !== null) existing.values.push(row.weight);
    grouped.set(row.weekKey, existing);
  }

  return sortWeekPoints(
    Array.from(grouped.values()).map((item) =>
      finalizeWeekPoint({
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        blockId: item.blockId,
        weekStartDate: item.weekStartDate,
        date: item.date,
        value: item.values.length > 0 ? Math.max(...item.values) : null,
      }),
    ),
  );
}

export function buildTonnageChart(
  volumeRows: WeeklyVolumeRow[],
  lift: SbdLift,
  range: DateRange,
): SingleValuePoint[] {
  const filtered = filterRowsByDateRange(volumeRows, range);

  return sortWeekPoints(
    filtered.map((row) =>
      finalizeWeekPoint({
        weekNumber: row.weekNumber,
        blockTitle: row.blockTitle,
        blockId: row.blockId,
        weekStartDate: row.weekStartDate,
        date: row.date,
        value: Math.round(row[lift].tonnage),
      }),
    ),
  );
}

export function getLiftFromChartId(
  chartId: string,
): SbdLift | null {
  if (chartId.includes("squat")) return "squat";
  if (chartId.includes("bench")) return "bench";
  if (chartId.includes("deadlift")) return "deadlift";
  return null;
}

export { formatLiftLabel, type SbdLift };
