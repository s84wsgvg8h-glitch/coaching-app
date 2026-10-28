import { supabase } from "@/lib/supabaseClient";
import type { ChatMessage } from "@/lib/chatUtils";

/** Recent messages shown first; full history loads in the background when needed. */
export const CHAT_INITIAL_MESSAGE_LIMIT = 80;

export async function loadDirectMessagesRecent(
  currentUserId: string,
  otherUserId: string,
  limit = CHAT_INITIAL_MESSAGE_LIMIT,
) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
    )
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data || []) as ChatMessage[]).reverse();
}

export async function loadDirectMessagesAll(
  currentUserId: string,
  otherUserId: string,
) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(
      `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`,
    )
    .is("group_id", null)
    .order("created_at", { ascending: true });

  return (data || []) as ChatMessage[];
}

export async function loadGroupMessagesRecent(
  groupId: string,
  limit = CHAT_INITIAL_MESSAGE_LIMIT,
) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data || []) as ChatMessage[]).reverse();
}

export async function loadGroupMessagesAll(groupId: string) {
  const { data } = await supabase
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: true });

  return (data || []) as ChatMessage[];
}
