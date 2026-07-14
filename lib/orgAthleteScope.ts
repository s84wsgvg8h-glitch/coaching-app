import { isAdminRole } from "@/lib/authRoles";
import { supabase } from "@/lib/supabaseClient";

export type CoachOrgContext = {
  coachId: string;
  role: string;
  organizationId: string | null;
};

export async function loadCoachOrgContext(
  coachId: string,
): Promise<CoachOrgContext | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("id", coachId)
    .single();

  if (!profile) return null;

  return {
    coachId,
    role: profile.role || "",
    organizationId: profile.organization_id ?? null,
  };
}

/** Apply org/coach scoping to a profiles query. Admin sees all. */
export function applyAthleteScope(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase query builder chain types vary by select()
  query: any,
  ctx: CoachOrgContext,
  options?: { includeArchived?: boolean },
) {
  if (!options?.includeArchived) {
    query = query.is("archived_at", null);
  }

  if (isAdminRole(ctx.role)) return query;

  if (ctx.organizationId) {
    return query.or(
      `coach_id.eq.${ctx.coachId},organization_id.eq.${ctx.organizationId}`,
    );
  }

  return query.eq("coach_id", ctx.coachId);
}

export async function removeAthleteFromOrganization(athleteId: string) {
  const { error } = await supabase.rpc("archive_athlete_for_coach", {
    p_athlete_id: athleteId,
  });

  return { error };
}

export async function restoreAthleteForCoach(athleteId: string) {
  const { error } = await supabase.rpc("restore_athlete_for_coach", {
    p_athlete_id: athleteId,
  });

  return { error };
}

export async function loadArchivedAthletesForCoach(coachId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, geboortedatum, lidnummer, betaling_prijs, betaling_dag, archived_at")
    .eq("role", "atleet")
    .eq("archived_by_coach_id", coachId)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (error) {
    console.error("Gearchiveerde atleten laden mislukt:", error.message);
    return [];
  }

  return data || [];
}

export async function syncAthleteOrganizationFromCoach(
  athleteId: string,
  coachId: string | null,
) {
  if (!coachId) {
    await supabase
      .from("profiles")
      .update({ organization_id: null })
      .eq("id", athleteId);
    return;
  }

  const { data: coach } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", coachId)
    .single();

  if (coach?.organization_id) {
    await supabase
      .from("profiles")
      .update({ organization_id: coach.organization_id })
      .eq("id", athleteId);
  }
}

export function normalizeJoinedCompetition(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  if (Array.isArray(raw)) {
    return raw.length > 0 ? (raw[0] as Record<string, unknown>) : null;
  }
  return raw as Record<string, unknown>;
}
