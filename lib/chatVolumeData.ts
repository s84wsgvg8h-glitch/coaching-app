import { supabase } from "@/lib/supabaseClient";
import {
  addDays,
  formatShortDate,
  type BwWeekOption,
} from "@/lib/chatBwData";

export type SbdLift = "squat" | "bench" | "deadlift";

export type LiftVolume = {
  sets: number;
  reps: number;
  tonnage: number;
};

export type WeeklyVolumeRow = {
  id: string;
  date: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
  squat: LiftVolume;
  bench: LiftVolume;
  deadlift: LiftVolume;
};

const SBD_LIFTS: SbdLift[] = ["squat", "bench", "deadlift"];

export function formatLiftLabel(lift: SbdLift) {
  if (lift === "squat") return "Squat";
  if (lift === "bench") return "Bench";
  return "Deadlift";
}

export function formatVolumeWeekOptionLabel(week: BwWeekOption) {
  const start = formatShortDate(week.firstFilledDate);
  const end = formatShortDate(week.lastFilledDate);
  const dateRange = start === end ? start : `${start} – ${end}`;

  return `${week.blockTitle} · ${week.weekTitle} (${dateRange})`;
}

function parseNumber(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value.replace(",", ".").trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function emptyLiftVolume(): LiftVolume {
  return { sets: 0, reps: 0, tonnage: 0 };
}

export function classifySbdLift(exerciseName: string): SbdLift | null {
  const cleanName = exerciseName.toLowerCase();

  if (cleanName.includes("squat")) return "squat";
  if (cleanName.includes("bench")) return "bench";
  if (cleanName.includes("deadlift")) return "deadlift";

  return null;
}

export function buildVolumeWeekOptions(rows: WeeklyVolumeRow[]): BwWeekOption[] {
  const grouped = new Map<string, WeeklyVolumeRow[]>();

  for (const row of rows) {
    const existing = grouped.get(row.id) || [];
    existing.push(row);
    grouped.set(row.id, existing);
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

export function filterVolumeRowsByDateRange(
  rows: WeeklyVolumeRow[],
  startDate: string,
  endDate: string,
) {
  return rows.filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

export function findVolumeWeekOption(weekOptions: BwWeekOption[], weekId: string) {
  return weekOptions.find((option) => option.id === weekId);
}

export function resolveVolumeDateRangeFromWeeks(
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
    ? findVolumeWeekOption(weekOptions, beginWeekId)
    : undefined;
  const endWeek = endWeekId
    ? findVolumeWeekOption(weekOptions, endWeekId)
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

export function sumLiftVolume(rows: WeeklyVolumeRow[], lift: SbdLift): LiftVolume {
  return rows.reduce(
    (total, row) => ({
      sets: total.sets + row[lift].sets,
      reps: total.reps + row[lift].reps,
      tonnage: total.tonnage + row[lift].tonnage,
    }),
    emptyLiftVolume(),
  );
}

export function formatTonnage(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}t`;
  }
  return `${Math.round(value)}kg`;
}

export function buildTonnageChartData(rows: WeeklyVolumeRow[]) {
  return rows.map((row) => ({
    id: row.id,
    label: row.weekTitle,
    squat: row.squat.tonnage,
    bench: row.bench.tonnage,
    deadlift: row.deadlift.tonnage,
  }));
}

export function buildTonnageChartDataForLift(
  rows: WeeklyVolumeRow[],
  lift: SbdLift,
) {
  return rows.map((row) => ({
    id: row.id,
    label: row.weekTitle,
    value: row[lift].tonnage,
  }));
}

export function sumAllLiftVolume(rows: WeeklyVolumeRow[]) {
  return SBD_LIFTS.reduce(
    (totals, lift) => {
      totals[lift] = sumLiftVolume(rows, lift);
      return totals;
    },
    {} as Record<SbdLift, LiftVolume>,
  );
}

export async function loadAthleteSbdVolumeData(athleteId: string) {
  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    throw new Error(blocksError.message);
  }

  if (!blocks?.length) {
    return [] as WeeklyVolumeRow[];
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
    return [] as WeeklyVolumeRow[];
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
    return [] as WeeklyVolumeRow[];
  }

  const dayById = Object.fromEntries(days.map((day) => [day.id, day]));
  const dayIds = days.map((day) => day.id);

  const { data: exercises, error: exercisesError } = await supabase
    .from("program_exercises")
    .select("id, name, program_day_id, load, reps")
    .in("program_day_id", dayIds);

  if (exercisesError) {
    throw new Error(exercisesError.message);
  }

  if (!exercises?.length) {
    return [] as WeeklyVolumeRow[];
  }

  const exerciseById = Object.fromEntries(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const exerciseIds = exercises.map((exercise) => exercise.id);

  const { data: setRows, error: setRowsError } = await supabase
    .from("athlete_exercise_sets")
    .select("program_exercise_id, athlete_id, reps, weight")
    .eq("athlete_id", athleteId)
    .in("program_exercise_id", exerciseIds);

  if (setRowsError) {
    throw new Error(setRowsError.message);
  }

  const volumeByWeek = new Map<string, WeeklyVolumeRow>();

  for (const setRow of setRows || []) {
    const exercise = exerciseById[setRow.program_exercise_id];
    if (!exercise) continue;

    const lift = classifySbdLift(exercise.name || "");
    if (!lift) continue;

    const day = dayById[exercise.program_day_id];
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

    const weekKey = `${block.id}:${week.id}`;
    const existing =
      volumeByWeek.get(weekKey) ||
      ({
        id: weekKey,
        date,
        blockId: block.id,
        blockTitle: block.title || "Block",
        weekId: week.id,
        weekTitle: week.title || `Week ${week.week_number}`,
        weekNumber: week.week_number,
        squat: emptyLiftVolume(),
        bench: emptyLiftVolume(),
        deadlift: emptyLiftVolume(),
      } satisfies WeeklyVolumeRow);

    existing[lift].sets += 1;

    const reps =
      parseNumber(setRow.reps) ?? parseNumber(exercise.reps);
    if (reps !== null) {
      existing[lift].reps += reps;
    }

    const weight = parseNumber(setRow.weight);
    if (weight !== null && reps !== null && weight > 0 && reps > 0) {
      existing[lift].tonnage += weight * reps;
    }

    volumeByWeek.set(weekKey, existing);
  }

  return Array.from(volumeByWeek.values())
    .filter(
      (row) =>
        row.squat.sets + row.bench.sets + row.deadlift.sets > 0 ||
        row.squat.reps + row.bench.reps + row.deadlift.reps > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}
