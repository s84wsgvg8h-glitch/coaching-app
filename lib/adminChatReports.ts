import { supabase } from "@/lib/supabaseClient";

export type ChatContentReportRow = {
  id: string;
  reporter_id: string;
  reported_user_id: string | null;
  message_id: string | null;
  group_id: string | null;
  reason: string;
  details: string | null;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type ChatContentReportView = ChatContentReportRow & {
  reporter_name: string;
  reported_name: string | null;
};

const REASON_LABELS: Record<string, string> = {
  spam: "Spam",
  harassment: "Intimidatie",
  inappropriate: "Ongepast",
  other: "Anders",
};

export function getChatReportReasonLabel(reason: string) {
  return REASON_LABELS[reason] ?? reason;
}

export async function loadChatContentReports() {
  const { data, error } = await supabase
    .from("chat_content_reports")
    .select(
      "id, reporter_id, reported_user_id, message_id, group_id, reason, details, status, created_at, reviewed_at, reviewed_by",
    )
    .order("created_at", { ascending: false })
    .limit(250);

  if (error || !data) {
    return { reports: [] as ChatContentReportView[], error };
  }

  const userIds = new Set<string>();
  for (const row of data) {
    userIds.add(row.reporter_id);
    if (row.reported_user_id) userIds.add(row.reported_user_id);
  }

  let nameById: Record<string, string> = {};
  if (userIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", [...userIds]);

    nameById = Object.fromEntries(
      (profiles || []).map((profile) => [
        profile.id,
        profile.full_name || "Onbekend",
      ]),
    );
  }

  const reports: ChatContentReportView[] = data.map((row) => ({
    ...(row as ChatContentReportRow),
    reporter_name: nameById[row.reporter_id] || "Onbekend",
    reported_name: row.reported_user_id
      ? nameById[row.reported_user_id] || "Onbekend"
      : null,
  }));

  return { reports, error: null };
}

export async function updateChatContentReportStatus(
  reportId: string,
  status: ChatContentReportRow["status"],
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Niet ingelogd.") };
  }

  const { error } = await supabase
    .from("chat_content_reports")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user.id,
    })
    .eq("id", reportId);

  return { error };
}
