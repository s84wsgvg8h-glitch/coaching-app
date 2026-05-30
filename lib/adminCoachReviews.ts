import { supabase } from "@/lib/supabaseClient";

export type CoachApprovalReview = {
  id: string;
  profile_id: string;
  admin_id: string | null;
  action: "accepted" | "rejected";
  notes: string | null;
  created_at: string;
  admin_name?: string | null;
  profile_name?: string | null;
};

export async function insertCoachApprovalReview(params: {
  profileId: string;
  adminId: string;
  action: "accepted" | "rejected";
  notes?: string | null;
}) {
  return supabase.from("coach_approval_reviews").insert({
    profile_id: params.profileId,
    admin_id: params.adminId,
    action: params.action,
    notes: params.notes?.trim() || null,
  });
}

export async function loadCoachApprovalReviews(
  profileId?: string,
): Promise<CoachApprovalReview[]> {
  let query = supabase
    .from("coach_approval_reviews")
    .select("*")
    .order("created_at", { ascending: false });

  if (profileId) {
    query = query.eq("profile_id", profileId);
  }

  const { data, error } = await query.limit(200);

  if (error) {
    console.error("Coach reviews laden mislukt:", error.message);
    return [];
  }

  const rows = (data || []) as CoachApprovalReview[];
  const profileIds = [...new Set(rows.map((r) => r.profile_id))];
  const adminIds = [
    ...new Set(rows.map((r) => r.admin_id).filter(Boolean)),
  ] as string[];

  const allIds = [...new Set([...profileIds, ...adminIds])];
  if (allIds.length === 0) return rows;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", allIds);

  const nameMap = new Map(
    (profiles || []).map((p) => [p.id, p.full_name]),
  );

  return rows.map((row) => ({
    ...row,
    profile_name: nameMap.get(row.profile_id) ?? null,
    admin_name: row.admin_id ? nameMap.get(row.admin_id) ?? null : null,
  }));
}
