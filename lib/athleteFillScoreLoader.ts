import { supabase } from "@/lib/supabaseClient";
import {
  calculateAthleteFillScore,
  isDayInPastMonth,
  type AthleteFillScore,
  type FillScoreBlock,
  type FillScoreCheckin,
  type FillScoreDay,
  type FillScoreExercise,
  type FillScoreSetRow,
  type FillScoreWeek,
} from "@/lib/athleteFillScore";

export type FillScoreDayFilter = (args: {
  block: FillScoreBlock;
  week: FillScoreWeek;
  day: FillScoreDay;
}) => boolean;

export async function loadFillScoresForAthletes(
  athleteIds: string[],
  athletes: Array<{ id: string; full_name: string | null }>,
  dayFilter: FillScoreDayFilter = ({ block, week, day }) =>
    isDayInPastMonth(block.start_date, week.week_number, day.day_number),
): Promise<AthleteFillScore[]> {
  if (athleteIds.length === 0) return [];

  const { data: blocks } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, start_date")
    .in("athlete_id", athleteIds);

  const blockRows = (blocks || []) as FillScoreBlock[];
  const blockIds = blockRows.map((block) => block.id);

  if (blockIds.length === 0) {
    return athletes.map((athlete) => ({
      athleteId: athlete.id,
      athleteName: athlete.full_name || "Naamloos",
      filled: 0,
      total: 0,
      percentage: 100,
    }));
  }

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
          .select("program_exercise_id, athlete_id, set_number, reps, weight, rpe")
          .in("athlete_id", athleteIds)
          .in("program_exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    dayIds.length > 0
      ? supabase
          .from("athlete_day_checkins")
          .select("program_day_id, athlete_id, bw, recovery, fatigue, notes")
          .in("athlete_id", athleteIds)
          .in("program_day_id", dayIds)
      : Promise.resolve({ data: [] }),
  ]);

  return athletes.map((athlete) =>
    calculateAthleteFillScore({
      athleteId: athlete.id,
      athleteName: athlete.full_name || "Naamloos",
      blocks: blockRows,
      weeks: weekRows,
      days: dayRows,
      exercises: exerciseRows,
      setRows: (setRows || []) as FillScoreSetRow[],
      checkins: (checkins || []) as FillScoreCheckin[],
      dayFilter,
    }),
  );
}
