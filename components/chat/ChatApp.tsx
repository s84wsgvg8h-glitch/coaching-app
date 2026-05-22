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
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import {
  createChatGroup,
  getGroupUnreadCount,
  loadChatGroupMemberNames,
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
import ChatMediaCapture from "@/components/chat/ChatMediaCapture";
import ChatMediaComposer from "@/components/chat/ChatMediaComposer";
import GroupInfoPanel from "@/components/chat/GroupInfoPanel";
import ChatAvatar from "@/components/chat/ChatAvatar";
import ChatConversationMenu from "@/components/chat/ChatConversationMenu";
import ChatVoiceMessage from "@/components/chat/ChatVoiceMessage";
import ChatVoiceRecorder from "@/components/chat/ChatVoiceRecorder";
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
  const [mediaCaptureOpen, setMediaCaptureOpen] = useState(false);
  const [pendingMediaFile, setPendingMediaFile] = useState<File | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
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

  async function loadContacts(
    currentUserId: string,
    role: string,
    settingsMap: Record<string, ChatConversationSettings> = {},
  ) {
    let contactQuery = supabase.from("profiles").select("*");

    if (role === "coach") {
      contactQuery = contactQuery.eq("role", "atleet").order("full_name", {
        ascending: true,
      });
    } else {
      contactQuery = contactQuery.eq("role", "coach").limit(1);
    }

    const { data: profiles } = await contactQuery;

    return Promise.all(
      (profiles || []).map(async (contact) => {
        const { data: lastMessages } = await supabase
          .from("messages")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUserId},receiver_id.eq.${contact.id}),and(sender_id.eq.${contact.id},receiver_id.eq.${currentUserId})`,
          )
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessage = lastMessages?.[0] as ChatMessage | undefined;
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

    return Promise.all(
      baseGroups.map(async (group) => {
        const { data: lastMessages } = await supabase
          .from("messages")
          .select("*")
          .eq("group_id", group.id)
          .order("created_at", { ascending: false })
          .limit(1);

        const lastMessage = lastMessages?.[0] as ChatMessage | undefined;
        let senderName = "";

        if (lastMessage && lastMessage.sender_id !== currentUserId) {
          const { data: senderProfile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", lastMessage.sender_id)
            .maybeSingle();

          senderName = senderProfile?.full_name || "Onbekend";
        }

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
        setGroupMemberRoles({});
        setMessages([]);
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
        setGroupMemberRoles({});

        setContacts((current) =>
          current.map((item) =>
            item.id === route.id ? { ...item, unreadCount: 0 } : item,
          ),
        );

        await markConversationAsRead(userId, route.id);
        const loadedMessages = filterMessagesByClearedAt(
          await loadDirectMessages(userId, route.id),
          clearedAt,
        );
        setMessages(loadedMessages);
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
      setGroupMemberNames(await loadChatGroupMemberNames(route.id));

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
        }
        return;
      }

      const loadedMessages = filterMessagesByClearedAt(
        await loadGroupMessages(route.id),
        clearedAt,
      );
      setMessages(loadedMessages);
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

  async function sendMessage() {
    if (!message.trim() || !userId) return;
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
    if (exerciseVideo || message.file_url) return false;
    if (!message.body) return false;
    if (message.body.includes("\n")) return false;
    return message.body.length <= 48;
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

  return (
    <AppShell
      className="fixed inset-0 z-40 h-[100dvh] max-h-[100dvh] overflow-hidden bg-gray-100 lg:relative lg:inset-auto lg:min-h-screen"
      contentClassName="flex h-full min-h-0 flex-1 overflow-hidden p-0 pb-0"
    >
      <div className="flex h-full min-h-0 w-full overflow-hidden bg-gray-100">
        <aside
          className={`flex h-full min-h-0 w-full flex-col border-r border-gray-200 bg-white md:w-[420px] md:max-w-[40%] ${
            showConversationOnMobile ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="shrink-0 border-b border-gray-200 bg-white px-4 pb-3 pt-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h1 className="text-2xl font-bold text-black">Chats</h1>
              <div className="flex items-center gap-2">
                {userRole === "coach" && (
                  <button
                    type="button"
                    onClick={() => setCreateGroupOpen(true)}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-black transition hover:bg-gray-200"
                    aria-label="Nieuwe groep"
                  >
                    <Users className="h-5 w-5" />
                  </button>
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
              <p className="px-4 py-6 text-sm text-gray-500">Chats laden...</p>
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

        <section
          ref={conversationPanelRef}
          className={`flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-gray-100 overscroll-x-none md:relative ${
            showConversationOnMobile
              ? "fixed inset-0 z-50 touch-pan-y md:static md:inset-auto md:z-auto"
              : "hidden md:flex"
          }`}
        >
          {!activeUserId && !activeGroupId ? (
            <div className="flex h-full flex-col items-center justify-center bg-white text-center">
              <div className="mb-6 flex h-28 w-28 items-center justify-center rounded-full bg-gray-100">
                <MessageCircle className="h-12 w-12 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-black">Limitless Chat</h2>
              <p className="mt-3 max-w-sm text-sm text-gray-500">
                Stuur berichten naar je coach, atleten of groepen. Selecteer een
                chat links om te beginnen.
              </p>
            </div>
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
                        {userRole === "coach" ? "Atleet" : "Coach"}
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
                  const inlineTimestamp = shouldUseInlineTimestamp(msg, exerciseVideo);

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

                          {msg.body && !exerciseVideo && (
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
                                    (msg.read_at ? (
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
                              (msg.read_at ? (
                                <CheckCheck className="h-3.5 w-3.5" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              ))}
                          </div>
                          )}
                        </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

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

                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder={
                      uploadingMedia ? "Media uploaden..." : "Typ een bericht"
                    }
                    disabled={!canSendMessages || uploadingMedia}
                    className="max-h-32 min-h-[24px] flex-1 resize-none bg-transparent py-2 text-[15px] text-black outline-none placeholder:text-gray-400 disabled:opacity-60"
                  />

                  {message.trim() ? (
                    <button
                      type="button"
                      onClick={sendMessage}
                      disabled={uploadingMedia}
                      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
                      aria-label="Verstuur bericht"
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </button>
                  ) : (
                    <ChatVoiceRecorder
                      disabled={!canSendMessages || uploadingMedia}
                      onSend={(blob, mimeType) => {
                        void sendVoiceMessage(blob, mimeType);
                      }}
                    />
                  )}
                </div>
              </footer>
                </>
              )}
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
      />
    </AppShell>
  );
}
