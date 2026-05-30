import { supabase } from "@/lib/supabaseClient";
import type { CoachInviteLink } from "@/lib/coachInviteLinks";
import type { CoachSignupInvite } from "@/lib/coachSignupInvites";

export type AdminAthleteInvite = CoachInviteLink & {
  coach_name: string | null;
  coach_email: string | null;
};

export type AdminInviteOverview = {
  coachSignupInvites: CoachSignupInvite[];
  athleteInvites: AdminAthleteInvite[];
};

export async function loadAdminInviteOverview(): Promise<AdminInviteOverview> {
  const [signupResult, athleteResult, coachesResult] = await Promise.all([
    supabase
      .from("coach_signup_invites")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("coach_invite_links")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("role", ["coach", "admin"]),
  ]);

  const coachMap = new Map(
    (coachesResult.data || []).map((coach) => [
      coach.id,
      coach.full_name || "Coach",
    ]),
  );

  const athleteInvites: AdminAthleteInvite[] = (
    (athleteResult.data || []) as CoachInviteLink[]
  ).map((link) => ({
    ...link,
    coach_name: coachMap.get(link.coach_id) ?? null,
    coach_email: null,
  }));

  return {
    coachSignupInvites: (signupResult.data || []) as CoachSignupInvite[],
    athleteInvites,
  };
}

export async function revokeCoachSignupInvite(inviteId: string) {
  return supabase
    .from("coach_signup_invites")
    .update({ active: false })
    .eq("id", inviteId);
}

export async function revokeAthleteInviteLink(linkId: string) {
  return supabase
    .from("coach_invite_links")
    .update({ active: false })
    .eq("id", linkId);
}
