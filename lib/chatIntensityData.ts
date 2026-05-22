import { supabase } from "@/lib/supabaseClient";
import {
  addDays,
  formatShortDate,
  type BwWeekOption,
} from "@/lib/chatBwData";
import { loadAthleteSbdPrData, type LiftPrData } from "@/lib/chatPrData";
import {
  classifySbdLift,
  formatLiftLabel,
  type SbdLift,
} from "@/lib/chatVolumeData";

export { formatLiftLabel, type SbdLift };

const SBD_LIFTS: SbdLift[] = ["squat", "bench", "deadlift"];

export type LiftIntensityStats = {
  averageIntensity: number | null;
  peakIntensity: number | null;
  peakLoad: number | null;
};

export type WeeklyPeakLoadRow = {
  id: string;
  date: string;
  blockId: string;
  blockTitle: string;
  weekId: string;
  weekTitle: string;
  weekNumber: number;
  squat: number | null;
  bench: number | null;
  deadlift: number | null;
};

export type IntensitySnapshot = {
  stats: Record<SbdLift, LiftIntensityStats>;
  peakLoadRows: WeeklyPeakLoadRow[];
  setRecords: SetIntensityRecord[];
};

type SetIntensityRecord = {
  date: string;
  lift: SbdLift;
  intensity: number;
  weight: number | null;
};

