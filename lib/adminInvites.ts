import { supabase } from "@/lib/supabaseClient";
import type { CoachInviteLink } from "@/lib/coachInviteLinks";
import type { CoachSignupInvite } from "@/lib/coachSignupInvites";
import type { AdminPlatformInvite } from "@/lib/adminPlatformInvites";

export type AdminAthleteInvite = CoachInviteLink & {
  coach_name: string | null;
  coach_email: string | null;
};

export type AdminInviteOverview = {
  coachSignupInvites: CoachSignupInvite[];
  athleteInvites: AdminAthleteInvite[];
  platformInvites: AdminPlatformInvite[];
};

export async function loadAdminInviteOverview(): Promise<AdminInviteOverview> {
  const [signupResult, athleteResult, coachesResult, platformResult] =
    await Promise.all([
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
    supabase
      .from("admin_platform_invites")
      .select("*")
      .order("created_at", { ascending: false }),
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
    platformInvites: (platformResult.data || []) as AdminPlatformInvite[],
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

export async function revokeAdminPlatformInvite(inviteId: string) {
  return supabase
    .from("admin_platform_invites")
    .update({ active: false })
    .eq("id", inviteId);
}
