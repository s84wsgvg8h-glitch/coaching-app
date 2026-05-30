import { supabase } from "@/lib/supabaseClient";

export type CoachSignupInvite = {
  id: string;
  token: string;
  label: string | null;
  active: boolean;
  expires_at: string;
  created_at: string;
};

const DEFAULT_VALID_DAYS = 5;

export function buildCoachSignupUrl(token: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://coaching-app-tan.vercel.app";

  return `${origin}/signup?coach-signup=${token}`;
}

export async function loadCoachSignupInvites() {
  const { data, error } = await supabase
    .from("coach_signup_invites")
    .select("*")
    .eq("active", true)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Coach signup links laden mislukt:", error.message);
    return [] as CoachSignupInvite[];
  }

  return (data || []) as CoachSignupInvite[];
}

export async function createCoachSignupInvite(
  createdBy: string,
  label?: string,
  validDays = DEFAULT_VALID_DAYS,
) {
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + validDays);

  return supabase
    .from("coach_signup_invites")
    .insert({
      token,
      label: label?.trim() || null,
      active: true,
      expires_at: expiresAt.toISOString(),
      created_by: createdBy,
    })
    .select("*")
    .single();
}

export async function deactivateCoachSignupInvite(inviteId: string) {
  return supabase
    .from("coach_signup_invites")
    .update({ active: false })
    .eq("id", inviteId);
}

export async function validateCoachSignupToken(token: string) {
  const { data, error } = await supabase.rpc("validate_coach_signup_token", {
    invite_token: token,
  });

  if (error || !data) {
    return false;
  }

  return Boolean(data);
}

export function formatInviteExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
