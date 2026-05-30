import { supabase } from "@/lib/supabaseClient";
import type { ChatMessage } from "@/lib/chatUtils";

export type DirectMessagePreview = {
  peerUserId: string;
  lastMessage: ChatMessage;
};

export type GroupMessagePreview = {
  groupId: string;
  lastMessage: ChatMessage;
};

export async function loadDirectMessagePreviews(userId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("group_id", null)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Direct message previews laden mislukt:", error.message);
    return new Map<string, ChatMessage>();
  }

  const previews = new Map<string, ChatMessage>();

  for (const message of (data || []) as ChatMessage[]) {
    const peerId =
      message.sender_id === userId ? message.receiver_id : message.sender_id;

    if (!peerId || previews.has(peerId)) continue;
    previews.set(peerId, message);
  }

  return previews;
}

export async function loadGroupMessagePreviews(groupIds: string[]) {
  if (groupIds.length === 0) {
    return new Map<string, ChatMessage>();
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Group message previews laden mislukt:", error.message);
    return new Map<string, ChatMessage>();
  }

  const previews = new Map<string, ChatMessage>();

  for (const message of (data || []) as ChatMessage[]) {
    if (!message.group_id || previews.has(message.group_id)) continue;
    previews.set(message.group_id, message);
  }

  return previews;
}
