import {
  calculateAthleteFillScore,
  getProgramDayDate,
  isDayDue,
  type FillScoreBlock,
  type FillScoreCheckin,
  type FillScoreDay,
  type FillScoreExercise,
  type FillScoreSetRow,
  type FillScoreWeek,
} from "@/lib/athleteFillScore";
import { supabase } from "@/lib/supabaseClient";

export type DailyTrackingCell = "empty" | "ok" | "warn";

export type AthleteDailyTrackingRow = {
  athleteId: string;
  fillScoreByDay: Record<number, DailyTrackingCell>;
  bodyweightByDay: Record<number, DailyTrackingCell>;
  fillScoreValueByDay: Record<number, number | null>;
  bodyweightValueByDay: Record<number, number | null>;
  fillScoreTrend30: number[];
  bodyweightTrend30: number[];
};

function toDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthContext(reference = new Date()) {
  const year = reference.getFullYear();
  const month = reference.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = new Date(year, month, 1, 12, 0, 0, 0);
  const monthEnd = new Date(year, month, daysInMonth, 12, 0, 0, 0);
  const today = new Date(reference);
  today.setHours(12, 0, 0, 0);
  const rollingWindowStart = new Date(today);
  rollingWindowStart.setDate(rollingWindowStart.getDate() - 29);

  return { year, month, daysInMonth, monthStart, monthEnd, today, rollingWindowStart };
}

function buildRollingTrend(valuesByDate: Map<string, number>, windowStart: Date, today: Date) {
  const values: number[] = [];
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(windowStart);
    date.setDate(windowStart.getDate() + offset);
    if (date > today) break;
    const value = valuesByDate.get(toDateString(date));
    if (value !== undefined) values.push(value);
  }
  return values;
}

function dayScoreForProgramDay(input: {
  athleteId: string;
  day: FillScoreDay;
  week: FillScoreWeek;
  block: FillScoreBlock;
  exercises: FillScoreExercise[];
  setRows: FillScoreSetRow[];
  checkins: FillScoreCheckin[];
}) {
  const result = calculateAthleteFillScore({
    athleteId: input.athleteId,
    athleteName: "",
    blocks: [input.block],
    weeks: [input.week],
    days: [input.day],
    exercises: input.exercises.filter(
      (exercise) => exercise.program_day_id === input.day.id,
    ),
    setRows: input.setRows,
    checkins: input.checkins,
  });

  if (result.total === 0) {
    return { cell: "empty" as const, percentage: null };
  }

  const percentage = result.percentage;
  if (percentage >= 100) {
    return { cell: "ok" as const, percentage };
  }
  return { cell: "warn" as const, percentage };
}

