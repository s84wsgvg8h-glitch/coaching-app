"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getUnreadCountForConversation,
} from "@/lib/chatUnread";
import {
  loadAthleteCoachChatPreview,
  type AthleteCoachChatPreview,
} from "@/lib/athleteChatPreview";

type AthleteChatWidgetProps = {
  athleteId: string;
};

function formatPreviewTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

export default function AthleteChatWidget({ athleteId }: AthleteChatWidgetProps) {
  const [preview, setPreview] = useState<AthleteCoachChatPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await loadAthleteCoachChatPreview(athleteId);
      if (!cancelled) {
        setPreview(data);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  useEffect(() => {
    if (!preview?.coachId) return;

    async function refreshUnread() {
      const coachId = preview?.coachId;
      if (!coachId) return;
      const unreadCount = await getUnreadCountForConversation(
        athleteId,
        coachId,
      );
      setPreview((current) =>
        current ? { ...current, unreadCount } : current,
      );
    }

    void refreshUnread();
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, refreshUnread);
    return () => window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, refreshUnread);
  }, [athleteId, preview?.coachId]);

  if (loading) {
    return (
      <div className="athlete-dashboard-card athlete-chat-widget">
        <p className="text-sm text-app-muted">Chat laden...</p>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="athlete-dashboard-card athlete-chat-widget">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="athlete-dashboard-eyebrow">Chat</p>
            <h2 className="mt-1 text-[15px] font-semibold text-app-text">
              Coach chat
            </h2>
            <p className="mt-1 text-sm text-app-muted">
              Nog geen coach gekoppeld aan je account.
            </p>
          </div>
          <MessageCircle className="h-5 w-5 text-app-muted" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <Link
      href={`/chat?from=${encodeURIComponent("/dashboard")}`}
      className="athlete-dashboard-card athlete-chat-widget app-focus-ring block transition hover:border-app-accent/35"
    >
      <div className="flex items-start gap-3">
        <ChatAvatar
          name={preview.coachName}
          imageUrl={preview.coachAvatarUrl}
          className="h-11 w-11 shrink-0 text-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="athlete-dashboard-eyebrow">Chat</p>
              <h2 className="truncate text-[15px] font-semibold text-app-text">
                {preview.coachName}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {preview.previewAt ? (
                <span className="text-[11px] text-app-muted">
                  {formatPreviewTime(preview.previewAt)}
                </span>
              ) : null}
              {preview.unreadCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-app-accent px-1.5 text-[10px] font-semibold text-white">
                  {preview.unreadCount > 9 ? "9+" : preview.unreadCount}
                </span>
              ) : null}
            </div>
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-app-muted">
            {preview.previewSender ? (
              <span className="font-medium text-app-text">
                {preview.previewSender}:{" "}
              </span>
            ) : null}
            {preview.previewText}
          </p>
        </div>
      </div>
    </Link>
  );
}
