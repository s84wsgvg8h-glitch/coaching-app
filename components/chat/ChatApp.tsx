"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BellOff,
  Camera,
  Check,
  CheckCheck,
  MessageCircle,
  MoreVertical,
  Pin,
  Plus,
  Search,
  SendHorizontal,
  Users,
  X,
  Sparkles,
  BarChart2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import {
  createChatGroup,
  getGroupUnreadCount,
  loadChatGroupMemberNames,
  loadChatGroupMemberProfiles,
  loadUserChatGroups,
  markGroupAsRead,
  type ChatGroupListItem,
} from "@/lib/chatGroups";
import {
  clearConversation,
  filterMessagesByClearedAt,
  getSettingsKey,
  hideConversation,
  loadAllConversationSettings,
  markConversationUnread,
  muteConversation,
  pinConversation,
  pinConversationMessage,
  type ChatConversationSettings,
  unhideConversation,
} from "@/lib/chatSettings";
import {
  getChatMediaFileType,
  insertChatMediaMessage,
  uploadChatAudio,
  uploadChatMedia,
} from "@/lib/chatMedia";
import {
  getUnreadCountForConversation,
  markConversationAsRead,
  notifyChatUnreadChanged,
} from "@/lib/chatUnread";
import {
  type ChatMessage,
  type ChatProfile,
  formatChatListTime,
  formatDateDivider,
  formatMessageTime,
  getInitials,
  getMessagePreview,
  getReplyText,
  parseExerciseVideoMessage,
  shouldShowDateDivider,
} from "@/lib/chatUtils";
import ExerciseVideoMessage from "@/components/chat/ExerciseVideoMessage";
import PollMessage from "@/components/chat/PollMessage";
import ChatMediaCapture from "@/components/chat/ChatMediaCapture";
import ChatMediaComposer from "@/components/chat/ChatMediaComposer";
import GroupInfoPanel from "@/components/chat/GroupInfoPanel";
import ChatAvatar from "@/components/chat/ChatAvatar";
import ChatConversationMenu from "@/components/chat/ChatConversationMenu";
import ChatVoiceMessage from "@/components/chat/ChatVoiceMessage";
import ChatVoiceRecorder from "@/components/chat/ChatVoiceRecorder";
import { loadAthleteProgramPosition } from "@/lib/athleteProgramContext";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  loadDirectMessagePreviews,
  loadGroupMessagePreviews,
} from "@/lib/chatConversationPreviews";
import { saveChatReturnRoute } from "@/lib/chatNavigation";
import {
  searchMessagesGlobally,
  getSearchableMessageText,
  type GlobalMessageSearchResult,
} from "@/lib/chatSearch";
import ChatSearchField from "@/components/chat/ChatSearchField";
import ChatMessageSearchPanel from "@/components/chat/ChatMessageSearchPanel";
import ChatListMenuSheet from "@/components/chat/ChatListMenuSheet";
import ChatMessageMenu, {
  ChatMessageMenuTrigger,
} from "@/components/chat/ChatMessageMenu";
import HighlightedText from "@/components/chat/HighlightedText";
import ChatToolsPanel from "@/components/chat/ChatToolsPanel";
import ChatProgramPanel from "@/components/chat/ChatProgramPanel";
import ChatBwPanel from "@/components/chat/ChatBwPanel";
import ChatExternalsPanel from "@/components/chat/ChatExternalsPanel";
import ChatVolumePanel from "@/components/chat/ChatVolumePanel";
import ChatIntensityPanel from "@/components/chat/ChatIntensityPanel";
import ChatMaxPanel from "@/components/chat/ChatMaxPanel";
import ChatRawDataPanel from "@/components/chat/ChatRawDataPanel";
import ChatInjuriesPanel from "@/components/chat/ChatInjuriesPanel";
import ChatAiPanel from "@/components/chat/ChatAiPanel";
import ChatTodoPanel from "@/components/chat/ChatTodoPanel";
import ChatAgendaPanel from "@/components/chat/ChatAgendaPanel";
import ChatAiMessage from "@/components/chat/ChatAiMessage";
import ChatBroadcastModal from "@/components/chat/ChatBroadcastModal";
import ChatMessageReactions from "@/components/chat/ChatMessageReactions";
import {
  loadMessageReactions,
  toggleMessageReaction,
  type MessageReaction,
} from "@/lib/chatReactions";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import {
  broadcastTyping,
  getConversationTypingKey,
  subscribeToTyping,
  type TypingPayload,
} from "@/lib/chatTyping";
import {
  isMessageReadByPeer,
  loadPeerReadState,
} from "@/lib/chatReadState";
import ChatSlashCommandMenu from "@/components/chat/ChatSlashCommandMenu";
import {
  buildAiAssistantMessageBody,
  getAiAssistantPreviewText,
  parseAiAssistantMessage,
} from "@/lib/chatAi";
import {
  filterChatSlashCommands,
  parseAiCommand,
  parseBwCommand,
  parseDataCommand,
  parseExternalsCommand,
  parseInjuriesCommand,
  parseIntensityCommand,
  parseMaxCommand,
  parseProgramCommand,
  parseTodoCommand,
  parseAgendaCommand,
  parseToolsCommand,
  parseVolumeCommand,
  shouldShowSlashCommandMenu,
} from "@/lib/chatCommands";
import {
  type ChatToolItem,
  type ProgramBlockTool,
} from "@/lib/chatTools";
import {
  buildPollMessageBody,
  castPollVote,
  createPollOptionId,
  loadPollVotes,
  parsePollMessage,
  type PollMessagePayload,
  type PollVote,
} from "@/lib/chatPolls";
import PollDetailsPanel from "@/components/chat/PollDetailsPanel";

type ChatListEntry =
  | (ChatProfile & { kind: "direct" })
  | (ChatGroupListItem & { kind: "group" });

function getActiveChatRoute(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "chat") {
    return { type: "none" as const, id: "" };
  }

  if (parts[1] === "group" && parts[2]) {
    if (parts[3] === "info") {
      return { type: "group-info" as const, id: parts[2] };
    }

    return { type: "group" as const, id: parts[2] };
  }

  if (parts[1] && parts[1] !== "group") {
    return { type: "direct" as const, id: parts[1] };
  }

  return { type: "none" as const, id: "" };
}

