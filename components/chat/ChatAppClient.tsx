"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, startTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabaseClient";
import {
  hydrateChatOverviewUnreadCounts,
  loadChatOverview,
  type ChatOverviewData,
} from "@/lib/chatOverviewLoader";
import { useChatOverview } from "@/hooks/useChatOverview";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import { useChatKeyboardViewport } from "@/hooks/useChatKeyboardViewport";
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
  getMessageBubbleRadiusClass,
  getMessagePreview,
  getReplyText,
  parseExerciseVideoMessage,
  shouldGroupWithPrevious,
  shouldShowDateDivider,
  shouldShowMessageTimestamp,
} from "@/lib/chatUtils";
import ChatSwipeReplyRow from "@/components/chat/ChatSwipeReplyRow";
import ExerciseVideoMessage from "@/components/chat/ExerciseVideoMessage";
import ChatVideoCoachFeedbackViewer from "@/components/chat/ChatVideoCoachFeedbackViewer";
import PollMessage from "@/components/chat/PollMessage";
import ChatMediaCapture from "@/components/chat/ChatMediaCapture";
import ChatMediaComposer from "@/components/chat/ChatMediaComposer";
import GroupInfoPanel from "@/components/chat/GroupInfoPanel";
import ChatAvatar from "@/components/chat/ChatAvatar";
import ChatConversationMenu from "@/components/chat/ChatConversationMenu";
import ChatReportSheet, {
  type ChatReportTarget,
} from "@/components/chat/ChatReportSheet";
import ChatVoiceMessage from "@/components/chat/ChatVoiceMessage";
import ChatVoiceRecorder from "@/components/chat/ChatVoiceRecorder";
import { loadAthleteProgramPosition } from "@/lib/athleteProgramContext";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  loadDirectMessagePreviews,
  loadGroupMessagePreviews,
} from "@/lib/chatConversationPreviews";
import { saveChatReturnRoute, saveChatEntryReturn, getChatEntryReturn } from "@/lib/chatNavigation";
import {
  searchMessagesGlobally,
  getSearchableMessageText,
  messageMatchesQuery,
  type GlobalMessageSearchResult,
} from "@/lib/chatSearch";
import ChatSearchField from "@/components/chat/ChatSearchField";
import ChatMessageSearchPanel from "@/components/chat/ChatMessageSearchPanel";
import ChatListMenuSheet from "@/components/chat/ChatListMenuSheet";
import ChatMessageMenu, {
  ChatMessageMenuTrigger,
} from "@/components/chat/ChatMessageMenu";
import HighlightedText from "@/components/chat/HighlightedText";
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
import ChatCoachAgendaOverviewPanel from "@/components/chat/ChatCoachAgendaOverviewPanel";
import ChatAiMessage from "@/components/chat/ChatAiMessage";
import ChatBroadcastModal from "@/components/chat/ChatBroadcastModal";
import ChatMessageReactions from "@/components/chat/ChatMessageReactions";
import {
  loadMessageReactions,
  toggleMessageReaction,
  type MessageReaction,
} from "@/lib/chatReactions";
import { blockUser, isUserBlocked, loadBlockedUserIds } from "@/lib/chatBlocks";
import { showAppToast } from "@/lib/appToast";
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
  parseVolumeCommand,
  shouldShowSlashCommandMenu,
} from "@/lib/chatCommands";
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
import {
  getActiveChatRoute,
  type ChatListEntry,
} from "@/components/chat/chatAppRoute";

