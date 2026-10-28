import { applyAthleteSetDefaults } from "@/lib/athleteSetDefaults";
import {
  getTodayAtMidnight,
  isEmptyCheckinFatigue,
  isEmptyCheckinRecovery,
  isEmptySetField,
} from "@/lib/programDayValidation";

export type FillScoreExercise = {
  id: string;
  program_day_id: string;
  name: string;
  sets: string | null;
  reps: string | null;
  rpe: string | null;
  load?: string | null;
};

export type FillScoreDay = {
  id: string;
  program_week_id: string;
  day_number: number;
};

export type FillScoreWeek = {
  id: string;
  week_number: number;
  program_block_id: string;
};

export type FillScoreBlock = {
  id: string;
  athlete_id: string | null;
  start_date: string | null;
};

export type FillScoreSetRow = {
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
};

export type FillScoreCheckin = {
  program_day_id: string;
  athlete_id: string;
  bw: string | null;
  recovery: number | null;
  fatigue: number | null;
  notes: string | null;
};

export type AthleteFillScore = {
  athleteId: string;
  athleteName: string;
  filled: number;
  total: number;
  percentage: number;
};

export function getProgramDayDate(
  startDate: string | null,
  weekNumber: number,
  dayNumber: number,
) {
  if (!startDate) return null;

  const date = new Date(startDate);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + (weekNumber - 1) * 7 + (dayNumber - 1));
  return date;
}

export function isDayDue(
  startDate: string | null,
  weekNumber: number,
  dayNumber: number,
  today = getTodayAtMidnight(),
) {
  const dayDate = getProgramDayDate(startDate, weekNumber, dayNumber);
  if (!dayDate) return false;
  return dayDate.getTime() <= today.getTime();
}

export function getExerciseSetCount(exercise: Pick<FillScoreExercise, "sets">) {
  const rawSets = (exercise.sets || "").trim();
  const match = rawSets.match(/\d+/);

  if (!match) return 1;

  const count = Number(match[0]);
  if (!Number.isFinite(count) || count < 1) return 1;
  if (count > 20) return 20;

  return count;
}

function isSetFieldFilled(
  exercise: FillScoreExercise,
  row: FillScoreSetRow | undefined,
  field: "reps" | "weight" | "rpe",
) {
  const withDefaults = applyAthleteSetDefaults(exercise, {
    reps: row?.reps || "",
    weight: row?.weight || "",
    rpe: row?.rpe || "",
  });

  return !isEmptySetField(withDefaults[field]);
}

export type FillScoreDayFilter = (input: {
  day: FillScoreDay;
  week: FillScoreWeek;
  block: FillScoreBlock;
  dayDate: Date | null;
}) => boolean;

export function isDayInPastWeek(
  startDate: string | null,
  weekNumber: number,
  dayNumber: number,
  today = getTodayAtMidnight(),
) {
  const dayDate = getProgramDayDate(startDate, weekNumber, dayNumber);
  if (!dayDate) return false;
  if (dayDate.getTime() > today.getTime()) return false;

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  weekStart.setHours(0, 0, 0, 0);

  return dayDate.getTime() >= weekStart.getTime();
}

/** Rolling 30-day window (inclusive of today). */
export function isDayInPastMonth(
  startDate: string | null,
  weekNumber: number,
  dayNumber: number,
  today = getTodayAtMidnight(),
) {
  const dayDate = getProgramDayDate(startDate, weekNumber, dayNumber);
  if (!dayDate) return false;
  if (dayDate.getTime() > today.getTime()) return false;

  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - 29);
  monthStart.setHours(0, 0, 0, 0);

  return dayDate.getTime() >= monthStart.getTime();
}

export function calculateAthleteFillScore(input: {
  athleteId: string;
  athleteName: string;
  blocks: FillScoreBlock[];
  weeks: FillScoreWeek[];
  days: FillScoreDay[];
  exercises: FillScoreExercise[];
  setRows: FillScoreSetRow[];
  checkins: FillScoreCheckin[];
  dayFilter?: FillScoreDayFilter;
}) {
  const {
    athleteId,
    athleteName,
    blocks,
    weeks,
    days,
    exercises,
    setRows,
    checkins,
    dayFilter,
  } = input;

  const blockById = Object.fromEntries(blocks.map((block) => [block.id, block]));
  const weekById = Object.fromEntries(weeks.map((week) => [week.id, week]));

  const setsByExercise = setRows.reduce<Record<string, FillScoreSetRow[]>>(
    (acc, row) => {
      if (row.athlete_id !== athleteId) return acc;
      if (!acc[row.program_exercise_id]) acc[row.program_exercise_id] = [];
      acc[row.program_exercise_id].push(row);
      return acc;
    },
    {},
  );

  const checkinByDay = checkins.reduce<Record<string, FillScoreCheckin>>(
    (acc, checkin) => {
      if (checkin.athlete_id !== athleteId) return acc;
      acc[checkin.program_day_id] = checkin;
      return acc;
    },
    {},
  );

  const exercisesByDay = exercises.reduce<Record<string, FillScoreExercise[]>>(
    (acc, exercise) => {
      if (!acc[exercise.program_day_id]) acc[exercise.program_day_id] = [];
      acc[exercise.program_day_id].push(exercise);
      return acc;
    },
    {},
  );

  let filled = 0;
  let total = 0;

  for (const day of days) {
    const week = weekById[day.program_week_id];
    const block = week ? blockById[week.program_block_id] : undefined;

    if (!week || !block || block.athlete_id !== athleteId) continue;
    if (!isDayDue(block.start_date, week.week_number, day.day_number)) continue;

    const dayDate = getProgramDayDate(
      block.start_date,
      week.week_number,
      day.day_number,
    );

    if (
      dayFilter &&
      !dayFilter({ day, week, block, dayDate })
    ) {
      continue;
    }

    const checkin = checkinByDay[day.id];

    total += 2;
    if (!isEmptyCheckinRecovery(checkin?.recovery ?? null)) filled += 1;
    if (!isEmptyCheckinFatigue(checkin?.fatigue ?? null)) filled += 1;

    for (const exercise of exercisesByDay[day.id] || []) {
      const setCount = getExerciseSetCount(exercise);
      const rows = setsByExercise[exercise.id] || [];

      for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
        const row = rows.find((item) => item.set_number === setNumber);

        for (const field of ["reps", "weight", "rpe"] as const) {
          total += 1;
          if (isSetFieldFilled(exercise, row, field)) filled += 1;
        }
      }
    }
  }

  const percentage = total > 0 ? Math.round((filled / total) * 100) : 100;

  return {
    athleteId,
    athleteName,
    filled,
    total,
    percentage,
  } satisfies AthleteFillScore;
}

export function formatFillScorePercentage(percentage: number) {
  return `${percentage}%`;
}

export function getFillScoreColorClass(percentage: number) {
  if (percentage >= 90) return "text-emerald-600";
  if (percentage >= 70) return "text-yellow-600";
  return "text-red-600";
}

/** Athlete dashboard mobile — blue accent instead of green for high scores. */
export function getAthleteDashboardFillScoreColorClass(percentage: number) {
  if (percentage >= 90) return "athlete-dashboard-fill-tone--high";
  if (percentage >= 70) return "athlete-dashboard-fill-tone--mid";
  if (percentage >= 50) return "text-yellow-500";
  return "text-red-500";
}
