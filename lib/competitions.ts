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
  coach_notes?: string | null;
  goals?: string | null;
};

export type AthleteCompetitionNotes = {
  competitionId: string;
  coachNotes: string | null;
  goals: string | null;
  meetResults: MeetResults;
};

export type MeetResults = {
  squatKg: number | null;
  benchKg: number | null;
  deadliftKg: number | null;
  totalKg: number | null;
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
  const result = await loadAthleteCompetitionNotes(athleteId);
  return {
    data: result.data.map((entry) => entry.competitionId),
    error: result.error,
    source: result.source,
  };
}

export async function loadAthleteCompetitionNotes(athleteId: string) {
  const { data, error } = await supabase
    .from("athlete_competitions")
    .select(
      "competition_id, coach_notes, goals, squat_kg, bench_kg, deadlift_kg, total_kg",
    )
    .eq("athlete_id", athleteId);

  if (error) {
    const localIds = readLocalCompetitionIds(athleteId);
    return {
      data: localIds.map((competitionId) => ({
        competitionId,
        coachNotes: null,
        goals: null,
        meetResults: {
          squatKg: null,
          benchKg: null,
          deadliftKg: null,
          totalKg: null,
        },
      })),
      error: null,
      source: "local" as const,
    };
  }

  return {
    data: (data || []).map((row) => ({
      competitionId: row.competition_id as string,
      coachNotes: (row.coach_notes as string | null) ?? null,
      goals: (row.goals as string | null) ?? null,
      meetResults: {
        squatKg: row.squat_kg != null ? Number(row.squat_kg) : null,
        benchKg: row.bench_kg != null ? Number(row.bench_kg) : null,
        deadliftKg: row.deadlift_kg != null ? Number(row.deadlift_kg) : null,
        totalKg: row.total_kg != null ? Number(row.total_kg) : null,
      },
    })),
    error: null,
    source: "remote" as const,
  };
}

export async function saveAthleteCompetitionNotes(
  athleteId: string,
  competitionId: string,
  notes: { coachNotes?: string | null; goals?: string | null },
) {
  const { error } = await supabase
    .from("athlete_competitions")
    .update({
      coach_notes: notes.coachNotes?.trim() || null,
      goals: notes.goals?.trim() || null,
    })
    .eq("athlete_id", athleteId)
    .eq("competition_id", competitionId);

  return { error, source: "remote" as const };
}

export async function saveAthleteCompetitions(
  athleteId: string,
  competitionIds: string[],
  notesByCompetitionId?: Record<
    string,
    { coachNotes?: string | null; goals?: string | null }
  >,
) {
  const existingNotes = await loadAthleteCompetitionNotes(athleteId);
  const notesMap = new Map(
    existingNotes.data.map((entry) => [entry.competitionId, entry]),
  );

  for (const [competitionId, notes] of Object.entries(
    notesByCompetitionId || {},
  )) {
    const existing = notesMap.get(competitionId);
    notesMap.set(competitionId, {
      competitionId,
      coachNotes: notes.coachNotes ?? null,
      goals: notes.goals ?? null,
      meetResults: existing?.meetResults ?? {
        squatKg: null,
        benchKg: null,
        deadliftKg: null,
        totalKg: null,
      },
    });
  }

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

  const rows = competitionIds.map((competitionId) => {
    const saved = notesMap.get(competitionId);
    return {
      athlete_id: athleteId,
      competition_id: competitionId,
      coach_notes: saved?.coachNotes?.trim() || null,
      goals: saved?.goals?.trim() || null,
    };
  });

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

export type AthleteUpcomingCompetition = Competition & {
  coachNotes: string | null;
  goals: string | null;
  meetResults: MeetResults;
};

export async function saveMeetResults(
  athleteId: string,
  competitionId: string,
  results: MeetResults,
) {
  const { error } = await supabase
    .from("athlete_competitions")
    .update({
      squat_kg: results.squatKg,
      bench_kg: results.benchKg,
      deadlift_kg: results.deadliftKg,
      total_kg: results.totalKg,
    })
    .eq("athlete_id", athleteId)
    .eq("competition_id", competitionId);

  return { error };
}

export async function loadAthleteUpcomingCompetitions(athleteId: string) {
  const [{ data: upcoming }, { data: registrations }] = await Promise.all([
    loadUpcomingCompetitions(),
    loadAthleteCompetitionNotes(athleteId),
  ]);

  const registrationById = new Map(
    registrations.map((entry) => [entry.competitionId, entry]),
  );

  const selected = upcoming
    .filter((competition) => registrationById.has(competition.id))
    .map((competition) => {
      const registration = registrationById.get(competition.id);
      return {
        ...competition,
        coachNotes: registration?.coachNotes ?? null,
        goals: registration?.goals ?? null,
        meetResults: registration?.meetResults ?? {
          squatKg: null,
          benchKg: null,
          deadliftKg: null,
          totalKg: null,
        },
      };
    });

  return selected.sort((a, b) => a.start_date.localeCompare(b.start_date));
}

export type CoachAthleteCompetitionEntry = {
  athleteId: string;
  athleteName: string;
  athleteAvailabilityNote: string | null;
  competition: Competition;
};

export function formatAthleteShortName(
  fullName: string,
  allFullNames: string[],
): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] || "Atleet";
  const normalizedFirst = firstName.toLowerCase();

  const hasDuplicateFirstName = allFullNames.filter((name) => {
    const otherFirst = name.trim().split(/\s+/)[0] || "";
    return otherFirst.toLowerCase() === normalizedFirst;
  }).length > 1;

  const capitalizedFirst =
    firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();

  if (!hasDuplicateFirstName) {
    return capitalizedFirst;
  }

  if (parts.length > 1) {
    const lastInitial = parts[parts.length - 1]![0]?.toUpperCase() || "";
    return lastInitial ? `${capitalizedFirst} ${lastInitial}.` : capitalizedFirst;
  }

  return capitalizedFirst;
}

