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
import { loadAthleteIntakeResponse } from "@/lib/intakeForm";
import {
  applyAthleteScope,
  loadCoachOrgContext,
  normalizeJoinedCompetition,
} from "@/lib/orgAthleteScope";
import {
  getTodayDateString,
  isUpcomingCompetition,
} from "@/lib/competitions";
import { weeksOutFromMeet } from "@/lib/meetWeekDisplay";

export type CoachAthleteOverviewRow = {
  id: string;
  fullName: string;
  fillScore: number;
  bodyweightKg: number | null;
  geboortedatum: string | null;
  lidnummer: string | null;
  betalingPrijs: number | null;
  betalingDag: number | null;
  weeksOut: number | null;
};

export async function loadCoachAthleteOverview(
  coachId: string,
  role: string,
): Promise<CoachAthleteOverviewRow[]> {
  const ctx = (await loadCoachOrgContext(coachId)) || {
    coachId,
    role,
    organizationId: null,
  };
  ctx.role = role;

  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name, geboortedatum, lidnummer, betaling_prijs, betaling_dag")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  athletesQuery = applyAthleteScope(athletesQuery, ctx);

  const { data: athletes, error: athletesError } = await athletesQuery;
  if (athletesError || !athletes?.length) return [];

  const athleteIds = athletes.map((athlete) => athlete.id);

  const [fillScores, latestBwByAthlete, weeksOutByAthlete] = await Promise.all([
    loadFillScoresForAthletes(athleteIds, athletes),
    loadLatestBodyweights(athleteIds),
    loadWeeksOutByAthlete(athleteIds),
  ]);

  const rows: CoachAthleteOverviewRow[] = [];

  for (const athlete of athletes) {
    let bodyweightKg = latestBwByAthlete.get(athlete.id) ?? null;

    if (bodyweightKg === null) {
      const intake = await loadAthleteIntakeResponse(athlete.id);
      const bwRaw = intake?.answers?.bodyweight;
      const parsed = bwRaw !== undefined && bwRaw !== "" ? Number(bwRaw) : null;
      bodyweightKg = Number.isFinite(parsed) ? parsed : null;
    }

    rows.push({
      id: athlete.id,
      fullName: athlete.full_name || "Naamloos",
      fillScore:
        fillScores.find((score) => score.athleteId === athlete.id)?.percentage ??
        100,
      bodyweightKg,
      geboortedatum: athlete.geboortedatum || null,
      lidnummer: athlete.lidnummer?.trim() || null,
      betalingPrijs:
        athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined
          ? Number(athlete.betaling_prijs)
          : null,
      betalingDag:
        athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
          ? Number(athlete.betaling_dag)
          : null,
      weeksOut: weeksOutByAthlete.get(athlete.id) ?? null,
    });
  }

  return rows;
}

export async function enrichCoachAthleteOverviewRows(
  rows: CoachAthleteOverviewRow[],
): Promise<CoachAthleteOverviewRow[]> {
  if (rows.length === 0) return rows;

  const athleteIds = rows.map((row) => row.id);
  const athletes = rows.map((row) => ({
    id: row.id,
    full_name: row.fullName,
  }));

  const [fillScores, latestBwByAthlete, weeksOutByAthlete] = await Promise.all([
    loadFillScoresForAthletes(athleteIds, athletes),
    loadLatestBodyweights(athleteIds),
    loadWeeksOutByAthlete(athleteIds),
  ]);

  const enriched: CoachAthleteOverviewRow[] = [];
  const missingBwIds = rows
    .filter((row) => !latestBwByAthlete.get(row.id))
    .map((row) => row.id);

  const intakeByAthlete = new Map<string, number | null>();
  if (missingBwIds.length > 0) {
    const intakeRows = await Promise.all(
      missingBwIds.map(async (athleteId) => ({
        athleteId,
        intake: await loadAthleteIntakeResponse(athleteId),
      })),
    );

    for (const entry of intakeRows) {
      const bwRaw = entry.intake?.answers?.bodyweight;
      const parsed = bwRaw !== undefined && bwRaw !== "" ? Number(bwRaw) : null;
      intakeByAthlete.set(
        entry.athleteId,
        Number.isFinite(parsed) ? parsed : null,
      );
    }
  }

  for (const row of rows) {
    let bodyweightKg =
      latestBwByAthlete.get(row.id) ?? row.bodyweightKg ?? intakeByAthlete.get(row.id) ?? null;

    enriched.push({
      ...row,
      fillScore:
        fillScores.find((score) => score.athleteId === row.id)?.percentage ??
        100,
      bodyweightKg,
      weeksOut: weeksOutByAthlete.get(row.id) ?? null,
    });
  }

  return enriched;
}

