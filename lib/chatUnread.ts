import { supabase } from "@/lib/supabaseClient";
import { upsertDirectReadState } from "@/lib/chatReadState";

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

async function getMutedGroupIds(userId: string) {
  const { data } = await supabase
    .from("chat_conversation_settings")
    .select("group_id")
    .eq("user_id", userId)
    .eq("muted", true)
    .not("group_id", "is", null);

  return new Set(
    (data || [])
      .map((row) => row.group_id)
      .filter((id): id is string => Boolean(id)),
  );
}

async function countGroupUnreadMessages(userId: string, groupId: string) {
  const [{ data: legacyReadState }, { data: modernReadState }, { data: membership }] =
    await Promise.all([
      supabase
        .from("chat_group_read_states")
        .select("last_read_at")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("chat_read_state")
        .select("last_read_at")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("chat_group_members")
        .select("joined_at, created_at")
        .eq("group_id", groupId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

  const lastReadCandidates = [
    legacyReadState?.last_read_at,
    modernReadState?.last_read_at,
    membership?.joined_at,
    membership?.created_at,
  ].filter(Boolean) as string[];

  const lastReadAt =
    lastReadCandidates.length > 0
      ? lastReadCandidates.reduce((latest, current) =>
          new Date(current) > new Date(latest) ? current : latest,
        )
      : null;

  if (!lastReadAt) {
    return 0;
  }

  const { count, error } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId)
    .neq("sender_id", userId)
    .gt("created_at", lastReadAt);

  if (error) return 0;
  return count || 0;
}

export async function getTotalUnreadMessageCount(userId: string) {
  const mutedPeerIds = new Set(await getMutedPeerUserIds(userId));
  const mutedGroupIds = await getMutedGroupIds(userId);

  const { data: directPeers } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("receiver_id", userId)
    .is("group_id", null)
    .not("sender_id", "is", null);

  const uniquePeerIds = Array.from(
    new Set(
      (directPeers || [])
        .map((row) => row.sender_id as string)
        .filter(Boolean),
    ),
  );

  let total = 0;
  for (const peerId of uniquePeerIds) {
    if (mutedPeerIds.has(peerId)) continue;
    total += await getUnreadCountForConversation(userId, peerId);
  }

  const { data: memberships } = await supabase
    .from("chat_group_members")
    .select("group_id")
    .eq("user_id", userId);

  for (const row of memberships || []) {
    const groupId = row.group_id as string;
    if (!groupId || mutedGroupIds.has(groupId)) continue;
    total += await countGroupUnreadMessages(userId, groupId);
  }

  return total;
}

export async function getAthleteNotificationCount(athleteId: string) {
  const { data } = await supabase
    .from("profiles")
    .select("coach_id")
    .eq("id", athleteId)
    .maybeSingle();

  const coachId = data?.coach_id as string | undefined;
  if (!coachId) return 0;

  return getUnreadCountForConversation(athleteId, coachId);
}

export async function getUnreadMessageCount(userId: string) {
  return getTotalUnreadMessageCount(userId);
}

export async function getUnopenedConversationCount(userId: string) {
  return getTotalUnreadMessageCount(userId);
}

export async function getUnreadCountForConversation(
  userId: string,
  otherUserId: string,
  options?: { muted?: boolean },
) {
  if (options?.muted) {
    return 0;
  }

  const [{ data: readState }, { count: legacyUnreadCount, error: legacyError }] =
    await Promise.all([
      supabase
        .from("chat_read_state")
        .select("last_read_at")
        .eq("user_id", userId)
        .eq("peer_user_id", otherUserId)
        .maybeSingle(),
      supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_id", otherUserId)
        .eq("receiver_id", userId)
        .is("group_id", null)
        .is("read_at", null),
    ]);

  if (readState?.last_read_at) {
    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", userId)
      .is("group_id", null)
      .gt("created_at", readState.last_read_at);

    if (!error) {
      return count || 0;
    }
  }

  if (legacyError) {
    return 0;
  }

  return legacyUnreadCount || 0;
}

export async function markConversationAsRead(
  userId: string,
  otherUserId: string,
) {
  const { data: latestMessage } = await supabase
    .from("messages")
    .select("created_at")
    .eq("sender_id", otherUserId)
    .eq("receiver_id", userId)
    .is("group_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const readAt = latestMessage?.created_at || new Date().toISOString();

  await upsertDirectReadState(userId, otherUserId, readAt);

  await supabase
    .from("messages")
    .update({ read_at: readAt })
    .eq("sender_id", otherUserId)
    .eq("receiver_id", userId)
    .is("group_id", null)
    .is("read_at", null);

  notifyChatUnreadChanged();
}
