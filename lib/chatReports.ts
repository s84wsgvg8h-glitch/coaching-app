import { supabase } from "@/lib/supabaseClient";

export const CHAT_REPORT_REASONS = [
  { id: "spam", label: "Spam of ongewenste content" },
  { id: "harassment", label: "Intimidatie of pesten" },
  { id: "inappropriate", label: "Ongepaste content" },
  { id: "other", label: "Anders" },
] as const;

export type ChatReportReasonId = (typeof CHAT_REPORT_REASONS)[number]["id"];

export type ChatReportInput = {
  reportedUserId?: string | null;
  messageId?: string | null;
  groupId?: string | null;
  reason: ChatReportReasonId;
  details?: string;
};

export async function submitChatReport(input: ChatReportInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Niet ingelogd.") };
  }

  const details = input.details?.trim() || null;

  const { error } = await supabase.from("chat_content_reports").insert({
    reporter_id: user.id,
    reported_user_id: input.reportedUserId || null,
    message_id: input.messageId || null,
    group_id: input.groupId || null,
    reason: input.reason,
    details,
    status: "pending",
  });

  return { error };
}
