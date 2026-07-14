import { supabase } from "@/lib/supabaseClient";
import type { AthleteFillScore } from "@/lib/athleteFillScore";
import { loadFillScoresForAthletes } from "@/lib/athleteFillScoreLoader";
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

export type AthleteUpcomingCompetition = {
  id: string;
  naam: string;
  startDate: string;
  endDate: string;
  weeksOut: number;
};

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
  upcomingCompetitions: AthleteUpcomingCompetition[];
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

  const [fillScores, latestBwByAthlete, upcomingCompetitionsByAthlete] =
    await Promise.all([
      loadFillScoresForAthletes(athleteIds, athletes),
      loadLatestBodyweights(athleteIds),
      loadUpcomingCompetitionsByAthlete(athleteIds),
    ]);

  const rows: CoachAthleteOverviewRow[] = [];

  const missingBwIds = athletes
    .filter((athlete) => !latestBwByAthlete.has(athlete.id))
    .map((athlete) => athlete.id);

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

  for (const athlete of athletes) {
    const bodyweightKg =
      latestBwByAthlete.get(athlete.id) ??
      intakeByAthlete.get(athlete.id) ??
      null;

    const upcomingCompetitions =
      upcomingCompetitionsByAthlete.get(athlete.id) ?? [];

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
      weeksOut: upcomingCompetitions[0]?.weeksOut ?? null,
      upcomingCompetitions,
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

  const [fillScores, latestBwByAthlete, upcomingCompetitionsByAthlete] =
    await Promise.all([
      loadFillScoresForAthletes(athleteIds, athletes),
      loadLatestBodyweights(athleteIds),
      loadUpcomingCompetitionsByAthlete(athleteIds),
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
    const bodyweightKg =
      latestBwByAthlete.get(row.id) ?? row.bodyweightKg ?? intakeByAthlete.get(row.id) ?? null;

    const upcomingCompetitions =
      upcomingCompetitionsByAthlete.get(row.id) ?? row.upcomingCompetitions;

    enriched.push({
      ...row,
      fillScore:
        fillScores.find((score) => score.athleteId === row.id)?.percentage ??
        100,
      bodyweightKg,
      weeksOut: upcomingCompetitions[0]?.weeksOut ?? null,
      upcomingCompetitions,
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

  const athleteIds = athletes.map((athlete) => athlete.id);
  const upcomingCompetitionsByAthlete =
    await loadUpcomingCompetitionsByAthlete(athleteIds);

  return athletes.map((athlete) => {
    const upcomingCompetitions =
      upcomingCompetitionsByAthlete.get(athlete.id) ?? [];

    return {
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
      weeksOut: upcomingCompetitions[0]?.weeksOut ?? null,
      upcomingCompetitions,
    };
  });
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

async function loadUpcomingCompetitionsByAthlete(
  athleteIds: string[],
): Promise<Map<string, AthleteUpcomingCompetition[]>> {
  const result = new Map<string, AthleteUpcomingCompetition[]>();
  if (athleteIds.length === 0) return result;

  for (const athleteId of athleteIds) {
    result.set(athleteId, []);
  }

  const today = getTodayDateString();
  const { data: rows } = await supabase
    .from("athlete_competitions")
    .select("athlete_id, wedstrijden(id, naam, start_date, end_date)")
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

    const athleteId = row.athlete_id as string;
    const list = result.get(athleteId);
    if (!list) continue;

    list.push({
      id: String(competition.id || `${athleteId}-${competition.start_date}`),
      naam: String(competition.naam || "Wedstrijd"),
      startDate: String(competition.start_date),
      endDate: String(competition.end_date),
      weeksOut: weeksOutFromMeet(String(competition.start_date)),
    });
  }

  for (const [athleteId, list] of result) {
    list.sort((a, b) => a.startDate.localeCompare(b.startDate));
    result.set(athleteId, list);
  }

  return result;
}

