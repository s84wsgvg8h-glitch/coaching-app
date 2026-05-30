import { supabase } from "@/lib/supabaseClient";

export type CoachOrganization = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
};

export function slugifyOrgName(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export async function loadCoachOrganizations(): Promise<CoachOrganization[]> {
  const { data, error } = await supabase
    .from("coach_organizations")
    .select("*")
    .order("name");

  if (error) {
    console.error("Organisaties laden mislukt:", error.message);
    return [];
  }

  return (data || []) as CoachOrganization[];
}

export async function createCoachOrganization(name: string, slug?: string) {
  const finalSlug = slug?.trim() || slugifyOrgName(name);

  return supabase
    .from("coach_organizations")
    .insert({ name: name.trim(), slug: finalSlug })
    .select("*")
    .single();
}

export async function updateCoachOrganization(
  id: string,
  patch: { name?: string; slug?: string },
) {
  return supabase.from("coach_organizations").update(patch).eq("id", id);
}

export async function deleteCoachOrganization(id: string) {
  await supabase
    .from("profiles")
    .update({ organization_id: null })
    .eq("organization_id", id);

  return supabase.from("coach_organizations").delete().eq("id", id);
}

export async function assignCoachOrganization(
  profileId: string,
  organizationId: string | null,
) {
  return supabase
    .from("profiles")
    .update({ organization_id: organizationId })
    .eq("id", profileId);
}
