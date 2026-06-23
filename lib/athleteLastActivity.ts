import { supabase } from "@/lib/supabaseClient";

export type AthleteLastActivity = {
  athleteId: string;
  lastActivityAt: string | null;
  daysAgo: number | null;
};

function daysSince(iso: string | null) {
  if (!iso) return null;
  const then = new Date(iso);
  const now = new Date();
  then.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export async function loadAthleteLastActivities(
  athleteIds: string[],
): Promise<Map<string, AthleteLastActivity>> {
  const result = new Map<string, AthleteLastActivity>();
  if (athleteIds.length === 0) return result;

  for (const id of athleteIds) {
    result.set(id, { athleteId: id, lastActivityAt: null, daysAgo: null });
  }

  const { data: sets } = await supabase
    .from("athlete_exercise_sets")
    .select("athlete_id, created_at")
    .in("athlete_id", athleteIds)
    .order("created_at", { ascending: false });

  for (const row of sets || []) {
    const athleteId = row.athlete_id as string;
    const updatedAt = row.created_at as string | null;
    if (!updatedAt) continue;

    const current = result.get(athleteId);
    if (!current) continue;

    if (
      !current.lastActivityAt ||
      new Date(updatedAt) > new Date(current.lastActivityAt)
    ) {
      current.lastActivityAt = updatedAt;
      current.daysAgo = daysSince(updatedAt);
    }
  }

  return result;
}

export function formatLastActivityLabel(daysAgo: number | null) {
  if (daysAgo === null) return "Nog niet actief";
  if (daysAgo === 0) return "Vandaag";
  if (daysAgo === 1) return "Gisteren";
  return `${daysAgo} dagen geleden`;
}

export function formatLastActivityRich(
  lastActivityAt: string | null,
  daysAgo: number | null,
) {
  if (!lastActivityAt || daysAgo === null) return "Nog niet actief";

  const then = new Date(lastActivityAt);
  const now = new Date();
  const diffHours = Math.max(
    1,
    Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60)),
  );

  if (daysAgo === 0) {
    return `Vandaag · ${diffHours}u geleden`;
  }

  if (daysAgo === 1) {
    return `Gisteren · ${diffHours}u geleden`;
  }

  return `${daysAgo} dagen geleden`;
}

export function formatLastActiveBadge(daysAgo: number | null) {
  const label = formatLastActivityLabel(daysAgo);
  return `Laatst actief · ${label.toLowerCase()}`;
}