function parseNumber(value: string | null | undefined) {
  if (!value) return null;

  const normalized = value.replace(",", ".").trim();
  if (!normalized || normalized.includes("%")) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePercentage(value: string | null | undefined) {
  if (!value) return null;

  const match = value.replace(",", ".").match(/(\d+(?:\.\d+)?)\s*%/);
  if (!match) return null;

  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function roundIntensity(value: number) {
  return Math.round(value * 10) / 10;
}

function getReferenceOneRm(lift: SbdLift, prData: LiftPrData[]) {
  const liftData = prData.find((entry) => entry.lift === lift);
  if (!liftData) return null;

  const oneRm = liftData.repMaxes.find((entry) => entry.reps === 1);
  if (oneRm) return oneRm.weight;

  let bestEstimate = 0;

  for (const entry of liftData.repMaxes) {
    const estimate = entry.weight * (1 + entry.reps / 30);
    if (estimate > bestEstimate) {
      bestEstimate = estimate;
    }
  }

  if (bestEstimate <= 0) return null;

  return Math.round(bestEstimate / 2.5) * 2.5;
}

function computeSetIntensity(
  athleteWeight: number | null,
  athleteReps: number | null,
  prescribedLoad: string | null,
  prescribedReps: string | null,
  referenceOneRm: number | null,
) {
  if (athleteWeight === null || athleteWeight <= 0) {
    return parsePercentage(prescribedLoad);
  }

  const reps = athleteReps ?? parseNumber(prescribedReps);
  if (reps === null || reps <= 0) return null;

  if (referenceOneRm !== null && referenceOneRm > 0) {
    return roundIntensity((athleteWeight / referenceOneRm) * 100);
  }

  const estimatedOneRm = athleteWeight * (1 + reps / 30);
  if (estimatedOneRm <= 0) return null;

  return roundIntensity((athleteWeight / estimatedOneRm) * 100);
}

function emptyLiftStats(): LiftIntensityStats {
  return {
    averageIntensity: null,
    peakIntensity: null,
    peakLoad: null,
  };
}

function emptyPeakLoadRow(
  weekKey: string,
  date: string,
  block: { id: string; title: string | null },
  week: { id: string; title: string | null; week_number: number },
): WeeklyPeakLoadRow {
  return {
    id: weekKey,
    date,
    blockId: block.id,
    blockTitle: block.title || "Block",
    weekId: week.id,
    weekTitle: week.title || `Week ${week.week_number}`,
    weekNumber: week.week_number,
    squat: null,
    bench: null,
    deadlift: null,
  };
}

export function formatIntensity(value: number | null) {
  if (value === null) return "-";
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

export function formatPeakLoad(value: number | null) {
  if (value === null) return "-";
  return `${value} kg`;
}

export function formatIntensityWeekOptionLabel(week: BwWeekOption) {
  const start = formatShortDate(week.firstFilledDate);
  const end = formatShortDate(week.lastFilledDate);
  const dateRange = start === end ? start : `${start} – ${end}`;

  return `${week.blockTitle} · ${week.weekTitle} (${dateRange})`;
}

export function buildIntensityWeekOptions(rows: WeeklyPeakLoadRow[]): BwWeekOption[] {
  const grouped = new Map<string, WeeklyPeakLoadRow[]>();

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

export function filterPeakLoadRowsByDateRange(
  rows: WeeklyPeakLoadRow[],
  startDate: string,
  endDate: string,
) {
  return rows.filter((row) => {
    if (startDate && row.date < startDate) return false;
    if (endDate && row.date > endDate) return false;
    return true;
  });
}

export function findIntensityWeekOption(weekOptions: BwWeekOption[], weekId: string) {
  return weekOptions.find((option) => option.id === weekId);
}

export function resolveIntensityDateRangeFromWeeks(
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
    ? findIntensityWeekOption(weekOptions, beginWeekId)
    : undefined;
  const endWeek = endWeekId
    ? findIntensityWeekOption(weekOptions, endWeekId)
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

export function buildPeakLoadChartData(rows: WeeklyPeakLoadRow[]) {
  return rows.map((row) => ({
    id: row.id,
    label: row.weekTitle,
    squat: row.squat,
    bench: row.bench,
    deadlift: row.deadlift,
  }));
}

export function buildPeakLoadChartDataForLift(
  rows: WeeklyPeakLoadRow[],
  lift: SbdLift,
) {
  return rows.map((row) => ({
    id: row.id,
    label: row.weekTitle,
    value: row[lift],
  }));
}

export function computeIntensityStats(
  intensities: Record<SbdLift, number[]>,
  peakLoads: Record<SbdLift, number[]>,
): Record<SbdLift, LiftIntensityStats> {
  return SBD_LIFTS.reduce(
    (stats, lift) => {
      const values = intensities[lift];
      const loads = peakLoads[lift];

      stats[lift] = {
        averageIntensity:
          values.length > 0
            ? roundIntensity(
                values.reduce((sum, value) => sum + value, 0) / values.length,
              )
            : null,
        peakIntensity:
          values.length > 0 ? Math.max(...values) : null,
        peakLoad: loads.length > 0 ? Math.max(...loads) : null,
      };

      return stats;
    },
    {} as Record<SbdLift, LiftIntensityStats>,
  );
}

export async function loadAthleteSbdIntensityData(
  athleteId: string,
): Promise<IntensitySnapshot> {
  const prData = await loadAthleteSbdPrData(athleteId);
  const referenceOneRmByLift = Object.fromEntries(
    SBD_LIFTS.map((lift) => [lift, getReferenceOneRm(lift, prData)]),
  ) as Record<SbdLift, number | null>;

  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, title, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  if (blocksError) {
    throw new Error(blocksError.message);
  }

  if (!blocks?.length) {
    return {
      stats: SBD_LIFTS.reduce(
        (acc, lift) => {
          acc[lift] = emptyLiftStats();
          return acc;
        },
        {} as Record<SbdLift, LiftIntensityStats>,
      ),
      peakLoadRows: [],
      setRecords: [],
    };
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
    return {
      stats: SBD_LIFTS.reduce(
        (acc, lift) => {
          acc[lift] = emptyLiftStats();
          return acc;
        },
        {} as Record<SbdLift, LiftIntensityStats>,
      ),
      peakLoadRows: [],
      setRecords: [],
    };
  }

  const weekById = Object.fromEntries(weeks.map((week) => [week.id, week]));
  const weekIds = weeks.map((week) => week.id);

  const { data: days, error: daysError } = await supabase
    .from("program_days")
    .select("id, day_number, program_week_id")
    .in("program_week_id", weekIds)
    .order("day_number", { ascending: true });

  if (daysError) {
    throw new Error(daysError.message);
  }

  if (!days?.length) {
    return {
      stats: SBD_LIFTS.reduce(
        (acc, lift) => {
          acc[lift] = emptyLiftStats();
          return acc;
        },
        {} as Record<SbdLift, LiftIntensityStats>,
      ),
      peakLoadRows: [],
      setRecords: [],
    };
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
    return {
      stats: SBD_LIFTS.reduce(
        (acc, lift) => {
          acc[lift] = emptyLiftStats();
          return acc;
        },
        {} as Record<SbdLift, LiftIntensityStats>,
      ),
      peakLoadRows: [],
      setRecords: [],
    };
  }

  const exerciseById = Object.fromEntries(
    exercises.map((exercise) => [exercise.id, exercise]),
  );
  const exerciseIds = exercises.map((exercise) => exercise.id);

  const { data: setRows, error: setRowsError } = await supabase
    .from("athlete_exercise_sets")
    .select("program_exercise_id, reps, weight")
    .eq("athlete_id", athleteId)
    .in("program_exercise_id", exerciseIds);

  if (setRowsError) {
    throw new Error(setRowsError.message);
  }

  const intensities: Record<SbdLift, number[]> = {
    squat: [],
    bench: [],
    deadlift: [],
  };
  const peakLoads: Record<SbdLift, number[]> = {
    squat: [],
    bench: [],
    deadlift: [],
  };
  const setRecords: SetIntensityRecord[] = [];
  const peakLoadByWeek = new Map<string, WeeklyPeakLoadRow>();

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

    const athleteWeight = parseNumber(setRow.weight);
    const athleteReps = parseNumber(setRow.reps);
    const intensity = computeSetIntensity(
      athleteWeight,
      athleteReps,
      exercise.load,
      exercise.reps,
      referenceOneRmByLift[lift],
    );

    if (intensity !== null) {
      intensities[lift].push(intensity);
      setRecords.push({
        date,
        lift,
        intensity,
        weight: athleteWeight,
      });
    }

    if (athleteWeight !== null && athleteWeight > 0) {
      peakLoads[lift].push(athleteWeight);

      const weekKey = `${block.id}:${week.id}`;
      const existing =
        peakLoadByWeek.get(weekKey) ||
        emptyPeakLoadRow(weekKey, date, block, week);

      const currentPeak = existing[lift];
      if (currentPeak === null || athleteWeight > currentPeak) {
        existing[lift] = athleteWeight;
      }

      peakLoadByWeek.set(weekKey, existing);
    }
  }

  return {
    stats: computeIntensityStats(intensities, peakLoads),
    peakLoadRows: Array.from(peakLoadByWeek.values())
      .filter(
        (row) =>
          row.squat !== null || row.bench !== null || row.deadlift !== null,
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
    setRecords,
  };
}

export function filterIntensitySnapshotByDateRange(
  snapshot: IntensitySnapshot,
  startDate: string,
  endDate: string,
): IntensitySnapshot {
  const filteredSetRecords = snapshot.setRecords.filter((record) => {
    if (startDate && record.date < startDate) return false;
    if (endDate && record.date > endDate) return false;
    return true;
  });

  const filteredPeakLoadRows = filterPeakLoadRowsByDateRange(
    snapshot.peakLoadRows,
    startDate,
    endDate,
  );

  const intensities: Record<SbdLift, number[]> = {
    squat: [],
    bench: [],
    deadlift: [],
  };
  const peakLoads: Record<SbdLift, number[]> = {
    squat: [],
    bench: [],
    deadlift: [],
  };

  for (const record of filteredSetRecords) {
    intensities[record.lift].push(record.intensity);
    if (record.weight !== null && record.weight > 0) {
      peakLoads[record.lift].push(record.weight);
    }
  }

  return {
    stats: computeIntensityStats(intensities, peakLoads),
    peakLoadRows: filteredPeakLoadRows,
    setRecords: filteredSetRecords,
  };
}
