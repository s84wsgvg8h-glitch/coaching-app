import { isAdminRole } from "@/lib/authRoles";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import { supabase } from "@/lib/supabaseClient";

export type OrganisationMemberSource = "profile" | "member";

export type CoachOrganisationRow = {
  id: string;
  fullName: string;
  geboortedatum: string | null;
  lidnummer: string | null;
  source: OrganisationMemberSource;
  isAppAthlete: boolean;
};

export type CoachOrganisationUpdate = {
  fullName?: string;
  geboortedatum?: string | null;
  lidnummer?: string | null;
};

export function formatAthleteBirthDate(dateStr: string | null) {
  if (!dateStr) return null;
  const date = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export async function loadCoachOrganisationOverview(
  coachId: string,
  role: string,
): Promise<CoachOrganisationRow[]> {
  const ctx = (await loadCoachOrgContext(coachId)) || {
    coachId,
    role,
    organizationId: null,
  };
  ctx.role = role;

  let athletesQuery = supabase
    .from("profiles")
    .select("id, full_name, geboortedatum, lidnummer")
    .eq("role", "atleet")
    .order("full_name", { ascending: true });

  athletesQuery = applyAthleteScope(athletesQuery, ctx);

  let membersQuery = supabase
    .from("organization_members")
    .select("id, full_name, geboortedatum, lidnummer")
    .order("full_name", { ascending: true });

  if (isAdminRole(role)) {
    // Admin sees all organization members.
  } else if (ctx.organizationId) {
    membersQuery = membersQuery.or(
      `coach_id.eq.${coachId},organization_id.eq.${ctx.organizationId}`,
    );
  } else {
    membersQuery = membersQuery.eq("coach_id", coachId);
  }

  const [{ data: athletes, error: athletesError }, { data: members, error: membersError }] =
    await Promise.all([athletesQuery, membersQuery]);

  if (athletesError) {
    console.error("Organisatie-atleten laden mislukt:", athletesError.message);
  }
  if (membersError) {
    console.error("Verenigingsleden laden mislukt:", membersError.message);
  }

  const rows: CoachOrganisationRow[] = [];

  for (const athlete of athletes || []) {
    rows.push({
      id: athlete.id as string,
      fullName: (athlete.full_name as string) || "Naamloos",
      geboortedatum: (athlete.geboortedatum as string | null) || null,
      lidnummer: (athlete.lidnummer as string | null)?.trim() || null,
      source: "profile",
      isAppAthlete: true,
    });
  }

  for (const member of members || []) {
    rows.push({
      id: member.id as string,
      fullName: (member.full_name as string) || "Naamloos",
      geboortedatum: (member.geboortedatum as string | null) || null,
      lidnummer: (member.lidnummer as string | null)?.trim() || null,
      source: "member",
      isAppAthlete: false,
    });
  }

  rows.sort((a, b) => a.fullName.localeCompare(b.fullName, "nl"));

  return rows;
}

export async function updateCoachOrganisationAthlete(
  row: Pick<CoachOrganisationRow, "id" | "source">,
  update: CoachOrganisationUpdate,
): Promise<{ error: string | null }> {
  const payload: Record<string, string | null> = {};

  if (update.fullName !== undefined) {
    payload.full_name = update.fullName.trim() || "Naamloos";
  }
  if (update.geboortedatum !== undefined) {
    payload.geboortedatum = update.geboortedatum || null;
  }
  if (update.lidnummer !== undefined) {
    payload.lidnummer = update.lidnummer?.trim() || null;
  }

  if (Object.keys(payload).length === 0) {
    return { error: null };
  }

  const table = row.source === "profile" ? "profiles" : "organization_members";
  const { error } = await supabase.from(table).update(payload).eq("id", row.id);

  return { error: error?.message ?? null };
}

export async function createOrganizationMember(
  coachId: string,
  input: {
    fullName: string;
    geboortedatum?: string | null;
    lidnummer?: string | null;
  },
): Promise<{ data: CoachOrganisationRow | null; error: string | null }> {
  const ctx = await loadCoachOrgContext(coachId);

  const { data, error } = await supabase
    .from("organization_members")
    .insert({
      coach_id: coachId,
      organization_id: ctx?.organizationId ?? null,
      full_name: input.fullName.trim(),
      geboortedatum: input.geboortedatum || null,
      lidnummer: input.lidnummer?.trim() || null,
    })
    .select("id, full_name, geboortedatum, lidnummer")
    .single();

  if (error || !data) {
    return { data: null, error: error?.message ?? "Lid toevoegen mislukt." };
  }

  return {
    data: {
      id: data.id as string,
      fullName: (data.full_name as string) || "Naamloos",
      geboortedatum: (data.geboortedatum as string | null) || null,
      lidnummer: (data.lidnummer as string | null)?.trim() || null,
      source: "member",
      isAppAthlete: false,
    },
    error: null,
  };
}
