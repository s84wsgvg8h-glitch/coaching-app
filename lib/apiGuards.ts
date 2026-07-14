import type { SupabaseClient, User } from "@supabase/supabase-js";

type ProfileGateRow = {
  role: string | null;
  archived_at: string | null;
};

export async function assertActiveUserProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const { data, error } = await supabase
    .from("profiles")
    .select("role, archived_at")
    .eq("id", user.id)
    .maybeSingle<ProfileGateRow>();

  if (error || !data) {
    return { ok: false, error: "Profiel niet gevonden.", status: 403 };
  }

  if (data.archived_at) {
    return { ok: false, error: "Account gedeactiveerd.", status: 403 };
  }

  if (data.role === "pending") {
    return { ok: false, error: "Account wacht op goedkeuring.", status: 403 };
  }

  return { ok: true };
}
