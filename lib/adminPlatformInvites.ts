import { getAppOrigin } from "@/lib/appUrl";
import { supabase } from "@/lib/supabaseClient";

export type AdminPlatformInviteKind = "organization" | "athlete";

export type AdminPlatformInvite = {
  id: string;
  token: string;
  invite_kind: AdminPlatformInviteKind;
  organization_id: string | null;
  requires_intake: boolean;
  label: string | null;
  active: boolean;
  expires_at: string;
  created_at: string;
};

export function buildPlatformInviteUrl(token: string) {
  return `${getAppOrigin()}/signup?platform=${token}`;
}

export async function createAdminPlatformInvite(params: {
  createdBy: string;
  kind: AdminPlatformInviteKind;
  organizationId?: string | null;
  requiresIntake?: boolean;
  label?: string;
  validDays?: number;
}) {
  const token = crypto.randomUUID().replace(/-/g, "");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (params.validDays ?? 7));

  return supabase
    .from("admin_platform_invites")
    .insert({
      token,
      invite_kind: params.kind,
      organization_id:
        params.kind === "organization" ? params.organizationId || null : null,
      requires_intake: params.requiresIntake !== false,
      label: params.label?.trim() || null,
      active: true,
      expires_at: expiresAt.toISOString(),
      created_by: params.createdBy,
    })
    .select("*")
    .single();
}

export async function validateAdminPlatformInvite(token: string) {
  const { data, error } = await supabase.rpc("validate_admin_platform_invite", {
    invite_token: token,
  });

  if (error || !data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  return data[0] as {
    invite_kind: AdminPlatformInviteKind;
    organization_id: string | null;
    requires_intake: boolean;
  };
}

export async function loadAdminPlatformInvites() {
  const { data, error } = await supabase
    .from("admin_platform_invites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Platform invites laden mislukt:", error.message);
    return [] as AdminPlatformInvite[];
  }

  return (data || []) as AdminPlatformInvite[];
}

export async function revokeAdminPlatformInvite(inviteId: string) {
  return supabase
    .from("admin_platform_invites")
    .update({ active: false })
    .eq("id", inviteId);
}

export function formatPlatformInviteExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
