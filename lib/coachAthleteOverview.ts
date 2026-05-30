import { supabase } from "@/lib/supabaseClient";
import {
  calculateAthleteFillScore,
  type AthleteFillScore,
  type FillScoreBlock,
  type FillScoreCheckin,
  type FillScoreDay,
  type FillScoreExercise,
  type FillScoreSetRow,
  type FillScoreWeek,
} from "@/lib/athleteFillScore";
import { isAdminRole } from "@/lib/authRoles";
import { loadAthleteIntakeResponse } from "@/lib/intakeForm";

export type CoachAthleteOverviewRow = {
  id: string;
  fullName: string;
  fillScore: number;
  bodyweightKg: number | null;
};

export type CoachAthleteOverviewFilters = {
  fillMin: number;
  fillMax: number;
  bodyweightMin: number | null;
  bodyweightMax: number | null;
};

export async function loadCoachAthleteOverview(
  coachId: string,
  role: string,
): Promise<CoachAthleteOverviewRow[]> {
  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  if (!isAdminRole(role)) {
    athletesQuery = athletesQuery.eq("coach_id", coachId);
  }

  const { data: athletes, error: athletesError } = await athletesQuery;
  if (athletesError || !athletes?.length) return [];

  const athleteIds = athletes.map((athlete) => athlete.id);

  const fillScores = await loadFillScoresForAthletes(athleteIds, athletes);

  const rows: CoachAthleteOverviewRow[] = [];

  for (const athlete of athletes) {
    const intake = await loadAthleteIntakeResponse(athlete.id);
    const bwRaw = intake?.answers?.bodyweight;
    const bodyweightKg =
      bwRaw !== undefined && bwRaw !== "" ? Number(bwRaw) : null;

    rows.push({
      id: athlete.id,
      fullName: athlete.full_name || "Naamloos",
      fillScore:
        fillScores.find((score) => score.athleteId === athlete.id)?.percentage ??
        100,
      bodyweightKg: Number.isFinite(bodyweightKg) ? bodyweightKg : null,
    });
  }

  return rows;
}

async function loadFillScoresForAthletes(
  athleteIds: string[],
  athletes: Array<{ id: string; full_name: string | null }>,
): Promise<AthleteFillScore[]> {
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
          .select("program_exercise_id, set_number, reps, weight, rpe")
          .in("program_exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    dayIds.length > 0
      ? supabase
          .from("athlete_day_checkins")
          .select("program_day_id, recovery, fatigue")
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
    }),
  );
}

export function filterCoachAthleteOverview(
  rows: CoachAthleteOverviewRow[],
  filters: CoachAthleteOverviewFilters,
) {
  return rows.filter((row) => {
    if (row.fillScore < filters.fillMin || row.fillScore > filters.fillMax) {
      return false;
    }

    if (
      filters.bodyweightMin !== null &&
      (row.bodyweightKg === null || row.bodyweightKg < filters.bodyweightMin)
    ) {
      return false;
    }

    if (
      filters.bodyweightMax !== null &&
      (row.bodyweightKg === null || row.bodyweightKg > filters.bodyweightMax)
    ) {
      return false;
    }

    return true;
  });
}
