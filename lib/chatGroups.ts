import { supabase } from "@/lib/supabaseClient";
import { notifyChatUnreadChanged } from "@/lib/chatUnread";

export type ChatGroup = {
  id: string;
  name: string;
  description?: string | null;
  avatar_url?: string | null;
  admins_only?: boolean;
  created_by: string | null;
  created_at: string;
};

export type ChatGroupMember = {
  user_id: string;
  full_name: string;
  role: "member" | "admin";
  joined_at: string;
};

export type ChatGroupDetails = ChatGroup & {
  members: ChatGroupMember[];
  canManage: boolean;
};

export type ChatGroupListItem = ChatGroup & {
  lastMessage?: string;
  lastMessageTime?: string;
  lastMessageSender?: string;
  unreadCount?: number;
};

export async function loadUserChatGroups(userId: string): Promise<ChatGroup[]> {
  const { data: memberships, error } = await supabase
    .from("chat_group_members")
    .select("group_id")
    .eq("user_id", userId);

  if (error || !memberships?.length) {
    return [];
  }

  const groupIds = memberships.map((item) => item.group_id);

  const { data: groups, error: groupsError } = await supabase
    .from("chat_groups")
    .select("*")
    .in("id", groupIds)
    .order("created_at", { ascending: false });

  if (groupsError) {
    return [];
  }

  return (groups || []) as ChatGroup[];
}

export async function getGroupUnreadCount(
  userId: string,
  groupId: string,
  options?: { muted?: boolean },
) {
  if (options?.muted) {
    return 0;
  }

  const { data: readState } = await supabase
    .from("chat_group_read_states")
    .select("last_read_at")
    .eq("group_id", groupId)
    .eq("user_id", userId)
    .maybeSingle();

  let query = supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("group_id", groupId)
    .neq("sender_id", userId);

  if (readState?.last_read_at) {
    query = query.gt("created_at", readState.last_read_at);
  }

  const { count, error } = await query;

  if (error) {
    return 0;
  }

  return count || 0;
}

export async function markGroupAsRead(userId: string, groupId: string) {
  const now = new Date().toISOString();

  const { error } = await supabase.from("chat_group_read_states").upsert(
    {
      group_id: groupId,
      user_id: userId,
      last_read_at: now,
    },
    { onConflict: "group_id,user_id" },
  );

  if (error) {
    throw error;
  }

  notifyChatUnreadChanged();
}

export async function loadChatGroupMemberNames(
  groupId: string,
): Promise<Record<string, string>> {
  const { data: members, error } = await supabase
    .from("chat_group_members")
    .select("user_id")
    .eq("group_id", groupId);

  if (error || !members?.length) {
    return {};
  }

  const userIds = members.map((member) => member.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const names: Record<string, string> = {};

  for (const profile of profiles || []) {
    if (profile.full_name) {
      names[profile.id] = profile.full_name;
    }
  }

  return names;
}

export async function createChatGroup(params: {
  name: string;
  createdBy: string;
  memberIds: string[];
}) {
  const uniqueMemberIds = Array.from(
    new Set([params.createdBy, ...params.memberIds]),
  );

  const { data: group, error: groupError } = await supabase
    .from("chat_groups")
    .insert({
      name: params.name.trim(),
      created_by: params.createdBy,
    })
    .select("*")
    .single();

  if (groupError || !group) {
    return { group: null, error: groupError };
  }

  const { error: membersError } = await supabase.from("chat_group_members").insert(
    uniqueMemberIds.map((userId) => ({
      group_id: group.id,
      user_id: userId,
      role: userId === params.createdBy ? "admin" : "member",
    })),
  );

  if (membersError) {
    return { group: null, error: membersError };
  }

  return { group: group as ChatGroup, error: null };
}

export async function loadChatGroupDetails(
  groupId: string,
  currentUserId: string,
): Promise<ChatGroupDetails | null> {
  const { data: group, error: groupError } = await supabase
    .from("chat_groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (groupError || !group) {
    return null;
  }

  const { data: memberships, error: membersError } = await supabase
    .from("chat_group_members")
    .select("user_id, role, joined_at")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (membersError || !memberships?.length) {
    return null;
  }

  const userIds = memberships.map((member) => member.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles || []).map((profile) => [profile.id, profile.full_name || "Onbekend"]),
  );

  const members: ChatGroupMember[] = memberships.map((member) => ({
    user_id: member.user_id,
    full_name: profileMap.get(member.user_id) || "Onbekend",
    role: member.role === "admin" ? "admin" : "member",
    joined_at: member.joined_at,
  }));

  const currentMember = members.find((member) => member.user_id === currentUserId);
  const canManage =
    currentMember?.role === "admin" || group.created_by === currentUserId;

  return {
    ...(group as ChatGroup),
    members,
    canManage,
  };
}

export async function addChatGroupMembers(groupId: string, memberIds: string[]) {
  if (memberIds.length === 0) {
    return { error: null };
  }

  const { error } = await supabase.from("chat_group_members").insert(
    memberIds.map((userId) => ({
      group_id: groupId,
      user_id: userId,
      role: "member",
    })),
  );

  return { error };
}

export async function setChatGroupMemberRole(
  groupId: string,
  memberId: string,
  role: "member" | "admin",
) {
  const { error } = await supabase
    .from("chat_group_members")
    .update({ role })
    .eq("group_id", groupId)
    .eq("user_id", memberId);

  return { error };
}

export async function removeChatGroupMember(groupId: string, memberId: string) {
  const { error } = await supabase
    .from("chat_group_members")
    .delete()
    .eq("group_id", groupId)
    .eq("user_id", memberId);

  return { error };
}

export async function updateChatGroupSettings(
  groupId: string,
  patch: {
    name?: string;
    description?: string | null;
    avatar_url?: string | null;
    admins_only?: boolean;
  },
) {
  const { error } = await supabase
    .from("chat_groups")
    .update(patch)
    .eq("id", groupId);

  return { error };
}
