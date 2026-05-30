import { supabase } from "@/lib/supabaseClient";

export type CoachInviteLink = {
  id: string;
  coach_id: string;
  token: string;
  label: string | null;
  active: boolean;
  created_at: string;
  expires_at: string | null;
};

const INVITE_VALID_DAYS = 4;

export function isInviteLinkExpired(link: Pick<CoachInviteLink, "expires_at">) {
  if (!link.expires_at) return false;
  return new Date(link.expires_at).getTime() <= Date.now();
}

export function getInviteExpiryDate(link: Pick<CoachInviteLink, "expires_at" | "created_at">) {
  if (link.expires_at) return new Date(link.expires_at);
  const created = new Date(link.created_at);
  created.setDate(created.getDate() + INVITE_VALID_DAYS);
  return created;
}

export function formatInviteExpiry(link: Pick<CoachInviteLink, "expires_at" | "created_at">) {
  return getInviteExpiryDate(link).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function buildCoachInviteUrl(token: string) {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://coaching-app-tan.vercel.app";

  return `${origin}/signup?coach=${token}`;
}

export async function loadCoachInviteLinks(coachId: string) {
  const { data, error } = await supabase
    .from("coach_invite_links")
    .select("*")
    .eq("coach_id", coachId)
    .eq("active", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Uitnodigingslinks laden mislukt:", error.message);
    return [] as CoachInviteLink[];
  }

  return ((data || []) as CoachInviteLink[]).filter(
    (link) => !isInviteLinkExpired(link),
  );
}

export async function createCoachInviteLink(coachId: string, label?: string) {
  const token = crypto.randomUUID().replace(/-/g, "");

  return supabase
    .from("coach_invite_links")
    .insert({
      coach_id: coachId,
      token,
      label: label?.trim() || null,
      active: true,
    })
    .select("*")
    .single();
}

export async function deactivateCoachInviteLink(linkId: string) {
  return supabase
    .from("coach_invite_links")
    .update({ active: false })
    .eq("id", linkId);
}

export async function validateCoachInviteToken(token: string) {
  const { data, error } = await supabase.rpc("validate_coach_invite_token", {
    invite_token: token,
  });

  if (error || !data) {
    return null;
  }

  return data as string;
}
