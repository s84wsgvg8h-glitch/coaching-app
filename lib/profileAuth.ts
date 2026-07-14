import { getRealSupabase } from "@/lib/supabaseClient";

export type AuthenticatedProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  pending_kind?: string | null;
  coach_id?: string | null;
  business_name?: string | null;
  intake_completed_at?: string | null;
  intake_required?: boolean | null;
  archived_at?: string | null;
};

export async function loadAuthenticatedProfile(
  userId: string,
): Promise<AuthenticatedProfile | null> {
  const client = getRealSupabase();

  const { data: rpcRows, error: rpcError } = await client.rpc("get_my_profile");

  if (!rpcError && Array.isArray(rpcRows) && rpcRows.length > 0) {
    const row = rpcRows[0] as AuthenticatedProfile;
    if (row.id === userId) {
      if (row.role === "pending" && row.pending_kind == null) {
        const { data: pendingRow } = await client
          .from("profiles")
          .select("pending_kind")
          .eq("id", userId)
          .maybeSingle();
        return { ...row, pending_kind: pendingRow?.pending_kind ?? null };
      }
      return row;
    }
  }

  const { data, error } = await client
    .from("profiles")
    .select(
      "id, full_name, role, pending_kind, coach_id, business_name, intake_completed_at, intake_required, archived_at",
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Profiel laden mislukt:", error.message);
  }

  return (data as AuthenticatedProfile | null) || null;
}