export async function loadCoachAthleteCompetitions(today = getTodayDateString()) {
  const { data: rows, error } = await supabase
    .from("athlete_competitions")
    .select("athlete_id, competition_id");

  if (error || !rows?.length) {
    return [] as CoachAthleteCompetitionEntry[];
  }

  const athleteIds = [...new Set(rows.map((row) => row.athlete_id as string))];
  const competitionIds = [
    ...new Set(rows.map((row) => row.competition_id as string)),
  ];

  const [{ data: profiles }, { data: competitions }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, availability_note")
      .in("id", athleteIds),
    supabase
      .from("wedstrijden")
      .select("id, naam, start_date, end_date")
      .in("id", competitionIds),
  ]);

  const profileById = new Map(
    (profiles || []).map((profile) => [
      profile.id as string,
      {
        name: profile.full_name as string | null,
        availabilityNote: (profile.availability_note as string | null) ?? null,
      },
    ]),
  );
  const competitionById = new Map(
    (competitions || []).map((competition) => [
      competition.id as string,
      competition as Competition,
    ]),
  );

  const entries: CoachAthleteCompetitionEntry[] = [];

  for (const row of rows) {
    const competition = competitionById.get(row.competition_id as string);
    if (!competition || !isUpcomingCompetition(competition, today)) continue;

    const profile = profileById.get(row.athlete_id as string);
    entries.push({
      athleteId: row.athlete_id as string,
      athleteName: profile?.name || "Atleet",
      athleteAvailabilityNote: profile?.availabilityNote ?? null,
      competition,
    });
  }

  return entries.sort((a, b) =>
    a.competition.start_date.localeCompare(b.competition.start_date),
  );
}

export async function createCompetition(input: {
  naam: string;
  startDate: string;
  endDate?: string;
}) {
  const resolvedEndDate = input.endDate?.trim() || input.startDate;

  const { data, error } = await supabase
    .from("wedstrijden")
    .insert({
      naam: input.naam.trim(),
      datum: input.startDate,
      start_date: input.startDate,
      end_date: resolvedEndDate,
    })
    .select("id, naam, start_date, end_date, created_at")
    .single();

  return {
    data: (data as Competition | null) ?? null,
    error,
  };
}

export async function linkAthleteToCompetition(
  athleteId: string,
  competitionId: string,
) {
  const { data: existing, error: lookupError } = await supabase
    .from("athlete_competitions")
    .select("id")
    .eq("athlete_id", athleteId)
    .eq("competition_id", competitionId)
    .maybeSingle();

  if (lookupError) {
    return { error: lookupError };
  }

  if (existing) {
    return { error: null };
  }

  const { error } = await supabase.from("athlete_competitions").insert({
    athlete_id: athleteId,
    competition_id: competitionId,
  });

  return { error };
}
