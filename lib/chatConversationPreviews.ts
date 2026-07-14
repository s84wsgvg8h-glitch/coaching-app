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

const PREVIEW_SCAN_LIMIT = 400;

async function loadLatestDirectMessage(userId: string, peerId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("group_id", null)
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`,
    )
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ChatMessage;
}

async function loadLatestGroupMessage(groupId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  return data as ChatMessage;
}

/** Latest DM per peer — bounded queries instead of scanning full message history. */
export async function loadDirectMessagePreviews(
  userId: string,
  peerIds?: string[],
) {
  if (peerIds) {
    if (peerIds.length === 0) return new Map<string, ChatMessage>();

    const entries = await Promise.all(
      peerIds.map(async (peerId) => {
        const message = await loadLatestDirectMessage(userId, peerId);
        return [peerId, message] as const;
      }),
    );

    const previews = new Map<string, ChatMessage>();
    for (const [peerId, message] of entries) {
      if (message) previews.set(peerId, message);
    }
    return previews;
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .is("group_id", null)
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(PREVIEW_SCAN_LIMIT);

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

  if (groupIds.length <= 24) {
    const entries = await Promise.all(
      groupIds.map(async (groupId) => {
        const message = await loadLatestGroupMessage(groupId);
        return [groupId, message] as const;
      }),
    );

    const previews = new Map<string, ChatMessage>();
    for (const [groupId, message] of entries) {
      if (message) previews.set(groupId, message);
    }
    return previews;
  }

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("group_id", groupIds)
    .order("created_at", { ascending: false })
    .limit(PREVIEW_SCAN_LIMIT);

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
