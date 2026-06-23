import { supabase } from "@/lib/supabaseClient";
import { getMessagePreview } from "@/lib/chatUtils";
import { getUnreadCountForConversation } from "@/lib/chatUnread";

export type AthleteCoachChatPreview = {
  coachId: string;
  coachName: string;
  coachAvatarUrl: string | null;
  previewText: string;
  previewSender: string;
  previewAt: string | null;
  unreadCount: number;
};

export async function loadAthleteCoachChatPreview(
  athleteId: string,
): Promise<AthleteCoachChatPreview | null> {
  const { data: athleteProfile } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", athleteId)
    .maybeSingle();

  const coachId = athleteProfile?.coach_id as string | undefined;
  if (!coachId) return null;

  const [{ data: coach }, { data: messages }, unreadCount] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url")
      .eq("id", coachId)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("id, body, sender_id, receiver_id, created_at, file_type, file_url, read_at")
      .or(
        `and(sender_id.eq.${athleteId},receiver_id.eq.${coachId}),and(sender_id.eq.${coachId},receiver_id.eq.${athleteId})`,
      )
      .order("created_at", { ascending: false })
      .limit(1),
    getUnreadCountForConversation(athleteId, coachId),
  ]);

  if (!coach) return null;

  const lastMessage = messages?.[0];
  const coachName = coach.full_name || "Coach";
  const preview = getMessagePreview(
    lastMessage || undefined,
    athleteId,
    coachName,
  );

  return {
    coachId,
    coachName,
    coachAvatarUrl: coach.avatar_url || null,
    previewText: preview.text,
    previewSender: preview.sender,
    previewAt: lastMessage?.created_at || null,
    unreadCount,
  };
}
