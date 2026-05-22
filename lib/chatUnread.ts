import { supabase } from "@/lib/supabaseClient";

export const CHAT_UNREAD_CHANGED_EVENT = "chat-unread-changed";

export function notifyChatUnreadChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHAT_UNREAD_CHANGED_EVENT));
  }
}

export async function getUnreadMessageCount(userId: string) {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) {
    return 0;
  }

  return count || 0;
}

export async function getUnreadCountForConversation(
  userId: string,
  otherUserId: string,
) {
  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("sender_id", otherUserId)
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) {
    return 0;
  }

  return count || 0;
}

export async function markConversationAsRead(
  userId: string,
  otherUserId: string,
) {
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherUserId)
    .eq("receiver_id", userId)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  notifyChatUnreadChanged();
}
