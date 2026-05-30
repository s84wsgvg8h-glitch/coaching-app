import { supabase } from "@/lib/supabaseClient";
import {
  calculateAthleteFillScore,
  isDayInPastWeek,
  type AthleteFillScore,
  type FillScoreBlock,
  type FillScoreCheckin,
  type FillScoreDay,
  type FillScoreExercise,
  type FillScoreSetRow,
  type FillScoreWeek,
} from "@/lib/athleteFillScore";

export async function loadAthleteWeeklyFillScore(
  athleteId: string,
  athleteName = "Atleet",
): Promise<AthleteFillScore> {
  const empty: AthleteFillScore = {
    athleteId,
    athleteName,
    filled: 0,
    total: 0,
    percentage: 100,
  };

  const { data: blocks, error: blocksError } = await supabase
    .from("program_blocks")
    .select("id, athlete_id, start_date")
    .eq("athlete_id", athleteId);

  if (blocksError || !blocks?.length) return empty;

  const blockRows = blocks as FillScoreBlock[];
  const blockIds = blockRows.map((block) => block.id);

  const { data: weeks, error: weeksError } = await supabase
    .from("program_weeks")
    .select("id, week_number, program_block_id")
    .in("program_block_id", blockIds);

  if (weeksError || !weeks?.length) return empty;

  const weekRows = weeks as FillScoreWeek[];
  const weekIds = weekRows.map((week) => week.id);

  const { data: days, error: daysError } = await supabase
    .from("program_days")
    .select("id, program_week_id, day_number")
    .in("program_week_id", weekIds);

  if (daysError || !days?.length) return empty;

  const dayRows = days as FillScoreDay[];
  const dayIds = dayRows.map((day) => day.id);

  const { data: exercises, error: exercisesError } = await supabase
    .from("program_exercises")
    .select("id, program_day_id, name, sets, reps, rpe, load")
    .in("program_day_id", dayIds);

  if (exercisesError) return empty;

  const exerciseRows = (exercises || []) as FillScoreExercise[];
  const exerciseIds = exerciseRows.map((exercise) => exercise.id);

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
    supabase
      .from("athlete_day_checkins")
      .select("program_day_id, athlete_id, bw, recovery, fatigue, notes")
      .eq("athlete_id", athleteId)
      .in("program_day_id", dayIds),
  ]);

  return calculateAthleteFillScore({
    athleteId,
    athleteName,
    blocks: blockRows,
    weeks: weekRows,
    days: dayRows,
    exercises: exerciseRows,
    setRows: (setRows || []) as FillScoreSetRow[],
    checkins: (checkins || []) as FillScoreCheckin[],
    dayFilter: ({ block, week, day }) =>
      isDayInPastWeek(block.start_date, week.week_number, day.day_number),
  });
}
