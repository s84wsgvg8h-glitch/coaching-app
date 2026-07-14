import { supabase } from "@/lib/supabaseClient";

export async function loadBlockedUserIds(currentUserId: string) {
  const { data, error } = await supabase
    .from("chat_user_blocks")
    .select("blocked_id")
    .eq("blocker_id", currentUserId);

  if (error || !data) return [] as string[];

  return data.map((row) => row.blocked_id);
}

export async function blockUser(blockedUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Niet ingelogd.") };
  }

  if (user.id === blockedUserId) {
    return { error: new Error("Je kunt jezelf niet blokkeren.") };
  }

  const { error } = await supabase.from("chat_user_blocks").upsert(
    {
      blocker_id: user.id,
      blocked_id: blockedUserId,
    },
    { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
  );

  return { error };
}

export async function unblockUser(blockedUserId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: new Error("Niet ingelogd.") };
  }

  const { error } = await supabase
    .from("chat_user_blocks")
    .delete()
    .eq("blocker_id", user.id)
    .eq("blocked_id", blockedUserId);

  return { error };
}

export function isUserBlocked(
  blockedUserIds: Set<string> | string[],
  userId: string,
) {
  const set = blockedUserIds instanceof Set ? blockedUserIds : new Set(blockedUserIds);
  return set.has(userId);
}