export async function loadCoachAthleteOverviewBasic(
  coachId: string,
  role: string,
): Promise<CoachAthleteOverviewRow[]> {
  const ctx = (await loadCoachOrgContext(coachId)) || {
    coachId,
    role,
    organizationId: null,
  };
  ctx.role = role;

  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name, geboortedatum, lidnummer, betaling_prijs, betaling_dag")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  athletesQuery = applyAthleteScope(athletesQuery, ctx);

  const { data: athletes, error: athletesError } = await athletesQuery;
  if (athletesError || !athletes?.length) return [];

  return athletes.map((athlete) => ({
    id: athlete.id,
    fullName: athlete.full_name || "Naamloos",
    fillScore: 100,
    bodyweightKg: null,
    geboortedatum: athlete.geboortedatum || null,
    lidnummer: athlete.lidnummer?.trim() || null,
    betalingPrijs:
      athlete.betaling_prijs !== null && athlete.betaling_prijs !== undefined
        ? Number(athlete.betaling_prijs)
        : null,
    betalingDag:
      athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
        ? Number(athlete.betaling_dag)
        : null,
    weeksOut: null,
  }));
}

export async function loadAthleteFillScore(
  athleteId: string,
  athleteName: string | null,
): Promise<number> {
  const scores = await loadFillScoresForAthletes([athleteId], [
    { id: athleteId, full_name: athleteName },
  ]);
  return scores[0]?.percentage ?? 100;
}

async function loadLatestBodyweights(
  athleteIds: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (athleteIds.length === 0) return result;

  const { data: checkins } = await supabase
    .from("athlete_day_checkins")
    .select("athlete_id, bw, updated_at")
    .in("athlete_id", athleteIds)
    .not("bw", "is", null)
    .order("updated_at", { ascending: false });

  for (const row of checkins || []) {
    if (result.has(row.athlete_id)) continue;
    const bw = Number(String(row.bw || "").replace(",", "."));
    if (Number.isFinite(bw) && bw > 0) {
      result.set(row.athlete_id, bw);
    }
  }

  return result;
}

async function loadWeeksOutByAthlete(
  athleteIds: string[],
): Promise<Map<string, number | null>> {
  const result = new Map<string, number | null>();
  if (athleteIds.length === 0) return result;

  for (const athleteId of athleteIds) {
    result.set(athleteId, null);
  }

  const today = getTodayDateString();
  const { data: rows } = await supabase
    .from("athlete_competitions")
    .select("athlete_id, wedstrijden(start_date, end_date)")
    .in("athlete_id", athleteIds);

  for (const row of rows || []) {
    const competition = normalizeJoinedCompetition(row.wedstrijden);
    if (!competition?.start_date || !competition?.end_date) continue;
    if (
      !isUpcomingCompetition(
        {
          end_date: String(competition.end_date),
        },
        today,
      )
    ) {
      continue;
    }

    const weeksOut = weeksOutFromMeet(String(competition.start_date));
    const athleteId = row.athlete_id as string;
    const current = result.get(athleteId);
    if (current === null || current === undefined || weeksOut < current) {
      result.set(athleteId, weeksOut);
    }
  }

  return result;
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
          .select("program_exercise_id, athlete_id, set_number, reps, weight, rpe")
          .in("program_exercise_id", exerciseIds)
      : Promise.resolve({ data: [] }),
    dayIds.length > 0
      ? supabase
          .from("athlete_day_checkins")
          .select("program_day_id, athlete_id, bw, recovery, fatigue, notes")
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
      dayFilter: ({ block, week, day }) =>
        isDayInPastMonth(block.start_date, week.week_number, day.day_number),
    }),
  );
}

