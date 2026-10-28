/** Fields loaded for profile settings pages (avoid select("*")). */
export const PROFILE_DETAILS_SELECT =
  "id, full_name, role, lidnummer, geboortedatum, goals_text, avatar_url, business_name, coach_id" as const;

export type ProfileDetailsRow = {
  id: string;
  full_name: string | null;
  role: string | null;
  lidnummer: string | null;
  geboortedatum: string | null;
  goals_text: string | null;
  avatar_url: string | null;
  business_name: string | null;
  coach_id: string | null;
};

export function profileDetailsFromAuth(profile: {
  id?: string;
  full_name?: string | null;
  role?: string | null;
  business_name?: string | null;
  coach_id?: string | null;
} | null): Partial<ProfileDetailsRow> {
  if (!profile) return {};
  return {
    id: profile.id,
    full_name: profile.full_name ?? null,
    role: profile.role ?? null,
    business_name: profile.business_name ?? null,
    coach_id: profile.coach_id ?? null,
  };
}
