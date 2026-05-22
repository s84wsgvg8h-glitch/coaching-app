import { supabase } from "@/lib/supabaseClient";

export type Competition = {
  id: string;
  naam: string;
  start_date: string;
  end_date: string;
  created_at?: string;
};

export type AthleteCompetition = {
  id: string;
  athlete_id: string;
  competition_id: string;
  created_at: string;
};

const LOCAL_STORAGE_PREFIX = "athlete-competitions:";

function getLocalStorageKey(athleteId: string) {
  return `${LOCAL_STORAGE_PREFIX}${athleteId}`;
}

function readLocalCompetitionIds(athleteId: string): string[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getLocalStorageKey(athleteId));
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeLocalCompetitionIds(athleteId: string, competitionIds: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    getLocalStorageKey(athleteId),
    JSON.stringify(competitionIds),
  );
}

export function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export function isUpcomingCompetition(
  competition: Pick<Competition, "end_date">,
  today = getTodayDateString(),
) {
  return competition.end_date >= today;
}

export function formatCompetitionDateRange(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T12:00:00`);
  const end = new Date(`${endDate}T12:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return startDate === endDate ? startDate : `${startDate} – ${endDate}`;
  }

  if (startDate === endDate) {
    return start.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  const sameMonth =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth();

  if (sameMonth) {
    const monthYear = start.toLocaleDateString("nl-NL", {
      month: "long",
      year: "numeric",
    });
    return `${start.getDate()} – ${end.getDate()} ${monthYear}`;
  }

  return `${start.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })} – ${end.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
}

export async function loadCompetitions() {
  const { data, error } = await supabase
    .from("wedstrijden")
    .select("id, naam, start_date, end_date, created_at")
    .order("start_date", { ascending: true });

  if (error) {
    return { data: [] as Competition[], error, source: "remote" as const };
  }

  return {
    data: (data || []) as Competition[],
    error: null,
    source: "remote" as const,
  };
}

export async function loadUpcomingCompetitions(today = getTodayDateString()) {
  const { data, error, source } = await loadCompetitions();

  return {
    data: data.filter((competition) => isUpcomingCompetition(competition, today)),
    error,
    source,
  };
}

export async function loadAthleteCompetitionIds(athleteId: string) {
  const { data, error } = await supabase
    .from("athlete_competitions")
    .select("competition_id")
    .eq("athlete_id", athleteId);

  if (error) {
    return {
      data: readLocalCompetitionIds(athleteId),
      error: null,
      source: "local" as const,
    };
  }

  return {
    data: (data || []).map((row) => row.competition_id as string),
    error: null,
    source: "remote" as const,
  };
}

export async function saveAthleteCompetitions(
  athleteId: string,
  competitionIds: string[],
) {
  const { error: deleteError } = await supabase
    .from("athlete_competitions")
    .delete()
    .eq("athlete_id", athleteId);

  if (deleteError) {
    writeLocalCompetitionIds(athleteId, competitionIds);
    return { error: null, source: "local" as const };
  }

  if (competitionIds.length === 0) {
    writeLocalCompetitionIds(athleteId, []);
    return { error: null, source: "remote" as const };
  }

  const rows = competitionIds.map((competitionId) => ({
    athlete_id: athleteId,
    competition_id: competitionId,
  }));

  const { error: insertError } = await supabase
    .from("athlete_competitions")
    .insert(rows);

  if (insertError) {
    writeLocalCompetitionIds(athleteId, competitionIds);
    return { error: null, source: "local" as const };
  }

  writeLocalCompetitionIds(athleteId, competitionIds);
  return { error: null, source: "remote" as const };
}

export async function loadAthleteUpcomingCompetitions(athleteId: string) {
  const [{ data: upcoming }, { data: selectedIds }] = await Promise.all([
    loadUpcomingCompetitions(),
    loadAthleteCompetitionIds(athleteId),
  ]);

  const selected = upcoming.filter((competition) =>
    selectedIds.includes(competition.id),
  );

  return selected.sort((a, b) => a.start_date.localeCompare(b.start_date));
}