export default function ChatApp() {
  const router = useRouter();
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const shouldStickToBottomRef = useRef(true);
  const isInitialScrollRef = useRef(true);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeRoute = useMemo(() => getActiveChatRoute(pathname), [pathname]);
  const activeUserId = activeRoute.type === "direct" ? activeRoute.id : "";
  const activeGroupId =
    activeRoute.type === "group" || activeRoute.type === "group-info"
      ? activeRoute.id
      : "";
  const showGroupInfo = activeRoute.type === "group-info";

  const [bootstrapping, setBootstrapping] = useState(true);
  const [switchingConversation, setSwitchingConversation] = useState(false);
  const [userId, setUserId] = useState("");
  const [userRole, setUserRole] = useState("");
  const [userName, setUserName] = useState("");
  const [contacts, setContacts] = useState<ChatProfile[]>([]);
  const [groups, setGroups] = useState<ChatGroupListItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeContact, setActiveContact] = useState<ChatProfile | null>(null);
  const [activeGroup, setActiveGroup] = useState<ChatGroupListItem | null>(null);
  const [message, setMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupMemberNames, setGroupMemberNames] = useState<Record<string, string>>(
    {},
  );
  const [groupMemberProfiles, setGroupMemberProfiles] = useState<
    Record<string, { name: string; avatar_url: string | null }>
  >({});
  const [mediaCaptureOpen, setMediaCaptureOpen] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [typingIndicator, setTypingIndicator] = useState<TypingPayload | null>(null);
  const [peerLastReadAt, setPeerLastReadAt] = useState<string | null>(null);
  const [slashCommandActiveIndex, setSlashCommandActiveIndex] = useState(0);
  const [conversationSettings, setConversationSettings] = useState<
    Record<string, ChatConversationSettings>
  >({});
  const [groupMemberRoles, setGroupMemberRoles] = useState<
    Record<string, "member" | "admin">
  >({});
  const [messageSearchOpen, setMessageSearchOpen] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<
    GlobalMessageSearchResult[]
  >([]);
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [listMenuEntry, setListMenuEntry] = useState<ChatListEntry | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState("");
  const [messageMenu, setMessageMenu] = useState<{
    message: ChatMessage;
    anchorRect: DOMRect | null;
  } | null>(null);
  const [messageReactions, setMessageReactions] = useState<
    Record<string, MessageReaction[]>
  >({});
  const [pollVotes, setPollVotes] = useState<PollVote[]>([]);
  const [pollCreateOpen, setPollCreateOpen] = useState(false);
  const [athleteProgramLabel, setAthleteProgramLabel] = useState("");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [creatingPoll, setCreatingPoll] = useState(false);
  const [votingPollId, setVotingPollId] = useState("");
  const [activePollDetails, setActivePollDetails] = useState<{
    messageId: string;
    payload: PollMessagePayload;
  } | null>(null);
  const [toolPrograms, setToolPrograms] = useState<ProgramBlockTool[]>([]);
  const [toolProgramsLoading, setToolProgramsLoading] = useState(false);
  const conversationPanelRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const listLongPressTriggeredRef = useRef(false);

  useEffect(() => {
    bootstrap();
  }, []);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (!userId || bootstrapping) return;

    isInitialScrollRef.current = true;
    shouldStickToBottomRef.current = true;
    void switchConversation(activeRoute);
  }, [activeRoute.id, activeRoute.type, userId, bootstrapping]);

  useEffect(() => {
    if (messages.length === 0) return;

    if (isInitialScrollRef.current) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("instant");
          isInitialScrollRef.current = false;
        });
      });
      return;
    }

    if (shouldStickToBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  useEffect(() => {
    if (!userId || (!activeUserId && !activeGroupId)) {
      setTypingIndicator(null);
      return;
    }

    const key = getConversationTypingKey(
      userId,
      activeUserId || null,
      activeGroupId || null,
    );
    if (!key) return;

    return subscribeToTyping(key, userId, userName, setTypingIndicator);
  }, [userId, userName, activeUserId, activeGroupId]);

  useEffect(() => {
    if (!activeUserId || !userId) {
      setPeerLastReadAt(null);
      return;
    }

    const interval = window.setInterval(() => {
      void loadPeerReadState(activeUserId, userId).then(setPeerLastReadAt);
    }, 8000);

    return () => window.clearInterval(interval);
  }, [activeUserId, userId]);

  useEffect(() => {
    if (activeUserId) {
      saveChatReturnRoute(`/chat/${activeUserId}`);
      void unhideConversation(userId, { peerUserId: activeUserId });
      return;
    }

    if (activeGroupId) {
      saveChatReturnRoute(
        activeRoute.type === "group-info"
          ? `/chat/group/${activeGroupId}/info`
          : `/chat/group/${activeGroupId}`,
      );
      void unhideConversation(userId, { groupId: activeGroupId });
    }
  }, [activeUserId, activeGroupId, activeRoute.type, userId]);

  useEffect(() => {
    if (userRole !== "coach" || !activeUserId) {
      setAthleteProgramLabel("");
      return;
    }

    let cancelled = false;

    async function loadAthleteProgram() {
      const position = await loadAthleteProgramPosition(activeUserId);
      if (cancelled) return;
      setAthleteProgramLabel(position?.label || "");
    }

    void loadAthleteProgram();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, userRole]);

  useEffect(() => {
    const inConversation = Boolean(activeUserId || activeGroupId);
    if (!inConversation) return;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    const panel = conversationPanelRef.current;
    if (!panel) return;

    let touchStartX = 0;
    let touchStartY = 0;

    function onTouchStart(event: TouchEvent) {
      touchStartX = event.touches[0]?.clientX ?? 0;
      touchStartY = event.touches[0]?.clientY ?? 0;
    }

    function onTouchMove(event: TouchEvent) {
      const touch = event.touches[0];
      if (!touch) return;

      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);
      const target = event.target as HTMLElement | null;
      const inScrollArea = target?.closest("[data-chat-scroll='true']");

      if (!inScrollArea && deltaX > deltaY && deltaX > 8) {
        event.preventDefault();
      }

      if (touch.clientX - touchStartX > 60 && touchStartX < 40 && !inScrollArea) {
        event.preventDefault();
      }
    }

    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
      document.body.style.overscrollBehavior = "";
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
    };
  }, [activeUserId, activeGroupId]);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    const container = messagesContainerRef.current;
    if (!container) return;

    requestAnimationFrame(() => {
      if (behavior === "instant") {
        container.scrollTop = container.scrollHeight;
        return;
      }

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    });
  }

  function forceScrollToBottom() {
    shouldStickToBottomRef.current = true;

    const scroll = () => scrollToBottom("instant");

    requestAnimationFrame(() => {
      requestAnimationFrame(scroll);
    });

    window.setTimeout(scroll, 120);
    window.setTimeout(scroll, 350);
    window.setTimeout(scroll, 700);
  }

  function handleMediaLoaded() {
    forceScrollToBottom();
  }

  function getConversationSettingsKey() {
    if (activeUserId) return getSettingsKey({ peerUserId: activeUserId });
    if (activeGroupId) return getSettingsKey({ groupId: activeGroupId });
    return "";
  }

  function getCurrentConversationSettings() {
    const key = getConversationSettingsKey();
    return key ? conversationSettings[key] : undefined;
  }

  function patchCurrentConversationSettings(
    patch: Partial<ChatConversationSettings>,
  ) {
    const key = getConversationSettingsKey();
    if (!key || !userId) return;

    setConversationSettings((current) => ({
      ...current,
      [key]: {
        id: current[key]?.id || "",
        user_id: userId,
        peer_user_id: activeUserId,
        group_id: activeGroupId,
        pinned: current[key]?.pinned ?? false,
        muted: current[key]?.muted ?? false,
        cleared_at: current[key]?.cleared_at ?? null,
        hidden_at: current[key]?.hidden_at ?? null,
        pinned_message_id: current[key]?.pinned_message_id ?? null,
        ...patch,
      },
    }));
  }

  async function refreshConversationSettings() {
    if (!userId) return;

    const settings = await loadAllConversationSettings(userId);
    const map: Record<string, ChatConversationSettings> = {};

    for (const item of settings) {
      map[
        getSettingsKey(
          item.peer_user_id
            ? { peerUserId: item.peer_user_id }
            : { groupId: item.group_id! },
        )
      ] = item;
    }

    setConversationSettings(map);
  }

  function handleMessagesScroll() {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    shouldStickToBottomRef.current = distanceFromBottom < 120;
  }

  async function bootstrap() {
    setBootstrapping(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (!profile) {
      setBootstrapping(false);
      return;
    }

    setUserRole(profile.role);
    setUserName(profile.full_name || "");

    const loadedSettings = await loadAllConversationSettings(user.id);
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

    const [loadedContacts, loadedGroups] = await Promise.all([
      loadContacts(user.id, profile.role, settingsMap),
      loadGroups(user.id, settingsMap),
    ]);

    setConversationSettings(settingsMap);

    setContacts(loadedContacts);
    setGroups(loadedGroups);
    setBootstrapping(false);
  }

  async function syncMessageReactions(loadedMessages: ChatMessage[]) {
    if (loadedMessages.length === 0) {
      setMessageReactions({});
      return;
    }

    setMessageReactions(
      await loadMessageReactions(loadedMessages.map((item) => item.id)),
    );
  }

  async function handleMessageReaction(messageId: string, emoji: string) {
    const { error } = await toggleMessageReaction(messageId, emoji);
    if (error) return;

    const updated = await loadMessageReactions([messageId]);
    setMessageReactions((current) => ({ ...current, ...updated }));
  }

  function resolveReactionUserName(reactionUserId: string) {
    if (reactionUserId === userId) return "Jij";
    return (
      groupMemberNames[reactionUserId] ||
      activeContact?.full_name ||
      contacts.find((contact) => contact.id === reactionUserId)?.full_name ||
      "Gebruiker"
    );
  }

  async function loadContacts(
    currentUserId: string,
    role: string,
    settingsMap: Record<string, ChatConversationSettings> = {},
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
    const previews = await loadDirectMessagePreviews(currentUserId);

    return Promise.all(
      (profiles || []).map(async (contact) => {
        const lastMessage = previews.get(contact.id);
        const preview = getMessagePreview(lastMessage, currentUserId);
        const muted = Boolean(
          settingsMap[getSettingsKey({ peerUserId: contact.id })]?.muted,
        );
        const unreadCount = await getUnreadCountForConversation(
          currentUserId,
          contact.id,
          { muted },
        );

        return {
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
          unreadCount,
        };
      }),
    );
  }

  async function loadGroups(
    currentUserId: string,
    settingsMap: Record<string, ChatConversationSettings> = {},
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

    return Promise.all(
      baseGroups.map(async (group) => {
        const lastMessage = previews.get(group.id);
        const senderName =
          lastMessage && lastMessage.sender_id !== currentUserId
            ? senderNames[lastMessage.sender_id] || "Onbekend"
            : "";

        const preview = getMessagePreview(
          lastMessage,
          currentUserId,
          senderName,
        );
        const muted = Boolean(
          settingsMap[getSettingsKey({ groupId: group.id })]?.muted,
        );
        const unreadCount = await getGroupUnreadCount(currentUserId, group.id, {
          muted,
        });

        return {
          ...group,
          lastMessage: preview.text,
          lastMessageSender: preview.sender || senderName || "Groep",
          lastMessageTime: lastMessage?.created_at,
          unreadCount,
        };
      }),
    );
  }

  async function loadDirectMessages(currentUserId: string, otherUserId: string) {
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

  async function loadGroupMessages(groupId: string) {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });

    return (data || []) as ChatMessage[];
  }

  async function switchConversation(route: ReturnType<typeof getActiveChatRoute>) {
    setSwitchingConversation(true);
    setReplyingTo(null);
    setMessage("");

    try {
      if (route.type === "none" || !userId) {
        setActiveContact(null);
        setActiveGroup(null);
        setGroupMemberNames({});
        setGroupMemberProfiles({});
        setGroupMemberRoles({});
        setMessages([]);
        setMessageReactions({});
        return;
      }

      const settingsKey =
        route.type === "direct"
          ? getSettingsKey({ peerUserId: route.id })
          : getSettingsKey({ groupId: route.id });
      const clearedAt = conversationSettings[settingsKey]?.cleared_at;

      if (route.type === "direct") {
        const contact = contacts.find((item) => item.id === route.id) || null;
        setActiveContact(contact);
        setActiveGroup(null);
        setGroupMemberNames({});
        setGroupMemberProfiles({});
        setGroupMemberRoles({});

        setContacts((current) =>
          current.map((item) =>
            item.id === route.id ? { ...item, unreadCount: 0 } : item,
          ),
        );

        await markConversationAsRead(userId, route.id);
        setPeerLastReadAt(await loadPeerReadState(route.id, userId));
        const loadedMessages = filterMessagesByClearedAt(
          await loadDirectMessages(userId, route.id),
          clearedAt,
        );
        setMessages(loadedMessages);
        await syncMessageReactions(loadedMessages);
        isInitialScrollRef.current = true;
        return;
      }

      const group =
        groups.find((item) => item.id === route.id) ||
        (await supabase
          .from("chat_groups")
          .select("*")
          .eq("id", route.id)
          .maybeSingle()
          .then(({ data }) => (data as ChatGroupListItem | null))) ||
        null;
      setActiveGroup(group);
      setActiveContact(null);
      const memberProfiles = await loadChatGroupMemberProfiles(route.id);
      setGroupMemberProfiles(memberProfiles);
      setGroupMemberNames(
        Object.fromEntries(
          Object.entries(memberProfiles).map(([id, profile]) => [
            id,
            profile.name,
          ]),
        ),
      );

      const { data: memberRows } = await supabase
        .from("chat_group_members")
        .select("user_id, role")
        .eq("group_id", route.id);

      const roles: Record<string, "member" | "admin"> = {};
      for (const row of memberRows || []) {
        roles[row.user_id] = row.role === "admin" ? "admin" : "member";
      }
      setGroupMemberRoles(roles);

      setGroups((current) =>
        current.map((item) =>
          item.id === route.id ? { ...item, unreadCount: 0 } : item,
        ),
      );

      await markGroupAsRead(userId, route.id);

      if (route.type === "group-info") {
        if (messages.length === 0 || messages[0]?.group_id !== route.id) {
          const loadedMessages = filterMessagesByClearedAt(
            await loadGroupMessages(route.id),
            clearedAt,
          );
          setMessages(loadedMessages);
          await syncMessageReactions(loadedMessages);
        }
        return;
      }

      const loadedMessages = filterMessagesByClearedAt(
        await loadGroupMessages(route.id),
        clearedAt,
      );
      setMessages(loadedMessages);
      await syncMessageReactions(loadedMessages);
      isInitialScrollRef.current = true;
    } catch (error) {
      if (error instanceof Error) {
        console.error("CHAT SWITCH ERROR:", error.message);
      }
    } finally {
      setSwitchingConversation(false);
    }
  }

  function openDirectChat(otherUserId: string) {
    setContacts((current) =>
      current.map((contact) =>
        contact.id === otherUserId ? { ...contact, unreadCount: 0 } : contact,
      ),
    );

    startTransition(() => {
      router.push(`/chat/${otherUserId}`, { scroll: false });
    });
  }

  function openGroupChat(groupId: string) {
    setGroups((current) =>
      current.map((group) =>
        group.id === groupId ? { ...group, unreadCount: 0 } : group,
      ),
    );

    startTransition(() => {
      router.push(`/chat/group/${groupId}`, { scroll: false });
    });
  }

  function openGroupInfo(groupId: string) {
    saveChatReturnRoute(`/chat/group/${groupId}`);
    startTransition(() => {
      router.push(`/chat/group/${groupId}/info`, { scroll: false });
    });
  }

  function closeGroupInfo() {
    if (!activeGroupId) return;

    startTransition(() => {
      router.push(`/chat/group/${activeGroupId}`, { scroll: false });
    });
  }

  function closeConversation() {
    startTransition(() => {
      router.push("/chat", { scroll: false });
    });
  }

  function handleReply(msg: ChatMessage) {
    setReplyingTo(msg);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function closeToolsPanel() {
    setMessage((current) => (current.startsWith("/tools") ? "" : current));
  }

  function closeProgramPanel() {
    setMessage((current) => (current.startsWith("/program") ? "" : current));
  }

  function closeBwPanel() {
    setMessage((current) => (current.startsWith("/bw") ? "" : current));
  }

  function closeExternalsPanel() {
    setMessage((current) => (current.startsWith("/externals") ? "" : current));
  }

  function closeVolumePanel() {
    setMessage((current) => (current.startsWith("/volume") ? "" : current));
  }

  function closeIntensityPanel() {
    setMessage((current) => (current.startsWith("/intensity") ? "" : current));
  }

  function closeMaxPanel() {
    setMessage((current) => {
      const normalized = current.trim();
      if (
        normalized.startsWith("/max") ||
        /^\/pr(?:\s|$)/i.test(normalized)
      ) {
        return "";
      }
      return current;
    });
  }

  function closeDataPanel() {
    setMessage((current) => {
      const normalized = current.trim();
      if (
        normalized.startsWith("/data") ||
        /^\/\s*raw\s*data/i.test(normalized) ||
        /^\/rawdata/i.test(normalized)
      ) {
        return "";
      }
      return current;
    });
  }

  function closeInjuriesPanel() {
    setMessage((current) => (current.startsWith("/injuries") ? "" : current));
  }

  function closeAiPanel() {
    setMessage((current) => (current.startsWith("/ai") ? "" : current));
  }

  function closeTodoPanel() {
    setMessage((current) => (current.startsWith("/todo") ? "" : current));
  }

  function closeAgendaPanel() {
    setMessage((current) => (current.startsWith("/agenda") ? "" : current));
  }

  async function shareAiAnswerToChat(question: string, answer: string) {
    if (!userId || !activeUserId || activeGroupId) return;

    const body = buildAiAssistantMessageBody(question, answer);
    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: userId,
      receiver_id: activeUserId,
      group_id: null,
      body,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_body: null,
      reply_to_file_type: null,
      reply_to_sender_id: null,
    };

    const { error } = await supabase.from("messages").insert({
      sender_id: userId,
      receiver_id: activeUserId,
      body,
      read_at: null,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setMessages((current) => [...current, optimisticMessage]);
    setContacts((current) =>
      current.map((contact) =>
        contact.id === activeUserId
          ? {
              ...contact,
              lastMessage: getAiAssistantPreviewText(body),
              lastMessageSender: "Jij",
              lastMessageTime: optimisticMessage.created_at,
              unreadCount: 0,
            }
          : contact,
      ),
    );
    forceScrollToBottom();
  }

  function handleToolsQueryChange(query: string) {
    setMessage(query ? `/tools ${query}` : "/tools");
  }

  function handleToolsSelect(item: ChatToolItem) {
    closeToolsPanel();

    if (item.chatKind === "direct" && item.targetId) {
      openDirectChat(item.targetId);
      return;
    }

    if (item.chatKind === "group" && item.targetId) {
      openGroupChat(item.targetId);
      return;
    }

    if (item.href) {
      router.push(item.href);
    }
  }

  async function sendMessage() {
    if (!message.trim() || !userId) return;
    if (parseToolsCommand(message).active) return;
    if (parseProgramCommand(message).active) return;
    if (parseBwCommand(message).active) return;
    if (parseExternalsCommand(message).active) return;
    if (parseVolumeCommand(message).active) return;
    if (parseIntensityCommand(message).active) return;
    if (parseMaxCommand(message).active) return;
    if (parseDataCommand(message).active) return;
    if (parseInjuriesCommand(message).active) return;
    if (parseAiCommand(message).active) return;
    if (parseTodoCommand(message).active) return;
    if (parseAgendaCommand(message).active) return;
    if (!activeUserId && !activeGroupId) return;
    if (!canSendMessages) {
      alert("Alleen beheerders kunnen berichten sturen in deze groep.");
      return;
    }

    const messageText = message.trim();
    const optimisticMessage: ChatMessage = {
      id: crypto.randomUUID(),
      sender_id: userId,
      receiver_id: activeUserId || null,
      group_id: activeGroupId || null,
      body: messageText,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_body: replyingTo ? getReplyText(replyingTo) : null,
      reply_to_file_type: replyingTo?.file_type || null,
      reply_to_sender_id: replyingTo?.sender_id || null,
    };

    let error: { message: string } | null = null;

    if (activeGroupId) {
      const result = await supabase.from("messages").insert({
        sender_id: userId,
        group_id: activeGroupId,
        body: messageText,
        read_at: null,
        reply_to_body: replyingTo ? getReplyText(replyingTo) : null,
        reply_to_file_type: replyingTo?.file_type || null,
        reply_to_sender_id: replyingTo?.sender_id || null,
      });
      error = result.error;
    } else {
      const result = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: activeUserId,
        body: messageText,
        read_at: null,
        reply_to_body: replyingTo ? getReplyText(replyingTo) : null,
        reply_to_file_type: replyingTo?.file_type || null,
        reply_to_sender_id: replyingTo?.sender_id || null,
      });
      error = result.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setMessages((current) => [...current, optimisticMessage]);

    if (activeGroupId) {
      setGroups((current) =>
        current.map((group) =>
          group.id === activeGroupId
            ? {
                ...group,
                lastMessage: messageText,
                lastMessageSender: "Jij",
                lastMessageTime: optimisticMessage.created_at,
                unreadCount: 0,
              }
            : group,
        ),
      );
    } else {
      setContacts((current) =>
        current.map((contact) =>
          contact.id === activeUserId
            ? {
                ...contact,
                lastMessage: messageText,
                lastMessageSender: "Jij",
                lastMessageTime: optimisticMessage.created_at,
                unreadCount: 0,
              }
            : contact,
        ),
      );
    }

    setMessage("");
    setReplyingTo(null);
    inputRef.current?.focus();
    forceScrollToBottom();
  }

  function getReplySenderLabel(senderId: string | null | undefined) {
    if (!senderId || senderId === userId) return "Jij";

    if (activeGroupId) {
      return groupMemberNames[senderId] || "Onbekend";
    }

    return conversationTitle;
  }

  function updateSidebarAfterMessage(
    messagePreview: ReturnType<typeof getMessagePreview>,
    createdAt: string,
  ) {
    if (activeGroupId) {
      setGroups((current) =>
        current.map((group) =>
          group.id === activeGroupId
            ? {
                ...group,
                lastMessage: messagePreview.text,
                lastMessageSender: messagePreview.sender || "Jij",
                lastMessageTime: createdAt,
                unreadCount: 0,
              }
            : group,
        ),
      );
      return;
    }

    setContacts((current) =>
      current.map((contact) =>
        contact.id === activeUserId
          ? {
              ...contact,
              lastMessage: messagePreview.text,
              lastMessageSender: messagePreview.sender || "Jij",
              lastMessageTime: createdAt,
              unreadCount: 0,
            }
          : contact,
      ),
    );
  }

  async function sendMediaFile(file: File, caption = "") {
    if (!userId || (!activeUserId && !activeGroupId) || uploadingMedia) return;
    if (!canSendMessages) {
      alert("Alleen beheerders kunnen berichten sturen in deze groep.");
      return;
    }

    const mediaType = getChatMediaFileType(file);

    if (!mediaType) {
      alert("Kies een foto of video");
      return;
    }

    setUploadingMedia(true);

    try {
      const { url, fileType, error: uploadError } = await uploadChatMedia(
        userId,
        file,
      );

      if (uploadError || !url || !fileType) {
        alert(uploadError?.message || "Upload mislukt");
        return;
      }

      const { error } = await insertChatMediaMessage({
        userId,
        fileUrl: url,
        fileType,
        caption,
        groupId: activeGroupId || undefined,
        receiverId: activeUserId || undefined,
        replyTo: replyingTo,
      });

      if (error) {
        alert(error.message);
        return;
      }

      const createdAt = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender_id: userId,
        receiver_id: activeUserId || null,
        group_id: activeGroupId || null,
        body: caption.trim() || null,
        file_url: url,
        file_type: fileType,
        created_at: createdAt,
        read_at: null,
        reply_to_body: replyingTo ? getReplyText(replyingTo) : null,
        reply_to_file_type: replyingTo?.file_type || null,
        reply_to_sender_id: replyingTo?.sender_id || null,
      };

      setMessages((current) => [...current, optimisticMessage]);
      updateSidebarAfterMessage(
        getMessagePreview(optimisticMessage, userId),
        createdAt,
      );
      setReplyingTo(null);
      setPendingMediaFile(null);
      forceScrollToBottom();
    } finally {
      setUploadingMedia(false);
    }
  }

  async function sendVoiceMessage(blob: Blob, mimeType: string) {
    if (!userId || (!activeUserId && !activeGroupId) || uploadingMedia) return;
    if (!canSendMessages) {
      alert("Alleen beheerders kunnen berichten sturen in deze groep.");
      return;
    }

    setUploadingMedia(true);

    try {
      const { url, fileType, error: uploadError } = await uploadChatAudio(
        userId,
        blob,
        mimeType,
      );

      if (uploadError || !url || !fileType) {
        alert(uploadError?.message || "Upload mislukt");
        return;
      }

      const { error } = await insertChatMediaMessage({
        userId,
        fileUrl: url,
        fileType,
        groupId: activeGroupId || undefined,
        receiverId: activeUserId || undefined,
        replyTo: replyingTo,
      });

      if (error) {
        alert(error.message);
        return;
      }

      const createdAt = new Date().toISOString();
      const optimisticMessage: ChatMessage = {
        id: crypto.randomUUID(),
        sender_id: userId,
        receiver_id: activeUserId || null,
        group_id: activeGroupId || null,
        body: null,
        file_url: url,
        file_type: "audio",
        created_at: createdAt,
        read_at: null,
        reply_to_body: replyingTo ? getReplyText(replyingTo) : null,
        reply_to_file_type: replyingTo?.file_type || null,
        reply_to_sender_id: replyingTo?.sender_id || null,
      };

      setMessages((current) => [...current, optimisticMessage]);
      updateSidebarAfterMessage(
        getMessagePreview(optimisticMessage, userId),
        createdAt,
      );
      setReplyingTo(null);
      forceScrollToBottom();
    } finally {
      setUploadingMedia(false);
    }
  }

  function getConversationTarget() {
    if (activeUserId) return { peerUserId: activeUserId } as const;
    if (activeGroupId) return { groupId: activeGroupId } as const;
    return null;
  }

  async function handlePinConversation() {
    const target = getConversationTarget();
    if (!target || !userId) return;

    const current = getCurrentConversationSettings();
    const nextPinned = !current?.pinned;
    patchCurrentConversationSettings({ pinned: nextPinned });
    await pinConversation(userId, target, nextPinned);
    await refreshConversationSettings();
  }

  async function handleMuteConversation() {
    const target = getConversationTarget();
    if (!target || !userId) return;

    const current = getCurrentConversationSettings();
    const nextMuted = !current?.muted;
    patchCurrentConversationSettings({ muted: nextMuted });
    await muteConversation(userId, target, nextMuted);
    await refreshConversationSettings();
  }

  async function handleMarkUnreadConversation() {
    const target = getConversationTarget();
    if (!target || !userId) return;

    await markConversationUnread(userId, target);
    if (activeUserId) {
      setContacts((current) =>
        current.map((contact) =>
          contact.id === activeUserId
            ? { ...contact, unreadCount: Math.max(contact.unreadCount || 0, 1) }
            : contact,
        ),
      );
    } else if (activeGroupId) {
      setGroups((current) =>
        current.map((group) =>
          group.id === activeGroupId
            ? { ...group, unreadCount: Math.max(group.unreadCount || 0, 1) }
            : group,
        ),
      );
    }
  }

  async function handleClearConversation() {
    const target = getConversationTarget();
    if (!target || !userId) return;

    if (!confirm("Alle berichten in deze chat wissen?")) return;

    await clearConversation(userId, target);
    await refreshConversationSettings();
    setMessages([]);
  }

  async function handleDeleteConversation() {
    const target = getConversationTarget();
    if (!target || !userId) return;

    if (!confirm("Chat verwijderen?")) return;

    await hideConversation(userId, target);
    await refreshConversationSettings();
    closeConversation();
  }

  function handleAttachFiles(files: FileList | null) {
    const file = files?.[0];

    if (!file) return;

    setPendingMediaFile(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function getEntryConversationTarget(entry: ChatListEntry) {
    if (entry.kind === "direct") {
      return { peerUserId: entry.id } as const;
    }

    return { groupId: entry.id } as const;
  }

  function getEntrySettings(entry: ChatListEntry | null) {
    if (!entry) return undefined;

    const key =
      entry.kind === "direct"
        ? getSettingsKey({ peerUserId: entry.id })
        : getSettingsKey({ groupId: entry.id });

    return conversationSettings[key];
  }

  function patchEntrySettings(
    entry: ChatListEntry,
    patch: Partial<ChatConversationSettings>,
  ) {
    const key =
      entry.kind === "direct"
        ? getSettingsKey({ peerUserId: entry.id })
        : getSettingsKey({ groupId: entry.id });

    setConversationSettings((current) => ({
      ...current,
      [key]: {
        id: current[key]?.id || "",
        user_id: userId,
        peer_user_id: entry.kind === "direct" ? entry.id : null,
        group_id: entry.kind === "group" ? entry.id : null,
        pinned: current[key]?.pinned ?? false,
        muted: current[key]?.muted ?? false,
        cleared_at: current[key]?.cleared_at ?? null,
        hidden_at: current[key]?.hidden_at ?? null,
        pinned_message_id: current[key]?.pinned_message_id ?? null,
        ...patch,
      },
    }));
  }

  async function handleEntryPin(entry: ChatListEntry) {
    if (!userId) return;
    const target = getEntryConversationTarget(entry);
    const settings = getEntrySettings(entry);
    const nextPinned = !settings?.pinned;
    patchEntrySettings(entry, { pinned: nextPinned });
    await pinConversation(userId, target, nextPinned);
    await refreshConversationSettings();
  }

  async function handleEntryMute(entry: ChatListEntry) {
    if (!userId) return;
    const target = getEntryConversationTarget(entry);
    const settings = getEntrySettings(entry);
    const nextMuted = !settings?.muted;
    patchEntrySettings(entry, { muted: nextMuted });

    if (entry.kind === "direct") {
      setContacts((current) =>
        current.map((contact) =>
          contact.id === entry.id
            ? { ...contact, unreadCount: nextMuted ? 0 : contact.unreadCount }
            : contact,
        ),
      );
    } else {
      setGroups((current) =>
        current.map((group) =>
          group.id === entry.id
            ? { ...group, unreadCount: nextMuted ? 0 : group.unreadCount }
            : group,
        ),
      );
    }

    await muteConversation(userId, target, nextMuted);
    await refreshConversationSettings();
    if (!nextMuted) {
      await bootstrapSidebarCounts();
    }
  }

  async function handleEntryMarkUnread(entry: ChatListEntry) {
    if (!userId) return;
    await markConversationUnread(userId, getEntryConversationTarget(entry));
    await bootstrapSidebarCounts();
  }

  async function handleEntryClear(entry: ChatListEntry) {
    if (!userId) return;
    if (!confirm("Alle berichten in deze chat wissen?")) return;
    await clearConversation(userId, getEntryConversationTarget(entry));
    await refreshConversationSettings();
    if (
      (entry.kind === "direct" && entry.id === activeUserId) ||
      (entry.kind === "group" && entry.id === activeGroupId)
    ) {
      setMessages([]);
    }
  }

  async function handleEntryDelete(entry: ChatListEntry) {
    if (!userId) return;
    if (!confirm("Chat verwijderen?")) return;
    await hideConversation(userId, getEntryConversationTarget(entry));
    await refreshConversationSettings();
    if (
      (entry.kind === "direct" && entry.id === activeUserId) ||
      (entry.kind === "group" && entry.id === activeGroupId)
    ) {
      closeConversation();
    }
  }

  async function bootstrapSidebarCounts() {
    if (!userId) return;

    const [loadedContacts, loadedGroups] = await Promise.all([
      loadContacts(userId, userRole, conversationSettings),
      loadGroups(userId, conversationSettings),
    ]);

    setContacts(loadedContacts);
    setGroups(loadedGroups);
  }

  function canDeleteMessage(msg: ChatMessage) {
    if (msg.sender_id === userId) return true;

    if (activeGroupId) {
      return (
        groupMemberRoles[userId] === "admin" ||
        activeGroup?.created_by === userId
      );
    }

    return false;
  }

  async function handleDeleteMessage(msg: ChatMessage) {
    if (!canDeleteMessage(msg)) return;
    if (!confirm("Bericht verwijderen?")) return;

    const { error } = await supabase.from("messages").delete().eq("id", msg.id);

    if (error) {
      alert(error.message);
      return;
    }

    setMessages((current) => current.filter((item) => item.id !== msg.id));

    const target = getConversationTarget();
    if (target && getCurrentConversationSettings()?.pinned_message_id === msg.id) {
      await pinConversationMessage(userId, target, null);
      await refreshConversationSettings();
    }
  }

  async function handlePinMessage(msg: ChatMessage) {
    const target = getConversationTarget();
    if (!target || !userId) return;

    const current = getCurrentConversationSettings();
    const nextId = current?.pinned_message_id === msg.id ? null : msg.id;
    patchCurrentConversationSettings({ pinned_message_id: nextId });
    await pinConversationMessage(userId, target, nextId);
    await refreshConversationSettings();
  }

  function openMessageMenu(
    msg: ChatMessage,
    event: React.MouseEvent<HTMLElement>,
  ) {
    event.stopPropagation();
    const anchor = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setMessageMenu({ message: msg, anchorRect: anchor });
  }

  function scrollToMessage(messageId: string) {
    setHighlightedMessageId(messageId);
    const element = document.getElementById(`chat-message-${messageId}`);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      setHighlightedMessageId("");
    }, 1800);
  }

  function shouldUseInlineTimestamp(
    message: ChatMessage,
    exerciseVideo: ReturnType<typeof parseExerciseVideoMessage>,
  ) {
    if (exerciseVideo || parsePollMessage(message.body) || message.file_url) {
      return false;
    }
    if (!message.body) return false;
    if (message.body.includes("\n")) return false;
    return message.body.length <= 48;
  }

  async function sendPoll() {
    if (!activeGroupId || !userId || !canSendMessages) return;

    const question = pollQuestion.trim();
    const options = pollOptions
      .map((text, index) => ({
        id: createPollOptionId(index),
        text: text.trim(),
      }))
      .filter((option) => option.text);

    if (!question) {
      alert("Vul een vraag in.");
      return;
    }

    if (options.length < 2) {
      alert("Voeg minimaal 2 opties toe.");
      return;
    }

    if (options.length > 6) {
      alert("Maximaal 6 opties toegestaan.");
      return;
    }

    setCreatingPoll(true);

    const body = buildPollMessageBody(question, options, userId);
    const { data, error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        group_id: activeGroupId,
        body,
        read_at: null,
      })
      .select("*")
      .single();

    setCreatingPoll(false);

    if (error || !data) {
      alert(error?.message || "Poll kon niet worden aangemaakt.");
      return;
    }

    const createdMessage = data as ChatMessage;
    setMessages((current) => [...current, createdMessage]);
    setPollCreateOpen(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
    setAttachMenuOpen(false);

    setGroups((current) =>
      current.map((group) =>
        group.id === activeGroupId
          ? {
              ...group,
              lastMessage: question,
              lastMessageSender: "Jij",
              lastMessageTime: createdMessage.created_at,
              unreadCount: 0,
            }
          : group,
      ),
    );

    forceScrollToBottom();
  }

  async function handlePollVote(pollMessageId: string, optionId: string) {
    if (!userId) return;

    setVotingPollId(pollMessageId);

    const { error } = await castPollVote(pollMessageId, userId, optionId);

    setVotingPollId("");

    if (error) {
      alert(error.message);
      return;
    }

    const votes = await loadPollVotes(pollMessageIds);
    setPollVotes(votes);
  }

  function openListMenu(entry: ChatListEntry) {
    setListMenuEntry(entry);
  }

  function startListLongPress(entry: ChatListEntry) {
    listLongPressTriggeredRef.current = false;

    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }

    longPressTimerRef.current = window.setTimeout(() => {
      listLongPressTriggeredRef.current = true;
      openListMenu(entry);
    }, 500);
  }

  function cancelListLongPress() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handleListEntryClick(entry: ChatListEntry) {
    if (listLongPressTriggeredRef.current) {
      listLongPressTriggeredRef.current = false;
      return;
    }

    if (entry.kind === "direct") {
      openDirectChat(entry.id);
      return;
    }

    openGroupChat(entry.id);
  }

  function renderChatListEntry(entry: ChatListEntry, highlightQuery = "") {
    const isActive =
      entry.kind === "direct"
        ? entry.id === activeUserId
        : entry.id === activeGroupId;
    const settings = getEntrySettings(entry);
    const isMuted = Boolean(settings?.muted);
    const isPinned = Boolean(settings?.pinned);
    const hasUnread = !isMuted && (entry.unreadCount || 0) > 0;
    const title = entry.kind === "direct" ? entry.full_name : entry.name;

    return (
      <div
        key={`${highlightQuery ? "search-chat-" : ""}${entry.kind}-${entry.id}`}
        className={`group flex w-full items-stretch border-b border-gray-100 px-2 py-2 transition hover:bg-gray-50 ${
          isActive ? "bg-gray-100" : ""
        }`}
      >
        <button
          type="button"
          onClick={() => handleListEntryClick(entry)}
          onContextMenu={(event) => {
            event.preventDefault();
            openListMenu(entry);
          }}
          onTouchStart={() => startListLongPress(entry)}
          onTouchEnd={cancelListLongPress}
          onTouchMove={cancelListLongPress}
          className="flex min-w-0 flex-1 items-center gap-3 px-2 py-1 text-left"
        >
          <ChatAvatar
            name={entry.kind === "direct" ? entry.full_name : entry.name}
            imageUrl={entry.avatar_url}
            className="h-12 w-12"
            fallbackClassName={
              entry.kind === "group" ? "bg-gray-700 text-white" : "bg-black text-white"
            }
          >
            {entry.kind === "group" ? <Users className="h-5 w-5" /> : undefined}
          </ChatAvatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                {isPinned && (
                  <Pin className="h-3.5 w-3.5 shrink-0 text-gray-500" aria-hidden />
                )}
                {isMuted && (
                  <BellOff
                    className="h-3.5 w-3.5 shrink-0 text-gray-500"
                    aria-hidden
                  />
                )}
                <p
                  className={`truncate text-[15px] ${
                    hasUnread
                      ? "font-bold text-black"
                      : "font-semibold text-black"
                  }`}
                >
                  {highlightQuery ? (
                    <HighlightedText text={title || ""} query={highlightQuery} />
                  ) : (
                    title
                  )}
                </p>
              </div>

              <span
                  className={`shrink-0 text-xs ${
                    hasUnread ? "font-semibold text-black" : "text-gray-400"
                  }`}
                >
                  {formatChatListTime(entry.lastMessageTime)}
                </span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-3">
              <p
                className={`truncate text-sm ${
                  hasUnread ? "font-semibold text-black" : "text-gray-500"
                }`}
              >
                {entry.lastMessageSender
                  ? `${entry.lastMessageSender}: ${entry.lastMessage}`
                  : entry.lastMessage}
              </p>

              <div className="flex shrink-0 items-center">
                {hasUnread && (
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full bg-black transition-all duration-200 group-hover:mr-1.5"
                    aria-label="Ongelezen"
                  />
                )}
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openListMenu(entry);
                  }}
                  className="flex h-4 w-0 items-center justify-center overflow-hidden text-gray-400 opacity-0 transition-all duration-200 hover:text-black group-hover:w-4 group-hover:opacity-100 max-md:hidden"
                  aria-label="Chatopties"
                >
                  <MoreVertical className="h-3.5 w-3.5 shrink-0" />
                </button>
              </div>
            </div>
          </div>
        </button>
      </div>
    );
  }

  async function handleCreateGroup() {
    if (!newGroupName.trim() || selectedGroupMemberIds.length === 0 || !userId) {
      alert("Kies een groepsnaam en minimaal één atleet.");
      return;
    }

    setCreatingGroup(true);

    const { group, error } = await createChatGroup({
      name: newGroupName.trim(),
      createdBy: userId,
      memberIds: selectedGroupMemberIds,
    });

    setCreatingGroup(false);

    if (error || !group) {
      alert(error?.message || "Groep kon niet worden aangemaakt.");
      return;
    }

    const refreshedGroups = await loadGroups(userId, conversationSettings);
    setGroups(refreshedGroups);
    setCreateGroupOpen(false);
    setNewGroupName("");
    setSelectedGroupMemberIds([]);
    openGroupChat(group.id);
  }

  const chatEntries = useMemo<ChatListEntry[]>(() => {
    const directEntries: ChatListEntry[] = contacts.map((contact) => ({
      ...contact,
      kind: "direct",
    }));

    const groupEntries: ChatListEntry[] = groups.map((group) => ({
      ...group,
      kind: "group",
    }));

    return [...groupEntries, ...directEntries]
      .filter((entry) => {
        const key =
          entry.kind === "direct"
            ? getSettingsKey({ peerUserId: entry.id })
            : getSettingsKey({ groupId: entry.id });
        const hiddenAt = conversationSettings[key]?.hidden_at;

        if (!hiddenAt) return true;
        if (entry.kind === "direct" && entry.id === activeUserId) return true;
        if (entry.kind === "group" && entry.id === activeGroupId) return true;
        return false;
      })
      .sort((a, b) => {
        const aKey =
          a.kind === "direct"
            ? getSettingsKey({ peerUserId: a.id })
            : getSettingsKey({ groupId: a.id });
        const bKey =
          b.kind === "direct"
            ? getSettingsKey({ peerUserId: b.id })
            : getSettingsKey({ groupId: b.id });
        const aPinned = conversationSettings[aKey]?.pinned ? 1 : 0;
        const bPinned = conversationSettings[bKey]?.pinned ? 1 : 0;

        if (aPinned !== bPinned) {
          return bPinned - aPinned;
        }

        const aTime = new Date(a.lastMessageTime || 0).getTime();
        const bTime = new Date(b.lastMessageTime || 0).getTime();
        return bTime - aTime;
      });
  }, [contacts, groups, conversationSettings, activeUserId, activeGroupId]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!userId || query.length < 2) {
      setGlobalSearchResults([]);
      setGlobalSearchLoading(false);
      return;
    }

    setGlobalSearchLoading(true);
    const timer = window.setTimeout(async () => {
      const results = await searchMessagesGlobally(
        userId,
        query,
        contacts.map((contact) => ({
          id: contact.id,
          full_name: contact.full_name,
        })),
        groups.map((group) => ({ id: group.id, name: group.name })),
      );
      setGlobalSearchResults(results);
      setGlobalSearchLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchQuery, userId, contacts, groups]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return chatEntries;

    return chatEntries.filter((entry) => {
      const label =
        entry.kind === "direct" ? entry.full_name || "" : entry.name || "";

      return (
        label.toLowerCase().includes(query) ||
        (entry.lastMessage || "").toLowerCase().includes(query) ||
        (entry.lastMessageSender || "").toLowerCase().includes(query)
      );
    });
  }, [chatEntries, searchQuery]);

  const showConversationOnMobile = Boolean(activeUserId || activeGroupId);
  const conversationTitle =
    activeGroup?.name || activeContact?.full_name || "Chat";
  const profileLink = activeUserId ? `/profile/${activeUserId}` : "";

  function isOutgoingMessageRead(msg: ChatMessage) {
    if (msg.read_at) return true;
    if (!activeUserId || activeGroupId) return false;
    return isMessageReadByPeer(msg.created_at, peerLastReadAt);
  }
  const currentConversationSettings = getCurrentConversationSettings();
  const canSendMessages = useMemo(() => {
    if (!activeUserId && !activeGroupId) return false;

    if (!activeGroupId || !activeGroup?.admins_only) {
      return true;
    }

    return (
      groupMemberRoles[userId] === "admin" ||
      activeGroup.created_by === userId
    );
  }, [activeUserId, activeGroupId, activeGroup, groupMemberRoles, userId]);

  const groupMembersSubtitle = useMemo(() => {
    const names = Object.values(groupMemberNames).filter(Boolean);
    if (names.length === 0) return "";
    if (names.length <= 3) return names.join(", ");
    return `${names.slice(0, 2).join(", ")}, +${names.length - 2}`;
  }, [groupMemberNames]);

  const visibleMessages = messages;

  const pinnedMessage = useMemo(() => {
    const pinnedId = currentConversationSettings?.pinned_message_id;
    if (!pinnedId) return null;
    return messages.find((item) => item.id === pinnedId) || null;
  }, [messages, currentConversationSettings?.pinned_message_id]);

  const toolsCommand = useMemo(() => parseToolsCommand(message), [message]);
  const programCommand = useMemo(() => parseProgramCommand(message), [message]);
  const bwCommand = useMemo(() => parseBwCommand(message), [message]);
  const externalsCommand = useMemo(() => parseExternalsCommand(message), [message]);
  const volumeCommand = useMemo(() => parseVolumeCommand(message), [message]);
  const intensityCommand = useMemo(() => parseIntensityCommand(message), [message]);
  const maxCommand = useMemo(() => parseMaxCommand(message), [message]);
  const dataCommand = useMemo(() => parseDataCommand(message), [message]);
  const injuriesCommand = useMemo(() => parseInjuriesCommand(message), [message]);
  const aiCommand = useMemo(() => parseAiCommand(message), [message]);
  const todoCommand = useMemo(() => parseTodoCommand(message), [message]);
  const agendaCommand = useMemo(() => parseAgendaCommand(message), [message]);
  const toolsPanelOpen =
    toolsCommand.active && Boolean(activeUserId || activeGroupId);
  const programPanelOpen =
    programCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const bwPanelOpen =
    bwCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const externalsPanelOpen =
    externalsCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const volumePanelOpen =
    volumeCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const intensityPanelOpen =
    intensityCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const maxPanelOpen =
    maxCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const dataPanelOpen =
    dataCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const injuriesPanelOpen =
    injuriesCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const aiPanelOpen =
    aiCommand.active && Boolean(activeUserId) && !activeGroupId;
  const todoPanelOpen =
    todoCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId || activeGroupId);
  const agendaPanelOpen =
    agendaCommand.active &&
    userRole === "coach" &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const sidePanelOpen =
    programPanelOpen ||
    bwPanelOpen ||
    externalsPanelOpen ||
    volumePanelOpen ||
    intensityPanelOpen ||
    maxPanelOpen ||
    dataPanelOpen ||
    injuriesPanelOpen ||
    aiPanelOpen ||
    todoPanelOpen ||
    agendaPanelOpen;
  const activeAthleteName = useMemo(() => {
    if (!activeUserId) return "Atleet";
    return (
      contacts.find((contact) => contact.id === activeUserId)?.full_name ||
      "Atleet"
    );
  }, [activeUserId, contacts]);
  const slashPanelOpen = toolsPanelOpen || sidePanelOpen;
  const slashCommandSuggestions = useMemo(
    () =>
      filterChatSlashCommands(message, {
        userRole,
        hasDirectChat: Boolean(activeUserId) && !activeGroupId,
        hasConversation: Boolean(activeUserId || activeGroupId),
      }),
    [message, userRole, activeUserId, activeGroupId],
  );
  const slashCommandMenuOpen =
    shouldShowSlashCommandMenu(message) &&
    !slashPanelOpen &&
    slashCommandSuggestions.length > 0 &&
    Boolean(activeUserId || activeGroupId);

  useEffect(() => {
    setSlashCommandActiveIndex(0);
  }, [message, slashCommandSuggestions.length]);

  const pollMessageIds = useMemo(
    () =>
      messages
        .filter((item) => parsePollMessage(item.body))
        .map((item) => item.id),
    [messages],
  );

  useEffect(() => {
    if (!activeGroupId || pollMessageIds.length === 0) {
      setPollVotes([]);
      return;
    }

    let cancelled = false;

    async function refreshPollVotes() {
      const votes = await loadPollVotes(pollMessageIds);
      if (!cancelled) {
        setPollVotes(votes);
      }
    }

    void refreshPollVotes();

    const channel = supabase
      .channel(`poll-votes-${activeGroupId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_poll_votes",
        },
        () => {
          void refreshPollVotes();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [activeGroupId, pollMessageIds.join("|")]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`messages-live-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const incoming = payload.new as ChatMessage;

          const isDirectForUser =
            !incoming.group_id &&
            (incoming.sender_id === userId ||
              incoming.receiver_id === userId);

          const isGroupForUser = Boolean(
            incoming.group_id &&
              groups.some((group) => group.id === incoming.group_id),
          );

          if (!isDirectForUser && !isGroupForUser) return;

          const isActiveDirect =
            Boolean(activeUserId) &&
            !incoming.group_id &&
            ((incoming.sender_id === userId &&
              incoming.receiver_id === activeUserId) ||
              (incoming.sender_id === activeUserId &&
                incoming.receiver_id === userId));

          const isActiveGroup =
            Boolean(activeGroupId) && incoming.group_id === activeGroupId;

          if (isActiveDirect || isActiveGroup) {
            const settingsKey = activeUserId
              ? getSettingsKey({ peerUserId: activeUserId })
              : getSettingsKey({ groupId: activeGroupId! });
            const clearedAt = conversationSettings[settingsKey]?.cleared_at;

            setMessages((current) => {
              if (current.some((item) => item.id === incoming.id)) {
                return current;
              }

              return filterMessagesByClearedAt(
                [...current, incoming],
                clearedAt,
              );
            });
          }

          if (!incoming.group_id) {
            const peerId =
              incoming.sender_id === userId
                ? incoming.receiver_id
                : incoming.sender_id;

            if (!peerId) return;

            const preview = getMessagePreview(incoming, userId);
            const isActive = peerId === activeUserId;
            const fromSelf = incoming.sender_id === userId;

            setContacts((current) =>
              current.map((contact) => {
                if (contact.id !== peerId) return contact;

                return {
                  ...contact,
                  lastMessage: preview.text,
                  lastMessageSender:
                    preview.sender ||
                    (fromSelf ? "Jij" : contact.full_name),
                  lastMessageTime: incoming.created_at,
                  unreadCount: isActive || fromSelf
                    ? contact.unreadCount || 0
                    : Math.max(contact.unreadCount || 0, 1),
                };
              }),
            );

            if (!isActive && !fromSelf) {
              notifyChatUnreadChanged();
            }

            return;
          }

          const preview = getMessagePreview(
            incoming,
            userId,
            groupMemberNames[incoming.sender_id] || "",
          );
          const isActive = incoming.group_id === activeGroupId;
          const fromSelf = incoming.sender_id === userId;

          setGroups((current) =>
            current.map((group) => {
              if (group.id !== incoming.group_id) return group;

              return {
                ...group,
                lastMessage: preview.text,
                lastMessageSender:
                  preview.sender ||
                  groupMemberNames[incoming.sender_id] ||
                  group.lastMessageSender ||
                  "Groep",
                lastMessageTime: incoming.created_at,
                unreadCount: isActive || fromSelf
                  ? group.unreadCount || 0
                  : Math.max(group.unreadCount || 0, 1),
              };
            }),
          );

          if (!isActive && !fromSelf) {
            notifyChatUnreadChanged();
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const removed = payload.old as { id?: string };
          if (!removed.id) return;

          setMessages((current) =>
            current.filter((item) => item.id !== removed.id),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [
    activeUserId,
    activeGroupId,
    userId,
    conversationSettings,
    groupMemberNames,
    groups,
  ]);

  function selectSlashCommand(command: string) {
    setMessage(command);
    setSlashCommandActiveIndex(0);
    inputRef.current?.focus();
  }

  useEffect(() => {
    if (!toolsPanelOpen || !userId) return;

    let cancelled = false;

    async function loadToolPrograms() {
      setToolProgramsLoading(true);

      let blocksQuery = supabase
        .from("program_blocks")
        .select("id, title, athlete_id")
        .order("title", { ascending: true });

      if (!isCoachLikeRole(userRole)) {
        blocksQuery = blocksQuery.eq("athlete_id", userId);
      }

      const { data: blocks, error } = await blocksQuery;

      if (cancelled) return;

      if (error || !blocks) {
        setToolPrograms([]);
        setToolProgramsLoading(false);
        return;
      }

      const athleteIds = Array.from(
        new Set(
          blocks
            .map((block) => block.athlete_id)
            .filter((id): id is string => Boolean(id)),
        ),
      );

      let athleteNames: Record<string, string> = {};

      if (athleteIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", athleteIds);

        athleteNames = Object.fromEntries(
          (profiles || []).map((profile) => [
            profile.id,
            profile.full_name || "Atleet",
          ]),
        );
      }

      if (cancelled) return;

      setToolPrograms(
        blocks.map((block) => ({
          id: block.id,
          title: block.title || "Programma",
          athleteName: block.athlete_id
            ? athleteNames[block.athlete_id]
            : undefined,
        })),
      );
      setToolProgramsLoading(false);
    }

    void loadToolPrograms();

    return () => {
      cancelled = true;
    };
  }, [toolsPanelOpen, userId, userRole]);

  return (
    <AppShell
      className="fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] overflow-hidden bg-gray-100 lg:relative lg:inset-auto lg:min-h-screen"
      contentClassName="flex h-full min-h-0 flex-1 overflow-hidden p-0 pb-0"
    >
      <div
        className={`flex h-full min-h-0 w-full overflow-hidden bg-gray-100 ${
          sidePanelOpen ? "flex-row" : ""
        }`}
      >
        <aside
          className={`flex h-full min-h-0 w-full flex-col border-r border-gray-200 bg-white md:w-[420px] md:max-w-[40%] ${
            sidePanelOpen
              ? "hidden"
              : showConversationOnMobile
                ? "hidden md:flex"
                : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-gray-200 bg-white px-4 pb-3 pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-black">Chats</h1>
              <div className="flex items-center gap-2">
                {isCoachLikeRole(userRole) && (
                  <>
                    <button
                      type="button"
                      onClick={() => setBroadcastOpen(true)}
                      className="app-focus-ring flex h-10 items-center rounded-full bg-brand-purple px-3 text-xs font-semibold text-white"
                    >
                      Broadcast
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreateGroupOpen(true)}
                      className="app-focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-black transition hover:bg-gray-200"
                      aria-label="Nieuwe groep"
                    >
                      <Users className="h-5 w-5" />
                    </button>
                  </>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                  {getInitials(userName)}
                </div>
              </div>
            </div>

            <ChatSearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Zoek op naam of bericht"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white">
            {bootstrapping && (
              <div className="px-4 py-4">
                <SkeletonList rows={6} />
              </div>
            )}

            {searchQuery.trim().length > 0 &&
              filteredEntries.map((entry) =>
                renderChatListEntry(entry, searchQuery),
              )}

            {searchQuery.trim().length > 0 &&
              !bootstrapping &&
              filteredEntries.length === 0 && (
                <p className="px-4 py-4 text-sm text-gray-500">Geen chats gevonden.</p>
              )}

            {searchQuery.trim().length >= 2 && (
              <>
                {globalSearchLoading && (
                  <p className="px-4 py-4 text-sm text-gray-500">Berichten zoeken...</p>
                )}

                {!globalSearchLoading &&
                  globalSearchResults.map((result) => (
                    <button
                      key={`${result.chatKind}-${result.chatId}-${result.message.id}`}
                      type="button"
                      onClick={() => {
                        if (result.chatKind === "direct") {
                          openDirectChat(result.chatId);
                        } else {
                          openGroupChat(result.chatId);
                        }
                        window.setTimeout(() => {
                          scrollToMessage(result.message.id);
                        }, 350);
                      }}
                      className="flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-black">
                          {result.chatTitle}
                        </p>
                        <span className="shrink-0 text-xs text-gray-400">
                          {formatChatListTime(result.message.created_at)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-gray-600">
                        <HighlightedText
                          text={getSearchableMessageText(result.message)}
                          query={searchQuery}
                        />
                      </p>
                    </button>
                  ))}

                {!globalSearchLoading && globalSearchResults.length === 0 && (
                  <p className="px-4 py-4 text-sm text-gray-500">
                    Geen berichten gevonden.
                  </p>
                )}
              </>
            )}

            {searchQuery.trim().length < 2 && !bootstrapping && filteredEntries.length === 0 && (
              <p className="px-4 py-6 text-sm text-gray-500">
                Geen chats gevonden.
              </p>
            )}

            {searchQuery.trim().length < 2 &&
              filteredEntries.map((entry) => renderChatListEntry(entry))}
          </div>
        </aside>

        {programPanelOpen && activeUserId && (
          <ChatProgramPanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeProgramPanel}
          />
        )}

        {bwPanelOpen && activeUserId && (
          <ChatBwPanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeBwPanel}
            canSendChart={canSendMessages && !uploadingMedia}
            onSendChartToChat={(file, caption) => {
              void sendMediaFile(file, caption);
            }}
          />
        )}

        {externalsPanelOpen && activeUserId && (
          <ChatExternalsPanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeExternalsPanel}
            canSendChart={canSendMessages && !uploadingMedia}
            onSendChartToChat={(file, caption) => {
              void sendMediaFile(file, caption);
            }}
          />
        )}

        {volumePanelOpen && activeUserId && (
          <ChatVolumePanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeVolumePanel}
          />
        )}

        {intensityPanelOpen && activeUserId && (
          <ChatIntensityPanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeIntensityPanel}
          />
        )}

        {maxPanelOpen && activeUserId && (
          <ChatMaxPanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeMaxPanel}
          />
        )}

        {dataPanelOpen && activeUserId && (
          <ChatRawDataPanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeDataPanel}
          />
        )}

        {injuriesPanelOpen && activeUserId && (
          <ChatInjuriesPanel
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeInjuriesPanel}
          />
        )}

        {aiPanelOpen && activeUserId && (
          <ChatAiPanel
            userRole={userRole}
            athleteId={userRole === "coach" ? activeUserId : userId}
            athleteName={
              userRole === "coach" ? activeAthleteName : userName || "Atleet"
            }
            initialQuery={aiCommand.query}
            onClose={closeAiPanel}
            onShareToChat={shareAiAnswerToChat}
          />
        )}

        {todoPanelOpen && userId && (
          <ChatTodoPanel coachId={userId} onClose={closeTodoPanel} />
        )}

        {agendaPanelOpen && userId && activeUserId && (
          <ChatAgendaPanel
            coachId={userId}
            athleteId={activeUserId}
            athleteName={activeAthleteName}
            onClose={closeAgendaPanel}
          />
        )}

        <section
          ref={conversationPanelRef}
          className={`flex h-full min-h-0 flex-col overflow-hidden bg-gray-100 overscroll-x-none ${
            sidePanelOpen
              ? "min-w-0 flex-1"
              : `flex-1 md:relative ${
                  showConversationOnMobile
                    ? "fixed inset-0 z-50 touch-pan-y md:static md:inset-auto md:z-auto"
                    : "hidden md:flex"
                }`
          }`}
        >
          {!activeUserId && !activeGroupId ? (
            <EmptyState
              icon="chat"
              title="Limitless Chat"
              description="Stuur berichten naar je coach, atleten of groepen. Selecteer een chat links om te beginnen."
            />
          ) : showGroupInfo && activeGroupId ? (
            <GroupInfoPanel
              groupId={activeGroupId}
              userId={userId}
              contacts={contacts}
              onBack={closeGroupInfo}
              onUpdated={async () => {
                const refreshedGroups = await loadGroups(userId, conversationSettings);
                setGroups(refreshedGroups);
                setActiveGroup(
                  refreshedGroups.find((group) => group.id === activeGroupId) ||
                    null,
                );
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <header className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 py-3 md:px-4">
                <button
                  type="button"
                  onClick={closeConversation}
                  className="rounded-xl p-2 hover:bg-gray-100 md:hidden"
                  aria-label="Terug naar chats"
                >
                  <ArrowLeft className="h-5 w-5 text-black" />
                </button>

                {activeGroupId ? (
                  <button
                    type="button"
                    onClick={() => openGroupInfo(activeGroupId)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <ChatAvatar
                      name={activeGroup?.name}
                      imageUrl={activeGroup?.avatar_url}
                      className="h-10 w-10"
                      fallbackClassName="bg-gray-700 text-white"
                    >
                      <Users className="h-5 w-5" />
                    </ChatAvatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-bold text-black">
                        {conversationTitle}
                      </h2>
                      <p className="truncate text-sm text-gray-500">
                        {groupMembersSubtitle || `${Object.keys(groupMemberNames).length} deelnemers`}
                      </p>
                    </div>
                  </button>
                ) : (
                  <Link
                    href={profileLink}
                    onClick={() => saveChatReturnRoute(`/chat/${activeUserId}`)}
                    className="flex min-w-0 flex-1 items-center gap-3"
                  >
                    <ChatAvatar
                      name={activeContact?.full_name}
                      imageUrl={activeContact?.avatar_url}
                      className="h-10 w-10"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold text-black">
                        {conversationTitle}
                      </h2>
                      <p className="text-sm text-gray-500">
                        {userRole === "coach" ? (
                          <>
                            Atleet
                            {athleteProgramLabel ? (
                              <span className="text-gray-400">
                                {" "}
                                · {athleteProgramLabel}
                              </span>
                            ) : null}
                          </>
                        ) : (
                          "Coach"
                        )}
                      </p>
                    </div>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => setMessageSearchOpen((current) => !current)}
                  className="rounded-xl p-2 hover:bg-gray-100"
                  aria-label="Zoek in chat"
                >
                  <Search className="h-5 w-5 text-black" />
                </button>

                {!activeGroupId && activeUserId ? (
                  <button
                    type="button"
                    onClick={() => setMessage("/ai")}
                    className="rounded-xl p-2 hover:bg-purple-50"
                    aria-label="AI-assistent openen"
                    title="AI-assistent"
                  >
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </button>
                ) : null}

                <ChatConversationMenu
                  pinned={Boolean(currentConversationSettings?.pinned)}
                  muted={Boolean(currentConversationSettings?.muted)}
                  onPin={() => void handlePinConversation()}
                  onMute={() => void handleMuteConversation()}
                  onMarkUnread={() => void handleMarkUnreadConversation()}
                  onClear={() => void handleClearConversation()}
                  onDelete={() => void handleDeleteConversation()}
                />
              </header>

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {messageSearchOpen ? (
                <ChatMessageSearchPanel
                  query={messageSearchQuery}
                  onQueryChange={setMessageSearchQuery}
                  onClose={() => {
                    setMessageSearchOpen(false);
                    setMessageSearchQuery("");
                  }}
                  messages={messages}
                  onSelectMessage={(selectedMessage) => {
                    setMessageSearchOpen(false);
                    setMessageSearchQuery("");
                    window.setTimeout(() => {
                      scrollToMessage(selectedMessage.id);
                    }, 50);
                  }}
                />
              ) : (
                <>
              {!canSendMessages && activeGroupId && (
                <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
                  Alleen beheerders kunnen berichten sturen in deze groep.
                </div>
              )}

              {pinnedMessage && (
                <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-emerald-200 bg-emerald-50 px-3 py-2.5 md:px-4">
                  <button
                    type="button"
                    onClick={() => scrollToMessage(pinnedMessage.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80"
                  >
                    <Pin className="h-4 w-4 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-emerald-700">
                        Vastgezet bericht
                      </p>
                      <p className="truncate text-sm text-gray-700">
                        {getReplyText(pinnedMessage)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePinMessage(pinnedMessage)}
                    className="shrink-0 p-1 text-gray-500 transition hover:text-black"
                    aria-label="Vastgezet bericht losmaken"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div
                ref={messagesContainerRef}
                data-chat-scroll="true"
                onScroll={handleMessagesScroll}
                className={`min-h-0 flex-1 overflow-y-auto overscroll-contain bg-gray-100 px-3 py-4 transition-opacity duration-150 md:px-8 ${
                  switchingConversation ? "opacity-70" : "opacity-100"
                }`}
              >
                {switchingConversation && messages.length === 0 && (
                  <p className="text-sm text-gray-500">Chat laden...</p>
                )}

                {visibleMessages.map((msg, index) => {
                  const isMine = msg.sender_id === userId;
                  const previous = visibleMessages[index - 1];
                  const showDate = shouldShowDateDivider(msg, previous);
                  const exerciseVideo = parseExerciseVideoMessage(msg.body);
                  const pollMessage = parsePollMessage(msg.body);
                  const aiAssistantMessage = parseAiAssistantMessage(msg.body);
                  const inlineTimestamp = shouldUseInlineTimestamp(msg, exerciseVideo);

                  if (aiAssistantMessage) {
                    return (
                      <div key={msg.id} id={`chat-message-${msg.id}`} className="mb-3">
                        {showDate && (
                          <div className="my-4 flex justify-center">
                            <span className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm">
                              {formatDateDivider(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <ChatAiMessage
                          question={aiAssistantMessage.question}
                          answer={aiAssistantMessage.answer}
                        />
                        <p className="mt-1 text-center text-[11px] text-gray-400">
                          {formatMessageTime(msg.created_at)}
                          {isMine && activeUserId && !activeGroupId ? (
                            <span className="ml-1 inline-flex align-middle">
                              {isOutgoingMessageRead(msg) ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      id={`chat-message-${msg.id}`}
                      className={
                        highlightedMessageId === msg.id
                          ? "rounded-2xl bg-emerald-100/70 transition-colors"
                          : ""
                      }
                    >
                      {showDate && (
                        <div className="my-4 flex justify-center">
                          <span className="rounded-xl bg-white px-3 py-1 text-xs font-semibold text-gray-500 shadow-sm">
                            {formatDateDivider(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`mb-1 flex w-full ${isMine ? "justify-end" : "justify-start"}`}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          handleReply(msg);
                        }}
                      >
                        <div
                          className={`flex max-w-[82%] flex-col md:max-w-[65%] ${
                            isMine ? "items-end" : "items-start"
                          }`}
                        >
                          {activeGroupId && (
                            <span className="mb-1 px-1 text-xs font-semibold text-gray-500">
                              {isMine
                                ? "Jij"
                                : groupMemberNames[msg.sender_id] || "Onbekend"}
                            </span>
                          )}

                          <div
                            className={`group relative px-4 py-3 shadow-sm ${
                              isMine
                                ? "rounded-2xl rounded-br-md bg-black text-white"
                                : "rounded-2xl rounded-bl-md bg-white text-black"
                            }`}
                          >
                          <ChatMessageMenuTrigger
                            isMine={isMine}
                            onOpen={(event) => openMessageMenu(msg, event)}
                          />
                          {msg.reply_to_body && (
                            <div
                              className={`mb-2 rounded-xl border-l-4 px-3 py-2 ${
                                isMine
                                  ? "border-white/70 bg-white/10"
                                  : "border-black bg-gray-50"
                              }`}
                            >
                              <p
                                className={`text-xs font-semibold ${
                                  isMine ? "text-white/80" : "text-black"
                                }`}
                              >
                                {getReplySenderLabel(msg.reply_to_sender_id)}
                              </p>
                              <p
                                className={`truncate text-sm ${
                                  isMine ? "text-white/75" : "text-gray-600"
                                }`}
                              >
                                {msg.reply_to_body}
                              </p>
                            </div>
                          )}

                          {msg.file_url && msg.file_type === "image" && (
                            <img
                              src={msg.file_url}
                              alt="Gedeelde foto"
                              onLoad={handleMediaLoaded}
                              onClick={(event) => event.stopPropagation()}
                              className="mb-2 max-h-72 w-full rounded-xl object-cover"
                            />
                          )}

                          {msg.file_url && msg.file_type === "video" && exerciseVideo && (
                            <div onClick={(event) => event.stopPropagation()}>
                              <ExerciseVideoMessage
                                videoUrl={msg.file_url}
                                payload={exerciseVideo}
                                isMine={isMine}
                              />
                            </div>
                          )}

                          {msg.file_url && msg.file_type === "video" &&
                            !exerciseVideo && (
                              <video
                                src={msg.file_url}
                                controls
                                preload="metadata"
                                playsInline
                                onLoadedData={handleMediaLoaded}
                                onClick={(event) => event.stopPropagation()}
                                className="mb-2 max-h-72 w-full rounded-xl"
                              />
                            )}

                          {msg.file_url && msg.file_type === "audio" && (
                            <div onClick={(event) => event.stopPropagation()}>
                              <ChatVoiceMessage
                                src={msg.file_url}
                                isMine={isMine}
                              />
                            </div>
                          )}

                          {pollMessage && (
                            <div onClick={(event) => event.stopPropagation()}>
                              <PollMessage
                                messageId={msg.id}
                                payload={pollMessage}
                                userId={userId}
                                isMine={isMine}
                                votes={pollVotes}
                                memberCount={Object.keys(groupMemberNames).length}
                                onVote={(optionId) =>
                                  void handlePollVote(msg.id, optionId)
                                }
                                onOpenDetails={() =>
                                  setActivePollDetails({
                                    messageId: msg.id,
                                    payload: pollMessage,
                                  })
                                }
                                voting={votingPollId === msg.id}
                              />
                            </div>
                          )}

                          {msg.body && !exerciseVideo && !pollMessage && (
                            inlineTimestamp ? (
                              <div
                                className={`flex flex-wrap items-end gap-x-2 gap-y-1 ${
                                  isMine ? "justify-end" : "justify-start"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words text-[14px] leading-6">
                                  {msg.body}
                                </p>
                                <div
                                  className={`flex shrink-0 items-center gap-1 ${
                                    isMine ? "text-white/70" : "text-gray-400"
                                  }`}
                                >
                                  <span className="text-[11px]">
                                    {formatMessageTime(msg.created_at)}
                                  </span>
                                  {isMine &&
                                    !activeGroupId &&
                                    (isOutgoingMessageRead(msg) ? (
                                      <CheckCheck className="h-3.5 w-3.5" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    ))}
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-[14px] leading-6">
                                {msg.body}
                              </p>
                            )
                          )}

                          {!msg.body && !msg.file_url && msg.file_type && (
                            <p className="text-[14px] italic opacity-80">
                              {getReplyText(msg)}
                            </p>
                          )}

                          {!inlineTimestamp && (
                          <div
                            className={`mt-1 flex items-center justify-end gap-1 ${
                              isMine ? "text-white/70" : "text-gray-400"
                            }`}
                          >
                            <span className="text-[11px]">
                              {formatMessageTime(msg.created_at)}
                            </span>
                            {isMine &&
                              !activeGroupId &&
                              (isOutgoingMessageRead(msg) ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              ))}
                          </div>
                          )}
                        </div>

                          <ChatMessageReactions
                            reactions={(messageReactions[msg.id] || []).map(
                              (reaction) => ({
                                ...reaction,
                                user_name: resolveReactionUserName(
                                  reaction.user_id,
                                ),
                              }),
                            )}
                            currentUserId={userId}
                            onToggle={(emoji) =>
                              void handleMessageReaction(msg.id, emoji)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {typingIndicator ? (
                <p className="shrink-0 px-4 py-1 text-xs text-app-muted">
                  {typingIndicator.userName} typt...
                </p>
              ) : null}

              {replyingTo && (
                <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="min-w-0 border-l-4 border-black pl-3">
                    <p className="text-sm font-semibold text-black">
                      Antwoorden op{" "}
                      {replyingTo.sender_id === userId
                        ? "jezelf"
                        : getReplySenderLabel(replyingTo.sender_id)}
                    </p>
                    <p className="truncate text-sm text-gray-600">
                      {getReplyText(replyingTo)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
                    aria-label="Antwoord annuleren"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <footer className="shrink-0 border-t border-gray-200 bg-white px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))] md:px-4 md:py-3">
                <div className="relative flex items-end gap-2 rounded-2xl border border-gray-200 bg-white px-3 py-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    onChange={(event) => handleAttachFiles(event.target.files)}
                    className="hidden"
                  />

                  <div className="relative hidden md:block">
                    <button
                      type="button"
                      onClick={() => setAttachMenuOpen((current) => !current)}
                      disabled={!canSendMessages || uploadingMedia}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Bijlage toevoegen"
                    >
                      <Plus className="h-5 w-5" />
                    </button>

                    {attachMenuOpen && (
                      <>
                        <button
                          type="button"
                          aria-label="Menu sluiten"
                          className="fixed inset-0 z-10"
                          onClick={() => setAttachMenuOpen(false)}
                        />
                        <div className="absolute bottom-12 left-0 z-20 min-w-[180px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
                          <button
                            type="button"
                            onClick={() => {
                              setAttachMenuOpen(false);
                              fileInputRef.current?.click();
                            }}
                            className="flex w-full px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
                          >
                            Foto of video
                          </button>
                          {activeGroupId && (
                            <button
                              type="button"
                              onClick={() => {
                                setAttachMenuOpen(false);
                                setPollCreateOpen(true);
                              }}
                              className="flex w-full px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
                            >
                              Poll
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setMediaCaptureOpen(true)}
                    disabled={!canSendMessages || uploadingMedia}
                    className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
                    aria-label="Camera openen"
                  >
                    <Camera className="h-5 w-5" />
                  </button>

                  {activeGroupId && (
                    <button
                      type="button"
                      onClick={() => setPollCreateOpen(true)}
                      disabled={!canSendMessages || uploadingMedia}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
                      aria-label="Poll maken"
                    >
                      <BarChart2 className="h-5 w-5" />
                    </button>
                  )}

                  <div className="relative min-w-0 flex-1">
                    {slashCommandMenuOpen && (
                      <ChatSlashCommandMenu
                        commands={slashCommandSuggestions}
                        activeIndex={slashCommandActiveIndex}
                        onSelect={selectSlashCommand}
                        onHover={setSlashCommandActiveIndex}
                      />
                    )}
                    <textarea
                    ref={inputRef}
                    rows={1}
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      if (
                        userId &&
                        (activeUserId || activeGroupId) &&
                        event.target.value.trim()
                      ) {
                        broadcastTyping(
                          getConversationTypingKey(
                            userId,
                            activeUserId || null,
                            activeGroupId || null,
                          ),
                          userId,
                          userName,
                        );
                      }
                    }}
                    onKeyDown={(event) => {
                      if (slashCommandMenuOpen) {
                        if (event.key === "ArrowDown") {
                          event.preventDefault();
                          setSlashCommandActiveIndex(
                            (current) =>
                              (current + 1) % slashCommandSuggestions.length,
                          );
                          return;
                        }

                        if (event.key === "ArrowUp") {
                          event.preventDefault();
                          setSlashCommandActiveIndex(
                            (current) =>
                              (current - 1 + slashCommandSuggestions.length) %
                              slashCommandSuggestions.length,
                          );
                          return;
                        }

                        if (event.key === "Tab" || event.key === "Enter") {
                          event.preventDefault();
                          const selected =
                            slashCommandSuggestions[slashCommandActiveIndex];
                          if (selected) {
                            selectSlashCommand(selected.command);
                          }
                          return;
                        }
                      }

                      if (event.key === "Escape") {
                        if (slashCommandMenuOpen && message.startsWith("/")) {
                          event.preventDefault();
                          setMessage("");
                          return;
                        }

                        if (slashPanelOpen) {
                          event.preventDefault();
                          if (programPanelOpen) {
                            closeProgramPanel();
                          } else if (bwPanelOpen) {
                            closeBwPanel();
                          } else if (externalsPanelOpen) {
                            closeExternalsPanel();
                          } else if (volumePanelOpen) {
                            closeVolumePanel();
                          } else if (intensityPanelOpen) {
                            closeIntensityPanel();
                          } else if (maxPanelOpen) {
                            closeMaxPanel();
                          } else if (dataPanelOpen) {
                            closeDataPanel();
                          } else if (injuriesPanelOpen) {
                            closeInjuriesPanel();
                          } else if (aiPanelOpen) {
                            closeAiPanel();
                          } else if (todoPanelOpen) {
                            closeTodoPanel();
                          } else if (agendaPanelOpen) {
                            closeAgendaPanel();
                          } else {
                            closeToolsPanel();
                          }
                          return;
                        }
                      }

                      if (event.key === "Enter" && !event.shiftKey) {
                        if (slashPanelOpen || slashCommandMenuOpen) {
                          event.preventDefault();
                          return;
                        }

                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={
                      uploadingMedia
                        ? "Media uploaden..."
                        : programPanelOpen
                          ? "Programma geopend..."
                          : bwPanelOpen
                            ? "BW geopend..."
                            : externalsPanelOpen
                              ? "Externals geopend..."
                              : volumePanelOpen
                                ? "Volume geopend..."
                                : intensityPanelOpen
                                  ? "Intensiteit geopend..."
                                  : maxPanelOpen
                                  ? "Max geopend..."
                                  : dataPanelOpen
                            ? "Data geopend..."
                            : injuriesPanelOpen
                              ? "Blessures geopend..."
                              : todoPanelOpen
                                ? "Todo geopend..."
                                : agendaPanelOpen
                                  ? "Agenda geopend..."
                              : toolsPanelOpen
                                ? "Zoek in tools..."
                                : "Typ een bericht"
                    }
                    disabled={!canSendMessages || uploadingMedia}
                    className="max-h-32 min-h-[24px] w-full resize-none bg-transparent py-2 text-[15px] text-black outline-none placeholder:text-gray-400 disabled:opacity-60"
                  />
                  </div>

                  {message.trim() && !slashPanelOpen && !slashCommandMenuOpen ? (
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={uploadingMedia}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                      aria-label="Verstuur bericht"
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </button>
                  ) : !slashPanelOpen && !slashCommandMenuOpen ? (
                    <ChatVoiceRecorder
                      disabled={!canSendMessages || uploadingMedia}
                      onSend={(blob, mimeType) => {
                        void sendVoiceMessage(blob, mimeType);
                      }}
                    />
                  ) : (
                    <div className="mb-0.5 h-10 w-10 shrink-0" aria-hidden />
                  )}
                </div>
              </footer>
                </>
              )}
                </div>

                {toolsPanelOpen && !sidePanelOpen && (
                  <>
                    <button
                      type="button"
                      className="fixed inset-0 z-[55] bg-black/20 md:hidden"
                      onClick={closeToolsPanel}
                      aria-label="Tools sluiten"
                    />
                    <div className="fixed inset-y-0 right-0 z-[60] flex max-w-[85vw] md:static md:max-w-none md:z-auto">
                      <ChatToolsPanel
                        query={toolsCommand.query}
                        onQueryChange={handleToolsQueryChange}
                        onClose={closeToolsPanel}
                        onSelect={handleToolsSelect}
                        userRole={userRole}
                        contacts={contacts}
                        groups={groups}
                        programs={toolPrograms}
                        loadingPrograms={toolProgramsLoading}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {createGroupOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Nieuwe groep</h2>
              <button
                type="button"
                onClick={() => setCreateGroupOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Groepsnaam"
              className="mb-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-black outline-none focus:ring-2 focus:ring-black"
            />

            <div className="mb-4 max-h-56 overflow-y-auto rounded-2xl border border-gray-200">
              {contacts.map((contact) => {
                const checked = selectedGroupMemberIds.includes(contact.id);

                return (
                  <label
                    key={contact.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelectedGroupMemberIds((current) =>
                          checked
                            ? current.filter((id) => id !== contact.id)
                            : [...current, contact.id],
                        )
                      }
                    />
                    <span className="font-semibold text-black">
                      {contact.full_name}
                    </span>
                  </label>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleCreateGroup}
              disabled={creatingGroup}
              className="w-full rounded-2xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {creatingGroup ? "Groep maken..." : "Groep aanmaken"}
            </button>
          </div>
        </div>
      )}

      {pollCreateOpen && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-4 md:items-center">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-black">Poll maken</h2>
              <button
                type="button"
                onClick={() => setPollCreateOpen(false)}
                className="rounded-full p-2 hover:bg-gray-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={pollQuestion}
              onChange={(event) => setPollQuestion(event.target.value)}
              placeholder="Stel je vraag..."
              className="mb-4 w-full rounded-2xl border border-gray-200 px-4 py-3 text-black outline-none focus:ring-2 focus:ring-black"
            />

            <div className="mb-4 space-y-2">
              {pollOptions.map((option, index) => (
                <div key={`poll-option-${index}`} className="flex gap-2">
                  <input
                    value={option}
                    onChange={(event) =>
                      setPollOptions((current) =>
                        current.map((value, optionIndex) =>
                          optionIndex === index
                            ? event.target.value
                            : value,
                        ),
                      )
                    }
                    placeholder={`Optie ${index + 1}`}
                    className="w-full rounded-2xl border border-gray-200 px-4 py-3 text-black outline-none focus:ring-2 focus:ring-black"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollOptions((current) =>
                          current.filter((_, optionIndex) => optionIndex !== index),
                        )
                      }
                      className="rounded-2xl border border-gray-200 px-3 text-sm font-semibold"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            {pollOptions.length < 6 && (
              <button
                type="button"
                onClick={() =>
                  setPollOptions((current) =>
                    current.length < 6 ? [...current, ""] : current,
                  )
                }
                className="mb-4 text-sm font-semibold text-black underline"
              >
                Optie toevoegen
              </button>
            )}

            <button
              type="button"
              onClick={() => void sendPoll()}
              disabled={creatingPoll}
              className="w-full rounded-2xl bg-black px-4 py-3 font-semibold text-white disabled:opacity-50"
            >
              {creatingPoll ? "Poll plaatsen..." : "Poll plaatsen"}
            </button>
          </div>
        </div>
      )}

      <ChatMediaCapture
        open={mediaCaptureOpen}
        onClose={() => setMediaCaptureOpen(false)}
        onCapture={(file, caption) => {
          void sendMediaFile(file, caption);
        }}
      />

      <ChatMediaComposer
        open={Boolean(pendingMediaFile)}
        file={pendingMediaFile}
        uploading={uploadingMedia}
        onClose={() => setPendingMediaFile(null)}
        onSend={(file, caption) => {
          void sendMediaFile(file, caption);
        }}
      />

      <ChatListMenuSheet
        open={Boolean(listMenuEntry)}
        onClose={() => setListMenuEntry(null)}
        pinned={Boolean(getEntrySettings(listMenuEntry)?.pinned)}
        muted={Boolean(getEntrySettings(listMenuEntry)?.muted)}
        onPin={() => {
          if (listMenuEntry) void handleEntryPin(listMenuEntry);
        }}
        onMute={() => {
          if (listMenuEntry) void handleEntryMute(listMenuEntry);
        }}
        onMarkUnread={() => {
          if (listMenuEntry) void handleEntryMarkUnread(listMenuEntry);
        }}
        onClear={() => {
          if (listMenuEntry) void handleEntryClear(listMenuEntry);
        }}
        onDelete={() => {
          if (listMenuEntry) void handleEntryDelete(listMenuEntry);
        }}
      />

      <ChatMessageMenu
        open={Boolean(messageMenu)}
        onClose={() => setMessageMenu(null)}
        anchorRect={messageMenu?.anchorRect || null}
        isMine={messageMenu?.message.sender_id === userId}
        canDelete={messageMenu ? canDeleteMessage(messageMenu.message) : false}
        isPinned={
          messageMenu?.message.id ===
          currentConversationSettings?.pinned_message_id
        }
        onReply={() => {
          if (messageMenu) handleReply(messageMenu.message);
        }}
        onPin={() => {
          if (messageMenu) void handlePinMessage(messageMenu.message);
        }}
        onDelete={() => {
          if (messageMenu) void handleDeleteMessage(messageMenu.message);
        }}
        onReact={(emoji) => {
          if (messageMenu) void handleMessageReaction(messageMenu.message.id, emoji);
        }}
      />

      {activePollDetails && (
        <PollDetailsPanel
          open
          onClose={() => setActivePollDetails(null)}
          messageId={activePollDetails.messageId}
          payload={activePollDetails.payload}
          userId={userId}
          votes={pollVotes}
          memberProfiles={groupMemberProfiles}
          memberCount={Object.keys(groupMemberNames).length}
        />
      )}

      {broadcastOpen && userId ? (
        <ChatBroadcastModal
          coachId={userId}
          onClose={() => setBroadcastOpen(false)}
        />
      ) : null}
    </AppShell>
  );
}
