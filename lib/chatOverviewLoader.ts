import { supabase } from "@/lib/supabaseClient";
import {
  getGroupUnreadCount,
  loadUserChatGroups,
  type ChatGroupListItem,
} from "@/lib/chatGroups";
import {
  getSettingsKey,
  loadAllConversationSettings,
  type ChatConversationSettings,
} from "@/lib/chatSettings";
import { getUnreadCountForConversation } from "@/lib/chatUnread";
import {
  loadDirectMessagePreviews,
  loadGroupMessagePreviews,
} from "@/lib/chatConversationPreviews";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import { getMessagePreview, type ChatProfile } from "@/lib/chatUtils";

export type ChatOverviewData = {
  contacts: ChatProfile[];
  groups: ChatGroupListItem[];
  settingsMap: Record<string, ChatConversationSettings>;
};

type LoadChatOverviewOptions = {
  /** Skip per-conversation unread queries for faster first paint. */
  skipUnreadCounts?: boolean;
};

async function loadOverviewContacts(
  currentUserId: string,
  role: string,
  settingsMap: Record<string, ChatConversationSettings>,
  options: LoadChatOverviewOptions,
) {
  let contactQuery = supabase.from("profiles").select("*");

  if (isCoachLikeRole(role)) {
    if (isAdminRole(role)) {
      contactQuery = contactQuery
        .eq("role", "coach")
        .neq("id", currentUserId)
        .order("full_name", { ascending: true });
    } else {
      contactQuery = contactQuery.eq("role", "atleet").order("full_name", {
        ascending: true,
      });
      contactQuery = contactQuery.eq("coach_id", currentUserId);
    }
  } else {
    contactQuery = contactQuery.eq("role", "coach").limit(1);
  }

  const { data: profiles } = await contactQuery;
  const peerIds = (profiles || []).map((profile) => profile.id as string);
  const previews =
    peerIds.length <= 6
      ? await loadDirectMessagePreviews(currentUserId, peerIds)
      : await loadDirectMessagePreviews(currentUserId);

  const contacts = (profiles || []).map((contact) => {
    const lastMessage = previews.get(contact.id);
    const preview = getMessagePreview(lastMessage, currentUserId);
    const muted = Boolean(
      settingsMap[getSettingsKey({ peerUserId: contact.id })]?.muted,
    );

    return {
      contact,
      preview,
      lastMessage,
      muted,
    };
  });

  if (options.skipUnreadCounts) {
    return contacts.map(({ contact, preview, lastMessage }) => ({
      ...contact,
      lastMessage: preview.text,
      lastMessageSender:
        preview.sender ||
        (lastMessage
          ? lastMessage.sender_id === currentUserId
            ? "Jij"
            : contact.full_name
          : ""),
      lastMessageTime: lastMessage?.created_at,
      unreadCount: 0,
    }));
  }

  return Promise.all(
    contacts.map(async ({ contact, preview, lastMessage, muted }) => ({
      ...contact,
      lastMessage: preview.text,
      lastMessageSender:
        preview.sender ||
        (lastMessage
          ? lastMessage.sender_id === currentUserId
            ? "Jij"
            : contact.full_name
          : ""),
      lastMessageTime: lastMessage?.created_at,
      unreadCount: await getUnreadCountForConversation(
        currentUserId,
        contact.id,
        { muted },
      ),
    })),
  );
}

async function loadOverviewGroups(
  currentUserId: string,
  settingsMap: Record<string, ChatConversationSettings>,
  options: LoadChatOverviewOptions,
) {
  const baseGroups = await loadUserChatGroups(currentUserId);
  const previews = await loadGroupMessagePreviews(
    baseGroups.map((group) => group.id),
  );

  const senderIds = Array.from(
    new Set(
      baseGroups
        .map((group) => previews.get(group.id)?.sender_id)
        .filter(
          (senderId): senderId is string =>
            Boolean(senderId) && senderId !== currentUserId,
        ),
    ),
  );

  let senderNames: Record<string, string> = {};

  if (senderIds.length > 0) {
    const { data: senderProfiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", senderIds);

    senderNames = Object.fromEntries(
      (senderProfiles || []).map((profile) => [
        profile.id,
        profile.full_name || "Onbekend",
      ]),
    );
  }

  const groups = baseGroups.map((group) => {
    const lastMessage = previews.get(group.id);
    const senderName =
      lastMessage && lastMessage.sender_id !== currentUserId
        ? senderNames[lastMessage.sender_id] || "Onbekend"
        : "";

    const preview = getMessagePreview(lastMessage, currentUserId, senderName);
    const muted = Boolean(
      settingsMap[getSettingsKey({ groupId: group.id })]?.muted,
    );

    return {
      group,
      preview,
      senderName,
      muted,
      lastMessage,
    };
  });

  if (options.skipUnreadCounts) {
    return groups.map(({ group, preview, senderName, lastMessage }) => ({
      ...group,
      lastMessage: preview.text,
      lastMessageSender: preview.sender || senderName || "Groep",
      lastMessageTime: lastMessage?.created_at,
      unreadCount: 0,
    }));
  }

  return Promise.all(
    groups.map(async ({ group, preview, senderName, muted, lastMessage }) => ({
      ...group,
      lastMessage: preview.text,
      lastMessageSender: preview.sender || senderName || "Groep",
      lastMessageTime: lastMessage?.created_at,
      unreadCount: await getGroupUnreadCount(currentUserId, group.id, {
        muted,
      }),
    })),
  );
}

export async function loadChatOverview(
  userId: string,
  role: string,
  options: LoadChatOverviewOptions = {},
): Promise<ChatOverviewData> {
  const loadedSettings = await loadAllConversationSettings(userId);
  const settingsMap: Record<string, ChatConversationSettings> = {};

  for (const item of loadedSettings) {
    settingsMap[
      getSettingsKey(
        item.peer_user_id
          ? { peerUserId: item.peer_user_id }
          : { groupId: item.group_id! },
      )
    ] = item;
  }

  const [contacts, groups] = await Promise.all([
    loadOverviewContacts(userId, role, settingsMap, options),
    loadOverviewGroups(userId, settingsMap, options),
  ]);

  return { contacts, groups, settingsMap };
}

/** Fill unread badges after the list is already visible. */
export async function hydrateChatOverviewUnreadCounts(
  userId: string,
  data: ChatOverviewData,
): Promise<ChatOverviewData> {
  const contacts = await Promise.all(
    data.contacts.map(async (contact) => {
      const muted = Boolean(
        data.settingsMap[getSettingsKey({ peerUserId: contact.id })]?.muted,
      );
      return {
        ...contact,
        unreadCount: await getUnreadCountForConversation(userId, contact.id, {
          muted,
        }),
      };
    }),
  );

  const groups = await Promise.all(
    data.groups.map(async (group) => {
      const muted = Boolean(
        data.settingsMap[getSettingsKey({ groupId: group.id })]?.muted,
      );
      return {
        ...group,
        unreadCount: await getGroupUnreadCount(userId, group.id, { muted }),
      };
    }),
  );

  return { ...data, contacts, groups };
}
