import { supabase } from "@/lib/supabaseClient";
import { applyAthleteScope, loadCoachOrgContext } from "@/lib/orgAthleteScope";
import { isAdminRole } from "@/lib/authRoles";

export type CoachClientNoteRow = {
  id: string;
  athleteId: string;
  athleteName: string;
  snippet: string;
  href: string;
  updatedAt: string;
  source: "exercise" | "checkin";
};

function firstName(fullName: string | null | undefined) {
  if (!fullName) return "Atleet";
  return fullName.split(/\s+/)[0] || fullName;
}

function trimSnippet(text: string, max = 120) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1).trim()}…`;
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) return "Zojuist";
  if (diffHours < 24) return `${diffHours} uur geleden`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Gisteren";
  if (diffDays < 7) return `${diffDays} dagen geleden`;
  return date.toLocaleDateString("nl-NL", { day: "numeric", month: "short" });
}

export { formatRelativeTime as formatCoachNoteRelativeTime };

export async function loadCoachClientNotes(
  coachId: string,
  role: string,
  limit = 5,
): Promise<CoachClientNoteRow[]> {
  const ctx = await loadCoachOrgContext(coachId);
  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  if (ctx) {
    athletesQuery = applyAthleteScope(athletesQuery, { ...ctx, role });
  }

  const { data: athletes, error: athletesError } = await athletesQuery;
  if (athletesError || !athletes?.length) return [];

  const athleteIds = athletes.map((row) => row.id as string);
  const nameById = new Map(
    athletes.map((row) => [row.id as string, row.full_name as string | null]),
  );

  const since = new Date();
  since.setDate(since.getDate() - 14);

  const [{ data: exerciseNotes }, { data: checkinNotes }] = await Promise.all([
    supabase
      .from("athlete_exercise_notes")
      .select("id, athlete_id, notes, updated_at, created_at")
      .in("athlete_id", athleteIds)
      .not("notes", "is", null)
      .gte("updated_at", since.toISOString())
      .order("updated_at", { ascending: false })
      .limit(limit * 2),
    supabase
      .from("athlete_day_checkins")
      .select("id, athlete_id, notes, updated_at, created_at")
      .in("athlete_id", athleteIds)
      .not("notes", "is", null)
      .gte("updated_at", since.toISOString())
      .order("updated_at", { ascending: false })
      .limit(limit * 2),
  ]);

  const rows: CoachClientNoteRow[] = [];

  for (const row of exerciseNotes || []) {
    const notes = String(row.notes || "").trim();
    if (!notes) continue;
    const athleteId = row.athlete_id as string;
    rows.push({
      id: `exercise-${row.id}`,
      athleteId,
      athleteName: firstName(nameById.get(athleteId)),
      snippet: trimSnippet(notes),
      href: `/athletes/${athleteId}`,
      updatedAt: (row.updated_at as string) || (row.created_at as string),
      source: "exercise",
    });
  }

  for (const row of checkinNotes || []) {
    const notes = String(row.notes || "").trim();
    if (!notes) continue;
    const athleteId = row.athlete_id as string;
    rows.push({
      id: `checkin-${row.id}`,
      athleteId,
      athleteName: firstName(nameById.get(athleteId)),
      snippet: trimSnippet(notes),
      href: `/athletes/${athleteId}`,
      updatedAt: (row.updated_at as string) || (row.created_at as string),
      source: "checkin",
    });
  }

  rows.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  return rows.slice(0, limit);
}

export async function loadCoachClientNotesCount(
  coachId: string,
  role: string,
): Promise<number> {
  const notes = await loadCoachClientNotes(coachId, role, 20);
  return notes.length;
}
