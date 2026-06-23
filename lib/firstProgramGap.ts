import { supabase } from "@/lib/supabaseClient";
import { applyAthleteSetDefaults } from "@/lib/athleteSetDefaults";
import {
  getExerciseSetCount,
  getProgramDayDate,
  isDayDue,
  isDayInPastMonth,
  type FillScoreBlock,
  type FillScoreCheckin,
  type FillScoreDay,
  type FillScoreExercise,
  type FillScoreSetRow,
  type FillScoreWeek,
} from "@/lib/athleteFillScore";
import {
  isEmptyCheckinFatigue,
  isEmptyCheckinRecovery,
  isEmptySetField,
} from "@/lib/programDayValidation";

export type FirstProgramGap = {
  blockId: string;
  weekId: string;
  dayId: string;
  dayLabel: string;
};

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

export async function findFirstMissingProgramGap(
  athleteId: string,
): Promise<FirstProgramGap | null> {
  const { data: blocks } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, start_date")
    .eq("athlete_id", athleteId)
    .order("start_date", { ascending: true });

  const blockRows = (blocks || []) as FillScoreBlock[];
  if (blockRows.length === 0) return null;

  const blockIds = blockRows.map((b) => b.id);
  const { data: weeks } = await supabase
    .from("program_weeks")
    .select("id, week_number, program_block_id")
    .in("program_block_id", blockIds);

  const weekRows = (weeks || []) as FillScoreWeek[];
  const weekIds = weekRows.map((w) => w.id);
  if (weekIds.length === 0) return null;

  const { data: days } = await supabase
    .from("program_days")
    .select("id, program_week_id, day_number, title")
    .in("program_week_id", weekIds)
    .order("day_number", { ascending: true });

  const dayRows = (days || []) as (FillScoreDay & { title?: string | null })[];
  const dayIds = dayRows.map((d) => d.id);

  const { data: exercises } = await supabase
    .from("program_exercises")
    .select("id, program_day_id, name, sets, reps, rpe, load")
    .in("program_day_id", dayIds);

  const exerciseRows = (exercises || []) as FillScoreExercise[];
  const exerciseIds = exerciseRows.map((e) => e.id);

  const [{ data: setRows }, { data: checkins }] = await Promise.all([
    exerciseIds.length > 0
      ? supabase
          .from("athlete_exercise_sets")
          .select(
            "program_exercise_id, athlete_id, set_number, reps, weight, rpe",
          )
          .eq("athlete_id", athleteId)
          .in("program_exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    dayIds.length > 0
      ? supabase
          .from("athlete_day_checkins")
          .select("program_day_id, athlete_id, bw, recovery, fatigue, notes")
          .eq("athlete_id", athleteId)
          .in("program_day_id", dayIds)
      : Promise.resolve({ data: [] }),
  ]);

  const blockById = Object.fromEntries(blockRows.map((b) => [b.id, b]));
  const weekById = Object.fromEntries(weekRows.map((w) => [w.id, w]));
  const setsByExercise = (setRows || []).reduce<
    Record<string, FillScoreSetRow[]>
  >((acc, row) => {
    const r = row as FillScoreSetRow;
    if (!acc[r.program_exercise_id]) acc[r.program_exercise_id] = [];
    acc[r.program_exercise_id].push(r);
    return acc;
  }, {});
  const checkinByDay = (checkins || []).reduce<Record<string, FillScoreCheckin>>(
    (acc, row) => {
      const c = row as FillScoreCheckin;
      acc[c.program_day_id] = c;
      return acc;
    },
    {},
  );
  const exercisesByDay = exerciseRows.reduce<Record<string, FillScoreExercise[]>>(
    (acc, ex) => {
      if (!acc[ex.program_day_id]) acc[ex.program_day_id] = [];
      acc[ex.program_day_id].push(ex);
      return acc;
    },
    {},
  );

  for (const day of dayRows) {
    const week = weekById[day.program_week_id];
    const block = week ? blockById[week.program_block_id] : undefined;
    if (!week || !block) continue;
    if (!isDayDue(block.start_date, week.week_number, day.day_number)) continue;

    const dayDate = getProgramDayDate(
      block.start_date,
      week.week_number,
      day.day_number,
    );
    if (
      !isDayInPastMonth(block.start_date, week.week_number, day.day_number)
    ) {
      continue;
    }

    const checkin = checkinByDay[day.id];
    if (isEmptyCheckinRecovery(checkin?.recovery ?? null)) {
      return gapResult(block, week, day);
    }
    if (isEmptyCheckinFatigue(checkin?.fatigue ?? null)) {
      return gapResult(block, week, day);
    }

    for (const exercise of exercisesByDay[day.id] || []) {
      const setCount = getExerciseSetCount(exercise);
      const rows = setsByExercise[exercise.id] || [];
      for (let setNumber = 1; setNumber <= setCount; setNumber += 1) {
        const row = rows.find((item) => item.set_number === setNumber);
        for (const field of ["reps", "weight", "rpe"] as const) {
          if (!isSetFieldFilled(exercise, row, field)) {
            return gapResult(block, week, day);
          }
        }
      }
    }
  }

  return null;
}

function gapResult(
  block: FillScoreBlock,
  week: FillScoreWeek,
  day: FillScoreDay & { title?: string | null },
): FirstProgramGap {
  return {
    blockId: block.id,
    weekId: week.id,
    dayId: day.id,
    dayLabel: day.title || `Dag ${day.day_number}`,
  };
}

export function buildFirstGapProgramUrl(
  gap: FirstProgramGap,
  athleteId: string,
) {
  const params = new URLSearchParams({
    athlete: athleteId,
    focusDay: gap.dayId,
  });
  return `/programs/${gap.blockId}/weeks/${gap.weekId}?${params.toString()}`;
}
