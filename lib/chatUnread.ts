import { supabase } from "@/lib/supabaseClient";

export const CHAT_UNREAD_CHANGED_EVENT = "chat-unread-changed";

export function notifyChatUnreadChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHAT_UNREAD_CHANGED_EVENT));
  }
}

async function getMutedPeerUserIds(userId: string) {
  const { data } = await supabase
    .from("chat_conversation_settings")
    .select("peer_user_id")
    .eq("user_id", userId)
    .eq("muted", true)
    .not("peer_user_id", "is", null);

  return (data || [])
    .map((row) => row.peer_user_id)
    .filter((id): id is string => Boolean(id));
}

export async function getUnreadMessageCount(userId: string) {
  const mutedPeerIds = await getMutedPeerUserIds(userId);

  let query = supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("receiver_id", userId)
    .is("read_at", null);

  for (const peerId of mutedPeerIds) {
    query = query.neq("sender_id", peerId);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count || 0;
}

export async function getUnreadCountForConversation(
  userId: string,
  otherUserId: string,
  options?: { muted?: boolean },
) {
  if (options?.muted) {
    return 0;
  }

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
