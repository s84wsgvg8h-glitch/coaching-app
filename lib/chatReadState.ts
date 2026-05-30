import { supabase } from "@/lib/supabaseClient";

export type ChatReadState = {
  user_id: string;
  peer_user_id: string | null;
  group_id: string | null;
  last_read_at: string;
};

export async function upsertDirectReadState(userId: string, peerUserId: string) {
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("chat_read_state")
    .select("id")
    .eq("user_id", userId)
    .eq("peer_user_id", peerUserId)
    .maybeSingle();

  if (existing?.id) {
    return supabase
      .from("chat_read_state")
      .update({ last_read_at: now, updated_at: now })
      .eq("id", existing.id);
  }

  return supabase.from("chat_read_state").insert({
    user_id: userId,
    peer_user_id: peerUserId,
    group_id: null,
    last_read_at: now,
    updated_at: now,
  });
}

export async function upsertGroupReadState(userId: string, groupId: string) {
  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("chat_read_state")
    .select("id")
    .eq("user_id", userId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (existing?.id) {
    return supabase
      .from("chat_read_state")
      .update({ last_read_at: now, updated_at: now })
      .eq("id", existing.id);
  }

  return supabase.from("chat_read_state").insert({
    user_id: userId,
    peer_user_id: null,
    group_id: groupId,
    last_read_at: now,
    updated_at: now,
  });
}

export async function loadPeerReadState(peerUserId: string, myUserId: string) {
  const { data } = await supabase
    .from("chat_read_state")
    .select("last_read_at")
    .eq("user_id", peerUserId)
    .eq("peer_user_id", myUserId)
    .maybeSingle();

  return data?.last_read_at || null;
}

export function isMessageReadByPeer(
  messageCreatedAt: string,
  peerLastReadAt: string | null,
) {
  if (!peerLastReadAt) return false;
  return new Date(peerLastReadAt).getTime() >= new Date(messageCreatedAt).getTime();
}