export default function ChatAppClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const {
    userId: authUserId,
    role: authRole,
    profile: authProfile,
    loading: authLoading,
  } = useAuth();
  const overviewQuery = useChatOverview(
    authUserId,
    authRole,
    !authLoading && Boolean(authUserId && authRole),
  );
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
  const inConversation = Boolean(activeUserId || activeGroupId);

  const [bootstrapping, setBootstrapping] = useState(
    () => !overviewQuery.data,
  );
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
  const [searchHighlightQuery, setSearchHighlightQuery] = useState("");
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "unread">("all");
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
  const [blockedUserIds, setBlockedUserIds] = useState<Set<string>>(new Set());
  const [reportTarget, setReportTarget] = useState<ChatReportTarget | null>(null);
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
  const [coachVideoReview, setCoachVideoReview] = useState<{
    url: string;
    title: string;
    subtitle?: string;
    replyMessage?: ChatMessage | null;
  } | null>(null);
  const conversationPanelRef = useRef<HTMLDivElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const listLongPressTriggeredRef = useRef(false);
  const messageLongPressTimerRef = useRef<number | null>(null);
  const messageLongPressTriggeredRef = useRef(false);
  const messageTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastMessageTapRef = useRef<{ time: number; msgId: string } | null>(null);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    function syncViewportMode() {
      setIsMobileViewport(media.matches);
    }
    syncViewportMode();
    media.addEventListener("change", syncViewportMode);
    return () => media.removeEventListener("change", syncViewportMode);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!authUserId || !authRole) {
      window.location.href = "/login";
      return;
    }

    let cancelled = false;

    async function syncOverview() {
      const overview =
        overviewQuery.data ??
        (await queryClient.fetchQuery({
          queryKey: queryKeys.chatOverview(authUserId, authRole),
          queryFn: () =>
            loadChatOverview(authUserId, authRole, { skipUnreadCounts: true }),
          ...athleteQueryDefaults,
        }));

      if (cancelled || !overview) {
        if (!cancelled) setBootstrapping(false);
        return;
      }

      setUserId(authUserId);
      setUserRole(authRole);
      setUserName(authProfile?.full_name || "");
      setConversationSettings(overview.settingsMap);
      setContacts(overview.contacts);
      setGroups(overview.groups);
      setBootstrapping(false);

      void loadBlockedUserIds(authUserId).then((blockedIds) => {
        if (cancelled) return;
        const blockedSet = new Set(blockedIds);
        setBlockedUserIds(blockedSet);
        setContacts(
          overview.contacts.filter((contact) => !blockedSet.has(contact.id)),
        );
      });

      void hydrateChatOverviewUnreadCounts(authUserId, overview).then(
        (withUnread) => {
          if (cancelled) return;
          queryClient.setQueryData(
            queryKeys.chatOverview(authUserId, authRole),
            withUnread,
          );
          setContacts((current) =>
            current.map((contact) => {
              const updated = withUnread.contacts.find((c) => c.id === contact.id);
              return updated ?? contact;
            }),
          );
          setGroups(withUnread.groups);
        },
      );
    }

    if (overviewQuery.isPending && !overviewQuery.data) {
      setBootstrapping(true);
    } else if (overviewQuery.data) {
      setBootstrapping(false);
    }

    void syncOverview();

    return () => {
      cancelled = true;
    };
  }, [
    authLoading,
    authUserId,
    authRole,
    authProfile?.full_name,
    overviewQuery.data,
    overviewQuery.isPending,
    queryClient,
  ]);

  useEffect(() => {
    const from = searchParams.get("from");
    if (from && from.startsWith("/")) {
      saveChatEntryReturn(from);
    }
  }, [searchParams]);

  useEffect(() => {
    const athleteId = searchParams.get("athlete");
    if (!athleteId || bootstrapping) return;
    if (pathname === `/chat/${athleteId}`) return;

    router.replace(`/chat/${athleteId}`);
  }, [bootstrapping, pathname, router, searchParams]);

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
    if (!userId || bootstrapping) return;

    async function syncActiveConversationReadState() {
      if (activeUserId) {
        await markConversationAsRead(userId, activeUserId);
        setContacts((current) =>
          current.map((contact) =>
            contact.id === activeUserId
              ? { ...contact, unreadCount: 0 }
              : contact,
          ),
        );
        return;
      }

      if (activeGroupId) {
        await markGroupAsRead(userId, activeGroupId);
        setGroups((current) =>
          current.map((group) =>
            group.id === activeGroupId ? { ...group, unreadCount: 0 } : group,
          ),
        );
      }
    }

    void syncActiveConversationReadState();
  }, [activeUserId, activeGroupId, userId, bootstrapping]);

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
      deferEffectUpdate(() => setTypingIndicator(null));
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
      deferEffectUpdate(() => setPeerLastReadAt(null));
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
      deferEffectUpdate(() => setAthleteProgramLabel(""));
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

  useChatKeyboardViewport({
    enabled: isMobileViewport && inConversation,
    panelRef: conversationPanelRef,
    messagesRef: messagesContainerRef,
    stickToBottomRef: shouldStickToBottomRef,
  });

  useEffect(() => {
    if (bootstrapping) return;
    if (!activeUserId && !activeGroupId) return;
    if (mediaCaptureOpen || broadcastOpen || pollCreateOpen || createGroupOpen) {
      return;
    }

    const timer = window.setTimeout(() => {
      focusMessageInput();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [
    activeUserId,
    activeGroupId,
    bootstrapping,
    mediaCaptureOpen,
    broadcastOpen,
    pollCreateOpen,
    createGroupOpen,
  ]);

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
    if (!authUserId || !authRole) return;

    const bootstrapUserId = authUserId;
    const bootstrapRole = authRole;

    setBootstrapping(true);
    setUserId(bootstrapUserId);
    setUserRole(bootstrapRole);
    setUserName(authProfile?.full_name || "");

    const cacheKey = queryKeys.chatOverview(bootstrapUserId, bootstrapRole);
    const overview =
      queryClient.getQueryData<ChatOverviewData>(cacheKey) ??
      (await queryClient.fetchQuery({
        queryKey: cacheKey,
        queryFn: () =>
          loadChatOverview(bootstrapUserId, bootstrapRole, {
            skipUnreadCounts: true,
          }),
        ...athleteQueryDefaults,
      }));

    if (!overview) {
      setBootstrapping(false);
      return;
    }

    const blockedIds = await loadBlockedUserIds(authUserId);
    const blockedSet = new Set(blockedIds);

    setBlockedUserIds(blockedSet);
    setConversationSettings(overview.settingsMap);
    setContacts(overview.contacts.filter((contact) => !blockedSet.has(contact.id)));
    setGroups(overview.groups);
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
    blockedIds: string[] = [],
  ) {
    const blockedSet = new Set(blockedIds);
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
      (profiles || [])
        .filter((contact) => !blockedSet.has(contact.id))
        .map(async (contact) => {
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

  function focusMessageInput() {
    const focusInput = () => {
      const input = inputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      const length = input.value.length;
      input.setSelectionRange(length, length);
      forceScrollToBottom();
    };

    focusInput();
    window.requestAnimationFrame(() => {
      focusInput();
      window.requestAnimationFrame(focusInput);
    });
    window.setTimeout(focusInput, 120);
    window.setTimeout(focusInput, 280);
  }

  function handleReply(msg: ChatMessage) {
    setReplyingTo(msg);
    focusMessageInput();
  }

  useEffect(() => {
    if (!replyingTo) return;
    focusMessageInput();
  }, [replyingTo]);

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

  async function sendMessage() {
    if (!message.trim() || !userId) return;
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
    if (activeUserId && isUserBlocked(blockedUserIds, activeUserId)) {
      alert("Je hebt deze gebruiker geblokkeerd.");
      return;
    }
    if (!canSendMessages) {
      alert("Alleen beheerders kunnen berichten sturen in deze groep.");
      return;
    }

    const messageText = message.trim();
    const replyTarget = replyingTo;
    const optimisticId = crypto.randomUUID();
    const optimisticMessage: ChatMessage = {
      id: optimisticId,
      sender_id: userId,
      receiver_id: activeUserId || null,
      group_id: activeGroupId || null,
      body: messageText,
      file_url: null,
      file_type: null,
      created_at: new Date().toISOString(),
      read_at: null,
      reply_to_body: replyTarget ? getReplyText(replyTarget) : null,
      reply_to_file_type: replyTarget?.file_type || null,
      reply_to_sender_id: replyTarget?.sender_id || null,
    };

    setMessages((current) => [...current, optimisticMessage]);
    setMessage("");
    setReplyingTo(null);
    inputRef.current?.blur();
    window.requestAnimationFrame(() => {
      forceScrollToBottom();
      window.requestAnimationFrame(forceScrollToBottom);
    });

    let error: { message: string } | null = null;
    let insertedId: string | null = null;

    if (activeGroupId) {
      const result = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          group_id: activeGroupId,
          body: messageText,
          read_at: null,
          reply_to_body: replyTarget ? getReplyText(replyTarget) : null,
          reply_to_file_type: replyTarget?.file_type || null,
          reply_to_sender_id: replyTarget?.sender_id || null,
        })
        .select("id")
        .single();
      error = result.error;
      insertedId = (result.data as { id: string } | null)?.id ?? null;
    } else {
      const result = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          receiver_id: activeUserId,
          body: messageText,
          read_at: null,
          reply_to_body: replyTarget ? getReplyText(replyTarget) : null,
          reply_to_file_type: replyTarget?.file_type || null,
          reply_to_sender_id: replyTarget?.sender_id || null,
        })
        .select("id")
        .single();
      error = result.error;
      insertedId = (result.data as { id: string } | null)?.id ?? null;
    }

    if (error) {
      setMessages((current) =>
        current.filter((item) => item.id !== optimisticId),
      );
      setMessage(messageText);
      alert(error.message);
      return;
    }

    if (insertedId) {
      setMessages((current) =>
        current.map((item) =>
          item.id === optimisticId ? { ...item, id: insertedId! } : item,
        ),
      );
    }

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

  async function sendMediaFile(
    file: File,
    caption = "",
    replyOverride?: ChatMessage | null,
  ) {
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

    const reply = replyOverride ?? replyingTo;

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
        replyTo: reply,
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
        reply_to_body: reply ? getReplyText(reply) : null,
        reply_to_file_type: reply?.file_type || null,
        reply_to_sender_id: reply?.sender_id || null,
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

  async function sendCoachVideoFeedback(
    text: string,
    imageFile?: File,
    replyMessage?: ChatMessage | null,
  ) {
    if (!userId || (!activeUserId && !activeGroupId)) return;
    if (!canSendMessages) {
      alert("Alleen beheerders kunnen berichten sturen in deze groep.");
      return;
    }

    const reply = replyMessage || replyingTo;

    if (imageFile) {
      await sendMediaFile(imageFile, text, reply);
      return;
    }

    const messageText = text.trim();
    if (!messageText) return;

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
      reply_to_body: reply ? getReplyText(reply) : null,
      reply_to_file_type: reply?.file_type || null,
      reply_to_sender_id: reply?.sender_id || null,
    };

    let error: { message: string } | null = null;

    if (activeGroupId) {
      const result = await supabase.from("messages").insert({
        sender_id: userId,
        group_id: activeGroupId,
        body: messageText,
        read_at: null,
        reply_to_body: reply ? getReplyText(reply) : null,
        reply_to_file_type: reply?.file_type || null,
        reply_to_sender_id: reply?.sender_id || null,
      });
      error = result.error;
    } else {
      const result = await supabase.from("messages").insert({
        sender_id: userId,
        receiver_id: activeUserId,
        body: messageText,
        read_at: null,
        reply_to_body: reply ? getReplyText(reply) : null,
        reply_to_file_type: reply?.file_type || null,
        reply_to_sender_id: reply?.sender_id || null,
      });
      error = result.error;
    }

    if (error) {
      alert(error.message);
      return;
    }

    setMessages((current) => [...current, optimisticMessage]);
    updateSidebarAfterMessage(
      getMessagePreview(optimisticMessage, userId),
      optimisticMessage.created_at,
    );
    setReplyingTo(null);
    forceScrollToBottom();
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

  async function refreshBlockedUsers() {
    if (!userId) return [] as string[];

    const ids = await loadBlockedUserIds(userId);
    setBlockedUserIds(new Set(ids));
    return ids;
  }

  function openReportTarget(target: ChatReportTarget) {
    setReportTarget(target);
  }

  function handleReportMessage(msg: ChatMessage) {
    setMessageMenu(null);
    openReportTarget({
      title: `Bericht van ${resolveReactionUserName(msg.sender_id)}`,
      reportedUserId: msg.sender_id,
      messageId: msg.id,
      groupId: activeGroupId || null,
    });
  }

  function handleReportConversation() {
    if (activeUserId) {
      openReportTarget({
        title: activeContact?.full_name || "Gebruiker",
        reportedUserId: activeUserId,
      });
      return;
    }

    if (activeGroupId) {
      openReportTarget({
        title: activeGroup?.name || "Groepschat",
        groupId: activeGroupId,
      });
    }
  }

  function handleReportGroupMember(memberUserId: string, memberName: string) {
    openReportTarget({
      title: memberName,
      reportedUserId: memberUserId,
      groupId: activeGroupId || null,
    });
  }

  async function handleBlockUser(peerUserId: string, displayName: string) {
    if (!userId) return;

    if (
      !confirm(
        `${displayName} blokkeren? Je ontvangt geen directe berichten meer van deze gebruiker.`,
      )
    ) {
      return;
    }

    const { error } = await blockUser(peerUserId);
    if (error) {
      alert(error.message);
      return;
    }

    await hideConversation(userId, { peerUserId });
    const ids = await refreshBlockedUsers();
    const loadedContacts = await loadContacts(
      userId,
      userRole,
      conversationSettings,
      ids,
    );
    setContacts(loadedContacts);
    await refreshConversationSettings();

    if (activeUserId === peerUserId) {
      closeConversation();
    }

    showAppToast(`${displayName} is geblokkeerd.`);
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

    const isActive =
      (entry.kind === "direct" && entry.id === activeUserId) ||
      (entry.kind === "group" && entry.id === activeGroupId);

    if (isActive) return;

    await markConversationUnread(userId, getEntryConversationTarget(entry));

    if (entry.kind === "direct") {
      setContacts((current) =>
        current.map((contact) =>
          contact.id === entry.id
            ? { ...contact, unreadCount: Math.max(contact.unreadCount || 0, 1) }
            : contact,
        ),
      );
    } else {
      setGroups((current) =>
        current.map((group) =>
          group.id === entry.id
            ? { ...group, unreadCount: Math.max(group.unreadCount || 0, 1) }
            : group,
        ),
      );
    }
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
      loadContacts(userId, userRole, conversationSettings, [...blockedUserIds]),
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

  function openMessageMenuFromElement(msg: ChatMessage, element: HTMLElement) {
    setMessageMenu({ message: msg, anchorRect: element.getBoundingClientRect() });
  }

  function openMessageMenu(
    msg: ChatMessage,
    event: React.MouseEvent<HTMLElement>,
  ) {
    event.stopPropagation();
    openMessageMenuFromElement(msg, event.currentTarget as HTMLElement);
  }

  function cancelMessageLongPress() {
    if (messageLongPressTimerRef.current) {
      window.clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
  }

  function startMessageLongPress(
    msg: ChatMessage,
    event: React.TouchEvent<HTMLElement>,
  ) {
    if (typeof window !== "undefined" && window.innerWidth >= 768) return;

    const touch = event.touches[0];
    if (!touch) return;

    messageTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    messageLongPressTriggeredRef.current = false;
    cancelMessageLongPress();

    const element = event.currentTarget;
    messageLongPressTimerRef.current = window.setTimeout(() => {
      messageLongPressTriggeredRef.current = true;
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate(10);
      }
      openMessageMenuFromElement(msg, element);
    }, 450);
  }

  function handleMessageTouchMove(event: React.TouchEvent<HTMLElement>) {
    if (!messageTouchStartRef.current) return;

    const touch = event.touches[0];
    if (!touch) return;

    const dx = Math.abs(touch.clientX - messageTouchStartRef.current.x);
    const dy = Math.abs(touch.clientY - messageTouchStartRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelMessageLongPress();
    }
  }

  function handleMessageTouchEnd(
    msg: ChatMessage,
    event: React.TouchEvent<HTMLElement>,
  ) {
    cancelMessageLongPress();

    if (messageLongPressTriggeredRef.current) {
      messageLongPressTriggeredRef.current = false;
      event.preventDefault();
      return;
    }

    const now = Date.now();
    const last = lastMessageTapRef.current;
    if (last && last.msgId === msg.id && now - last.time < 320) {
      event.preventDefault();
      handleReply(msg);
      lastMessageTapRef.current = null;
      return;
    }

    lastMessageTapRef.current = { time: now, msgId: msg.id };
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
      if (userId) {
        void markConversationAsRead(userId, entry.id).then(() => {
          setContacts((current) =>
            current.map((contact) =>
              contact.id === entry.id ? { ...contact, unreadCount: 0 } : contact,
            ),
          );
        });
      }
      return;
    }

    openGroupChat(entry.id);
    if (userId) {
      void markGroupAsRead(userId, entry.id).then(() => {
        setGroups((current) =>
          current.map((group) =>
            group.id === entry.id ? { ...group, unreadCount: 0 } : group,
          ),
        );
      });
    }
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
        className={`group chat-list-row flex w-full items-stretch border-b px-2 py-1.5 transition ${
          isActive ? "chat-list-row-active" : ""
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
              entry.kind === "group" ? "chat-avatar-fallback-group" : "chat-avatar-fallback"
            }
          >
            {entry.kind === "group" ? <Users className="h-5 w-5" /> : undefined}
          </ChatAvatar>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                {isPinned && (
                  <Pin className="h-3.5 w-3.5 shrink-0 text-app-muted" aria-hidden />
                )}
                {isMuted && (
                  <BellOff
                    className="h-3.5 w-3.5 shrink-0 text-app-muted"
                    aria-hidden
                  />
                )}
                <p
                  className={`truncate text-[15px] ${
                    hasUnread
                      ? "font-bold text-app-text"
                      : "font-semibold text-app-text"
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
                    hasUnread ? "font-semibold text-app-text" : "text-app-subtle"
                  }`}
                >
                  {formatChatListTime(entry.lastMessageTime)}
                </span>
            </div>

            <div className="mt-1 flex items-center justify-between gap-3">
              <p
                className={`truncate text-sm ${
                  hasUnread ? "font-semibold text-app-text" : "text-app-muted"
                }`}
              >
                {entry.lastMessageSender
                  ? `${entry.lastMessageSender}: ${entry.lastMessage}`
                  : entry.lastMessage}
              </p>

              {hasUnread && (
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full bg-app-accent"
                  aria-label="Ongelezen"
                />
              )}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openListMenu(entry);
          }}
          className="flex w-0 items-center justify-center self-center overflow-hidden text-app-subtle opacity-0 transition-all duration-200 hover:text-app-text group-hover:w-8 group-hover:opacity-100 max-md:hidden"
          aria-label="Chatopties"
        >
          <MoreVertical className="h-4 w-4 shrink-0" />
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
      deferEffectUpdate(() => {
        setGlobalSearchResults([]);
        setGlobalSearchLoading(false);
      });
      return;
    }

    deferEffectUpdate(() => setGlobalSearchLoading(true));
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
    let entries = chatEntries;

    if (listFilter === "unread") {
      entries = entries.filter((entry) => {
        const key =
          entry.kind === "direct"
            ? getSettingsKey({ peerUserId: entry.id })
            : getSettingsKey({ groupId: entry.id });
        const isMuted = Boolean(conversationSettings[key]?.muted);
        return !isMuted && (entry.unreadCount || 0) > 0;
      });
    }

    const query = searchQuery.trim().toLowerCase();
    if (!query) return entries;

    return entries.filter((entry) => {
      const label =
        entry.kind === "direct" ? entry.full_name || "" : entry.name || "";

      return (
        label.toLowerCase().includes(query) ||
        (entry.lastMessage || "").toLowerCase().includes(query) ||
        (entry.lastMessageSender || "").toLowerCase().includes(query)
      );
    });
  }, [chatEntries, searchQuery, listFilter, conversationSettings]);

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
  const programPanelOpen =
    programCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const bwPanelOpen =
    bwCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const externalsPanelOpen =
    externalsCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const volumePanelOpen =
    volumeCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const intensityPanelOpen =
    intensityCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const maxPanelOpen =
    maxCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const dataPanelOpen =
    dataCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const injuriesPanelOpen =
    injuriesCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId) &&
    !activeGroupId;
  const aiPanelOpen =
    aiCommand.active && Boolean(activeUserId) && !activeGroupId;
  const todoPanelOpen =
    todoCommand.active &&
    isCoachLikeRole(userRole) &&
    Boolean(activeUserId || activeGroupId);
  const agendaPanelOpen =
    agendaCommand.active && isCoachLikeRole(userRole);
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
  const slashPanelOpen = sidePanelOpen;
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
    deferEffectUpdate(() => setSlashCommandActiveIndex(0));
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
      deferEffectUpdate(() => setPollVotes([]));
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

              let next = current;
              if (incoming.sender_id === userId && incoming.body) {
                const withoutOptimisticDupes = current.filter(
                  (item) =>
                    !(
                      item.sender_id === userId &&
                      item.body === incoming.body &&
                      item.id !== incoming.id &&
                      !item.file_url
                    ),
                );
                if (withoutOptimisticDupes.length !== current.length) {
                  next = withoutOptimisticDupes;
                }
              }

              return filterMessagesByClearedAt(
                [...next, incoming],
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

  return (
    <AppShell
      className={`chat-shell overflow-hidden lg:relative lg:min-h-screen ${
        showConversationOnMobile
          ? "chat-shell--conversation fixed inset-0 z-40 h-[100dvh] max-h-[100dvh]"
          : "chat-shell--inbox relative z-0 min-h-0 flex-1 lg:inset-auto"
      }`}
      contentClassName="flex h-full min-h-0 flex-1 overflow-hidden p-0 pb-0"
    >
      <div
        className={`flex h-full min-h-0 w-full overflow-hidden ${
          sidePanelOpen ? "flex-row" : ""
        }`}
      >
        <aside
          className={`chat-list-panel flex h-full min-h-0 w-full flex-col overflow-x-hidden border-r md:w-[420px] md:max-w-[40%] ${
            sidePanelOpen
              ? "hidden"
              : showConversationOnMobile
                ? "hidden md:flex"
                : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-app-border bg-app-surface px-3 pb-2.5 pt-[max(0.5rem,env(safe-area-inset-top))] md:px-4 md:pt-4">
            <div className="mb-3 flex items-center justify-between gap-2 md:mb-4 md:gap-3">
              <div className="flex min-w-0 items-center gap-1.5 md:gap-2">
                <button
                  type="button"
                  onClick={() => router.push(getChatEntryReturn())}
                  className="page-back-btn page-back-btn--topbar app-focus-ring hidden lg:inline-flex"
                  aria-label="Terug naar vorige pagina"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Terug</span>
                </button>
                <h1 className="text-lg font-semibold tracking-tight text-app-text md:text-xl">
                  Chats
                </h1>
              </div>
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
                      className="ui-icon-btn app-focus-ring"
                      aria-label="Nieuwe groep"
                    >
                      <Users className="h-5 w-5" />
                    </button>
                  </>
                )}
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-app-accent text-sm font-semibold text-white">
                  {getInitials(userName)}
                </div>
              </div>
            </div>

            <ChatSearchField
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Zoek op naam of bericht"
            />

            {searchQuery.trim().length < 2 ? (
              <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-0.5 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setListFilter("all")}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    listFilter === "all"
                      ? "bg-app-accent text-white"
                      : "bg-app-surface-muted text-app-muted hover:bg-app-surface-hover"
                  }`}
                >
                  Alle
                </button>
                <button
                  type="button"
                  onClick={() => setListFilter("unread")}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                    listFilter === "unread"
                      ? "bg-app-accent text-white"
                      : "bg-app-surface-muted text-app-muted hover:bg-app-surface-hover"
                  }`}
                >
                  Ongelezen
                </button>
              </div>
            ) : null}
          </div>

          <div className="chat-list-scroll">
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
                <p className="px-4 py-4 text-sm text-app-muted">Geen chats gevonden.</p>
              )}

            {searchQuery.trim().length >= 2 && (
              <>
                {globalSearchLoading && (
                  <p className="px-4 py-4 text-sm text-app-muted">Berichten zoeken...</p>
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
                      className="flex w-full flex-col gap-1 border-b border-app-border px-4 py-3 text-left hover:bg-app-surface-muted"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-app-text">
                          {result.chatTitle}
                        </p>
                        <span className="shrink-0 text-xs text-app-subtle">
                          {formatChatListTime(result.message.created_at)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-app-muted">
                        <HighlightedText
                          text={getSearchableMessageText(result.message)}
                          query={searchQuery}
                        />
                      </p>
                    </button>
                  ))}

                {!globalSearchLoading && globalSearchResults.length === 0 && (
                  <p className="px-4 py-4 text-sm text-app-muted">
                    Geen berichten gevonden.
                  </p>
                )}
              </>
            )}

            {searchQuery.trim().length < 2 && !bootstrapping && filteredEntries.length === 0 && (
              <p className="px-4 py-6 text-sm text-app-muted">
                {listFilter === "unread"
                  ? "Geen ongelezen chats."
                  : "Geen chats gevonden."}
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

        {agendaPanelOpen && userId ? (
          <ChatCoachAgendaOverviewPanel coachId={userId} onClose={closeAgendaPanel} />
        ) : null}

        <section
          ref={conversationPanelRef}
          className={`chat-side-panel flex h-full min-h-0 flex-col overflow-hidden overscroll-x-none ${
            sidePanelOpen
              ? "min-w-0 flex-1"
              : `flex-1 md:relative ${
                  showConversationOnMobile
                    ? "chat-side-panel--viewport-sync touch-pan-y md:static md:inset-auto md:z-auto"
                    : "hidden md:flex"
                }`
          }`}
        >
          {!activeUserId && !activeGroupId ? (
            <EmptyState
              icon="chat"
              title="Limitless Chat"
              description={
                userRole === "atleet"
                  ? "Tik op je coach om te starten. Swipe of gebruik /programma, /bw en /ai in een chat."
                  : "Selecteer een atleet of groep om te beginnen. Gebruik slash-commando's voor snelle coaching-tools."
              }
            />
          ) : showGroupInfo && activeGroupId ? (
            <GroupInfoPanel
              groupId={activeGroupId}
              userId={userId}
              contacts={contacts}
              onBack={closeGroupInfo}
              onReportMember={handleReportGroupMember}
              onBlockMember={(memberUserId, memberName) =>
                void handleBlockUser(memberUserId, memberName)
              }
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
            <div className="chat-conversation-panel flex min-h-0 flex-1 flex-col overflow-hidden">
              <header className="chat-conversation-header mobile-safe-top flex shrink-0 items-center gap-1.5 border-b px-3 pb-1.5 md:gap-3 md:px-4 md:py-2">
                <button
                  type="button"
                  onClick={closeConversation}
                  className="ui-icon-btn md:hidden app-focus-ring"
                  aria-label="Terug naar chats"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>

                {activeGroupId ? (
                  <button
                    type="button"
                    onClick={() => openGroupInfo(activeGroupId)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChatAvatar
                      name={activeGroup?.name}
                      imageUrl={activeGroup?.avatar_url}
                      className="h-8 w-8"
                      fallbackClassName="bg-app-surface-elevated text-white"
                    >
                      <Users className="h-4 w-4" />
                    </ChatAvatar>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-bold text-app-text md:text-base">
                        {conversationTitle}
                      </h2>
                      <p className="truncate text-xs text-app-muted">
                        {groupMembersSubtitle || `${Object.keys(groupMemberNames).length} deelnemers`}
                      </p>
                    </div>
                  </button>
                ) : (
                  <Link
                    href={profileLink}
                    onClick={() => saveChatReturnRoute(`/chat/${activeUserId}`)}
                    className="flex min-w-0 flex-1 items-center gap-2"
                  >
                    <ChatAvatar
                      name={activeContact?.full_name}
                      imageUrl={activeContact?.avatar_url}
                      className="h-8 w-8"
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-app-text md:text-base">
                        {conversationTitle}
                      </h2>
                      <p className="text-xs text-app-muted">
                        {userRole === "coach" ? (
                          <>
                            Atleet
                            {athleteProgramLabel ? (
                              <span className="text-app-subtle">
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
                  className="ui-icon-btn app-focus-ring"
                  aria-label="Zoek in chat"
                >
                  <Search className="h-5 w-5" />
                </button>

                {!activeGroupId && activeUserId ? (
                  <button
                    type="button"
                    onClick={() => setMessage("/ai")}
                    className="chat-ai-btn flex h-9 w-9 items-center justify-center app-focus-ring"
                    aria-label="AI-assistent openen"
                    title="AI-assistent"
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                ) : null}

                <ChatConversationMenu
                  pinned={Boolean(currentConversationSettings?.pinned)}
                  muted={Boolean(currentConversationSettings?.muted)}
                  isDirect={Boolean(activeUserId && !activeGroupId)}
                  onPin={() => void handlePinConversation()}
                  onMute={() => void handleMuteConversation()}
                  onMarkUnread={() => void handleMarkUnreadConversation()}
                  onClear={() => void handleClearConversation()}
                  onDelete={() => void handleDeleteConversation()}
                  onReport={handleReportConversation}
                  onBlock={
                    activeUserId
                      ? () =>
                          void handleBlockUser(
                            activeUserId,
                            activeContact?.full_name || "Gebruiker",
                          )
                      : undefined
                  }
                />
              </header>

              <div className="relative flex min-h-0 flex-1 overflow-hidden">
                <div className="chat-conversation-stage flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
                    setSearchHighlightQuery(messageSearchQuery.trim());
                    setMessageSearchQuery("");
                    window.setTimeout(() => {
                      scrollToMessage(selectedMessage.id);
                    }, 50);
                    window.setTimeout(() => {
                      setSearchHighlightQuery("");
                    }, 4000);
                  }}
                />
              ) : (
                <>
              {!canSendMessages && activeGroupId && (
                <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-200">
                  Alleen beheerders kunnen berichten sturen in deze groep.
                </div>
              )}

              {pinnedMessage && (
                <div className="chat-pinned-bar">
                  <button
                    type="button"
                    onClick={() => scrollToMessage(pinnedMessage.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left hover:opacity-80"
                  >
                    <Pin className="h-4 w-4 shrink-0 text-emerald-400" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-app-accent">
                        Vastgezet bericht
                      </p>
                      <p className="truncate text-sm text-app-muted">
                        {getReplyText(pinnedMessage)}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handlePinMessage(pinnedMessage)}
                    className="shrink-0 p-1 text-app-muted transition hover:text-app-text"
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
                className={`min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain chat-messages-scroll px-3 py-3 transition-opacity duration-150 md:px-6 ${
                  switchingConversation ? "opacity-70" : "opacity-100"
                }`}
              >
                {switchingConversation && messages.length === 0 && (
                  <p className="text-sm text-app-muted">Chat laden...</p>
                )}

                {visibleMessages.map((msg, index) => {
                  const isMine = msg.sender_id === userId;
                  const previous = visibleMessages[index - 1];
                  const next = visibleMessages[index + 1];
                  const showDate = shouldShowDateDivider(msg, previous);
                  const groupedWithPrevious = shouldGroupWithPrevious(msg, previous);
                  const groupedWithNext = shouldGroupWithPrevious(next, msg);
                  const showTimestamp = shouldShowMessageTimestamp(msg, next);
                  const showSenderName =
                    Boolean(activeGroupId) && !isMine && !groupedWithPrevious;
                  const bubbleRadiusClass = getMessageBubbleRadiusClass(
                    isMine,
                    groupedWithPrevious,
                    groupedWithNext,
                  );
                  const exerciseVideo = parseExerciseVideoMessage(msg.body);
                  const pollMessage = parsePollMessage(msg.body);
                  const aiAssistantMessage = parseAiAssistantMessage(msg.body);
                  const inlineTimestamp = shouldUseInlineTimestamp(msg, exerciseVideo);
                  const highlightSearchMatch =
                    Boolean(searchHighlightQuery) &&
                    messageMatchesQuery(msg, searchHighlightQuery);

                  if (aiAssistantMessage) {
                    return (
                      <div key={msg.id} id={`chat-message-${msg.id}`} className="mb-3">
                        {showDate && (
                          <div className="my-4 flex justify-center">
                            <span className="chat-date-divider">
                              {formatDateDivider(msg.created_at)}
                            </span>
                          </div>
                        )}
                        <ChatAiMessage
                          question={aiAssistantMessage.question}
                          answer={aiAssistantMessage.answer}
                        />
                        <p className="mt-1 text-center text-[11px] text-app-subtle">
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
                        highlightedMessageId === msg.id ||
                        highlightSearchMatch
                          ? "rounded-2xl bg-emerald-500/10 ring-1 ring-emerald-500/30 transition-colors"
                          : ""
                      }
                    >
                      {showDate && (
                        <div className="my-4 flex justify-center">
                          <span className="chat-date-divider">
                            {formatDateDivider(msg.created_at)}
                          </span>
                        </div>
                      )}

                      <div
                        className={`flex w-full max-w-full overflow-hidden ${groupedWithPrevious ? "mb-0.5" : "mb-1.5"} ${isMine ? "justify-end" : "justify-start"}`}
                        onDoubleClick={(event) => {
                          event.stopPropagation();
                          handleReply(msg);
                        }}
                      >
                        <ChatSwipeReplyRow
                          onReply={() => handleReply(msg)}
                          onSwipeStart={cancelMessageLongPress}
                        >
                          <div
                            className={`flex max-w-[82%] flex-col md:max-w-[65%] ${
                              isMine ? "items-end" : "items-start"
                            }`}
                          >
                            {showSenderName ? (
                              <span className="mb-0.5 px-1 text-[11px] font-semibold text-app-muted">
                                {groupMemberNames[msg.sender_id] || "Onbekend"}
                              </span>
                            ) : null}

                            <div
                              className={`group relative w-fit max-w-full touch-manipulation select-none px-2.5 py-1.5 shadow-sm md:select-text ${
                                isMine
                                  ? "chat-bubble-own"
                                  : "chat-bubble-other"
                              } ${bubbleRadiusClass}`}
                              onTouchStart={(event) =>
                                startMessageLongPress(msg, event)
                              }
                              onTouchMove={handleMessageTouchMove}
                              onTouchEnd={(event) =>
                                handleMessageTouchEnd(msg, event)
                              }
                              onTouchCancel={cancelMessageLongPress}
                              onContextMenu={(event) => {
                                if (
                                  typeof window !== "undefined" &&
                                  window.innerWidth < 768
                                ) {
                                  event.preventDefault();
                                }
                              }}
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
                                  : "border-app-border bg-app-surface-muted"
                              }`}
                            >
                              <p
                                className={`text-xs font-semibold ${
                                  isMine ? "text-white/80" : "text-app-text"
                                }`}
                              >
                                {getReplySenderLabel(msg.reply_to_sender_id)}
                              </p>
                              <p
                                className={`truncate text-sm ${
                                  isMine ? "text-white/75" : "text-app-muted"
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
                                coachFeedbackEnabled={
                                  isCoachLikeRole(userRole) && !isMine
                                }
                                onSendFeedback={async ({ text, imageFile }) => {
                                  await sendCoachVideoFeedback(text, imageFile, msg);
                                }}
                              />
                            </div>
                          )}

                          {msg.file_url && msg.file_type === "video" &&
                            !exerciseVideo &&
                            (isCoachLikeRole(userRole) && !isMine ? (
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCoachVideoReview({
                                    url: msg.file_url!,
                                    title: "Video feedback",
                                    replyMessage: msg,
                                  });
                                }}
                                className="relative mb-2 block w-full overflow-hidden rounded-[16px] text-left"
                              >
                                <video
                                  src={msg.file_url}
                                  preload="metadata"
                                  playsInline
                                  onLoadedData={handleMediaLoaded}
                                  className="max-h-72 w-full object-cover"
                                />
                                <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-sm font-semibold text-white">
                                  Open met feedback
                                </span>
                              </button>
                            ) : (
                              <video
                                src={msg.file_url}
                                controls
                                preload="metadata"
                                playsInline
                                onLoadedData={handleMediaLoaded}
                                onClick={(event) => event.stopPropagation()}
                                className="mb-2 max-h-72 w-full rounded-[16px]"
                              />
                            ))}

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
                            inlineTimestamp && showTimestamp ? (
                              <div
                                className={`flex flex-wrap items-end gap-x-2 gap-y-1 ${
                                  isMine ? "justify-end" : "justify-start"
                                }`}
                              >
                                {highlightSearchMatch ? (
                                  <HighlightedText
                                    text={msg.body}
                                    query={searchHighlightQuery}
                                    className="whitespace-pre-wrap break-words text-[13px] leading-5"
                                  />
                                ) : (
                                  <p className="whitespace-pre-wrap break-words text-[13px] leading-5">
                                    {msg.body}
                                  </p>
                                )}
                                <div
                                  className={`flex shrink-0 items-center gap-1 ${
                                    isMine ? "text-white/70" : "text-app-subtle"
                                  }`}
                                >
                                  <span className="text-[10px] tabular-nums">
                                    {formatMessageTime(msg.created_at)}
                                  </span>
                                  {isMine &&
                                    !activeGroupId &&
                                    (isOutgoingMessageRead(msg) ? (
                                      <CheckCheck className="h-3 w-3" />
                                    ) : (
                                      <Check className="h-3 w-3" />
                                    ))}
                                </div>
                              </div>
                            ) : highlightSearchMatch ? (
                              <HighlightedText
                                text={msg.body}
                                query={searchHighlightQuery}
                                className="whitespace-pre-wrap break-words text-[13px] leading-5"
                              />
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-[13px] leading-5">
                                {msg.body}
                              </p>
                            )
                          )}

                          {!msg.body && !msg.file_url && msg.file_type && (
                            <p className="text-[13px] italic opacity-80">
                              {getReplyText(msg)}
                            </p>
                          )}
                            </div>

                            {showTimestamp && !inlineTimestamp ? (
                              <div
                                className={`mt-0.5 flex items-center gap-1 px-1 ${
                                  isMine
                                    ? "justify-end text-app-subtle"
                                    : "justify-start text-app-subtle"
                                }`}
                              >
                                <span className="text-[10px] tabular-nums">
                                  {formatMessageTime(msg.created_at)}
                                </span>
                                {isMine &&
                                  !activeGroupId &&
                                  (isOutgoingMessageRead(msg) ? (
                                    <CheckCheck className="h-3 w-3" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  ))}
                              </div>
                            ) : null}

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
                        </ChatSwipeReplyRow>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-compose-stack shrink-0">
              {typingIndicator ? (
                <p className="shrink-0 px-4 py-1 text-xs text-app-muted">
                  {typingIndicator.userName} typt...
                </p>
              ) : null}

              {replyingTo && (
                <div className="chat-reply-bar">
                  <div className="min-w-0 border-l-4 border-app-accent pl-3">
                    <p className="text-sm font-semibold text-app-text">
                      Antwoorden op{" "}
                      {replyingTo.sender_id === userId
                        ? "jezelf"
                        : getReplySenderLabel(replyingTo.sender_id)}
                    </p>
                    <p className="truncate text-sm text-app-muted">
                      {getReplyText(replyingTo)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="rounded-xl p-2 text-app-muted hover:bg-app-surface-hover"
                    aria-label="Antwoord annuleren"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <footer className="chat-compose-footer shrink-0 px-3 pt-1.5 md:px-4 md:py-2.5">
                <div className="chat-input-bar relative flex items-center gap-1.5 px-2.5 py-1.5 md:px-3">
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
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-app-text transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
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
                        <div className="chat-attach-menu">
                          <button
                            type="button"
                            onClick={() => {
                              setAttachMenuOpen(false);
                              fileInputRef.current?.click();
                            }}
                            className="chat-menu-item"
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
                              className="chat-menu-item"
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
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-app-text transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
                    aria-label="Camera openen"
                  >
                    <Camera className="h-5 w-5" />
                  </button>

                  {activeGroupId && (
                    <button
                      type="button"
                      onClick={() => setPollCreateOpen(true)}
                      disabled={!canSendMessages || uploadingMedia}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-app-text transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-40 md:hidden"
                      aria-label="Poll maken"
                    >
                      <BarChart2 className="h-5 w-5" />
                    </button>
                  )}

                  <div className="chat-message-input-wrap relative flex min-h-[30px] min-w-0 flex-1 items-center pl-1">
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
                                : "Typ een bericht"
                    }
                    disabled={!canSendMessages || uploadingMedia}
                    className="chat-message-input disabled:opacity-60"
                  />
                  </div>

                  {message.trim() && !slashPanelOpen && !slashCommandMenuOpen ? (
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={uploadingMedia}
                      className="chat-send-btn flex h-9 w-9 shrink-0 items-center justify-center disabled:cursor-not-allowed disabled:opacity-40"
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
                    <div className="h-10 w-10 shrink-0" aria-hidden />
                  )}
                </div>
              </footer>
              </div>
                </>
              )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {createGroupOpen && (
        <div className="chat-overlay flex items-end justify-center p-4 md:items-center">
          <div className="chat-modal">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="chat-modal-title">Nieuwe groep</h2>
              <button
                type="button"
                onClick={() => setCreateGroupOpen(false)}
                className="ui-icon-btn app-focus-ring"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="Groepsnaam"
              className="chat-field mb-4"
            />

            <div className="mb-4 max-h-56 overflow-y-auto rounded-xl border border-app-border">
              {contacts.map((contact) => {
                const checked = selectedGroupMemberIds.includes(contact.id);

                return (
                  <label
                    key={contact.id}
                    className="flex cursor-pointer items-center gap-3 border-b border-app-border px-4 py-3 last:border-b-0"
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
                    <span className="font-semibold text-app-text">
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
              className="app-btn-primary w-full disabled:opacity-50"
            >
              {creatingGroup ? "Groep maken..." : "Groep aanmaken"}
            </button>
          </div>
        </div>
      )}

      {pollCreateOpen && (
        <div className="chat-overlay flex items-end justify-center p-4 md:items-center">
          <div className="chat-modal">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="chat-modal-title">Poll maken</h2>
              <button
                type="button"
                onClick={() => setPollCreateOpen(false)}
                className="ui-icon-btn app-focus-ring"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <input
              value={pollQuestion}
              onChange={(event) => setPollQuestion(event.target.value)}
              placeholder="Stel je vraag..."
              className="chat-field mb-4"
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
                    className="w-full rounded-2xl border border-app-border px-4 py-3 text-app-text outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
                  />
                  {pollOptions.length > 2 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPollOptions((current) =>
                          current.filter((_, optionIndex) => optionIndex !== index),
                        )
                      }
                      className="rounded-2xl border border-app-border px-3 text-sm font-semibold"
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
                className="mb-4 text-sm font-semibold text-app-text underline"
              >
                Optie toevoegen
              </button>
            )}

            <button
              type="button"
              onClick={() => void sendPoll()}
              disabled={creatingPoll}
              className="app-btn-primary w-full disabled:opacity-50"
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
        canReport={messageMenu ? messageMenu.message.sender_id !== userId : false}
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
        onReport={() => {
          if (messageMenu) handleReportMessage(messageMenu.message);
        }}
        onReact={(emoji) => {
          if (messageMenu) void handleMessageReaction(messageMenu.message.id, emoji);
        }}
      />

      <ChatReportSheet
        open={Boolean(reportTarget)}
        target={reportTarget}
        onClose={() => setReportTarget(null)}
        onSubmitted={() =>
          showAppToast("Melding ontvangen. We beoordelen dit binnen 24 uur.")
        }
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

      {coachVideoReview ? (
        <ChatVideoCoachFeedbackViewer
          videoUrl={coachVideoReview.url}
          title={coachVideoReview.title}
          subtitle={coachVideoReview.subtitle}
          onClose={() => setCoachVideoReview(null)}
          onSendFeedback={async ({ text, imageFile }) => {
            await sendCoachVideoFeedback(
              text,
              imageFile,
              coachVideoReview.replyMessage,
            );
            setCoachVideoReview(null);
          }}
        />
      ) : null}
    </AppShell>
  );
}