export async function loadAthleteOverviewDailyTracking(
  athleteIds: string[],
): Promise<Map<string, AthleteDailyTrackingRow>> {
  const result = new Map<string, AthleteDailyTrackingRow>();
  if (athleteIds.length === 0) return result;

  const { daysInMonth, monthStart, monthEnd, today, rollingWindowStart } = getMonthContext();
  const monthStartIso = toDateString(monthStart);
  const monthEndIso = `${toDateString(monthEnd)}T23:59:59.999`;
  const windowStartIso = `${toDateString(rollingWindowStart)}T00:00:00`;

  const fillScoreByDateByAthlete = new Map<string, Map<string, number>>();
  const bodyweightByDateByAthlete = new Map<string, Map<string, number>>();

  for (const athleteId of athleteIds) {
    fillScoreByDateByAthlete.set(athleteId, new Map());
    bodyweightByDateByAthlete.set(athleteId, new Map());
    const fillScoreByDay: Record<number, DailyTrackingCell> = {};
    const bodyweightByDay: Record<number, DailyTrackingCell> = {};
    const fillScoreValueByDay: Record<number, number | null> = {};
    const bodyweightValueByDay: Record<number, number | null> = {};
    for (let day = 1; day <= daysInMonth; day += 1) {
      fillScoreByDay[day] = "empty";
      bodyweightByDay[day] = "empty";
      fillScoreValueByDay[day] = null;
      bodyweightValueByDay[day] = null;
    }
    result.set(athleteId, {
      athleteId,
      fillScoreByDay,
      bodyweightByDay,
      fillScoreValueByDay,
      bodyweightValueByDay,
      fillScoreTrend30: [],
      bodyweightTrend30: [],
    });
  }

  const { data: blocks } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, start_date")
    .in("athlete_id", athleteIds);

  const blockRows = (blocks || []) as FillScoreBlock[];
  const blockIds = blockRows.map((block) => block.id);

  if (blockIds.length > 0) {
    const { data: weeks } = await supabase
      .from("program_weeks")
      .select("id, week_number, program_block_id")
      .in("program_block_id", blockIds);

    const weekRows = (weeks || []) as FillScoreWeek[];
    const weekIds = weekRows.map((week) => week.id);

    const { data: days } = await supabase
      .from("program_days")
      .select("id, program_week_id, day_number")
      .in("program_week_id", weekIds);

    const dayRows = (days || []) as FillScoreDay[];
    const dayIds = dayRows.map((day) => day.id);

    const { data: exercises } = await supabase
      .from("program_exercises")
      .select("id, program_day_id, name, sets, reps, rpe, load")
      .in("program_day_id", dayIds);

    const exerciseRows = (exercises || []) as FillScoreExercise[];
    const exerciseIds = exerciseRows.map((exercise) => exercise.id);

    const [{ data: setRows }, { data: checkins }] = await Promise.all([
      exerciseIds.length > 0
        ? supabase
            .from("athlete_exercise_sets")
            .select(
              "program_exercise_id, athlete_id, set_number, reps, weight, rpe",
            )
            .in("program_exercise_id", exerciseIds)
        : Promise.resolve({ data: [] }),
      dayIds.length > 0
        ? supabase
            .from("athlete_day_checkins")
            .select("program_day_id, athlete_id, bw, recovery, fatigue, notes")
            .in("program_day_id", dayIds)
        : Promise.resolve({ data: [] }),
    ]);

    const blockById = Object.fromEntries(blockRows.map((block) => [block.id, block]));
    const weekById = Object.fromEntries(weekRows.map((week) => [week.id, week]));

    for (const day of dayRows) {
      const week = weekById[day.program_week_id];
      const block = week ? blockById[week.program_block_id] : undefined;
      if (!week || !block?.athlete_id) continue;
      if (!isDayDue(block.start_date, week.week_number, day.day_number, today)) {
        continue;
      }

      const dayDate = getProgramDayDate(
        block.start_date,
        week.week_number,
        day.day_number,
      );
      if (!dayDate) continue;
      if (dayDate < rollingWindowStart || dayDate > today) continue;

      const dayOfMonth = dayDate.getDate();
      const dayIso = toDateString(dayDate);
      const athleteId = block.athlete_id;
      const tracking = result.get(athleteId);
      if (!tracking) continue;

      const dayScore = dayScoreForProgramDay({
        athleteId,
        day,
        week,
        block,
        exercises: exerciseRows,
        setRows: (setRows || []) as FillScoreSetRow[],
        checkins: (checkins || []) as FillScoreCheckin[],
      });

      if (dayScore.percentage !== null) {
        fillScoreByDateByAthlete.get(athleteId)?.set(dayIso, dayScore.percentage);
      }

      if (dayDate < monthStart || dayDate > monthEnd) continue;

      tracking.fillScoreByDay[dayOfMonth] = dayScore.cell;
      tracking.fillScoreValueByDay[dayOfMonth] = dayScore.percentage;
    }
  }

  const [{ data: bwLogs }, { data: bwCheckins }] = await Promise.all([
    supabase
      .from("athlete_bw_logs")
      .select("athlete_id, bw, logged_at")
      .in("athlete_id", athleteIds)
      .gte("logged_at", windowStartIso)
      .lte("logged_at", monthEndIso),
    supabase
      .from("athlete_day_checkins")
      .select("athlete_id, bw, updated_at, created_at")
      .in("athlete_id", athleteIds)
      .not("bw", "is", null)
      .gte("updated_at", windowStartIso)
      .lte("updated_at", monthEndIso),
  ]);

  function markBodyweightLogged(
    athleteId: string,
    iso: string | null,
    bwValue: number | null,
  ) {
    if (!iso) return;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return;
    date.setHours(12, 0, 0, 0);
    if (date < rollingWindowStart || date > today) return;

    if (bwValue !== null && !Number.isNaN(bwValue)) {
      bodyweightByDateByAthlete.get(athleteId)?.set(toDateString(date), bwValue);
    }

    if (date < monthStart || date > monthEnd) return;

    const tracking = result.get(athleteId);
    if (!tracking) return;
    const dayOfMonth = date.getDate();
    tracking.bodyweightByDay[dayOfMonth] = "ok";
    if (bwValue !== null && !Number.isNaN(bwValue)) {
      tracking.bodyweightValueByDay[dayOfMonth] = bwValue;
    }
  }

  for (const row of bwLogs || []) {
    markBodyweightLogged(
      row.athlete_id as string,
      row.logged_at as string,
      row.bw !== null && row.bw !== undefined ? Number(row.bw) : null,
    );
  }

  for (const row of bwCheckins || []) {
    const at =
      (row.updated_at as string | null) || (row.created_at as string | null);
    const bwValue =
      row.bw !== null && row.bw !== undefined && String(row.bw).trim()
        ? Number(row.bw)
        : null;
    markBodyweightLogged(
      row.athlete_id as string,
      at,
      bwValue !== null && !Number.isNaN(bwValue) ? bwValue : null,
    );
  }

  for (const athleteId of athleteIds) {
    const tracking = result.get(athleteId);
    if (!tracking) continue;

    tracking.fillScoreTrend30 = buildRollingTrend(
      fillScoreByDateByAthlete.get(athleteId) ?? new Map(),
      rollingWindowStart,
      today,
    );
    tracking.bodyweightTrend30 = buildRollingTrend(
      bodyweightByDateByAthlete.get(athleteId) ?? new Map(),
      rollingWindowStart,
      today,
    );

    for (let day = 1; day <= daysInMonth; day += 1) {
      const cellDate = new Date(monthStart);
      cellDate.setDate(day);
      if (cellDate > today) continue;
      if (tracking.bodyweightByDay[day] === "ok") continue;
      if (tracking.fillScoreByDay[day] === "warn") {
        tracking.bodyweightByDay[day] = "warn";
      }
    }
  }

  return result;
}

export function getCurrentMonthDayNumbers() {
  return getMonthContext().daysInMonth;
}

export function getCurrentMonthTodayDay() {
  const { today } = getMonthContext();
  return today.getDate();
}
