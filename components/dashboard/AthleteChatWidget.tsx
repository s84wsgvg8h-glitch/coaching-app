"use client";

import Link from "next/link";
import { Skeleton } from "@/components/ui/Skeleton";
import { MessageCircle } from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import { useAthleteCoachChatPreview } from "@/hooks/useAthleteCoachChatPreview";

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
  const { data: preview, isPending, isFetching } = useAthleteCoachChatPreview(
    athleteId,
    Boolean(athleteId),
  );
  const showSkeleton = isPending && !preview;

  if (showSkeleton) {
    return (
      <div className="athlete-dashboard-card athlete-chat-widget animate-pulse">
        <div className="flex gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
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

  const hasUnread = preview.unreadCount > 0;

  return (
    <Link
      href={`/chat?from=${encodeURIComponent("/dashboard")}`}
      className={`athlete-dashboard-card athlete-chat-widget app-focus-ring block${
        isFetching ? " opacity-95" : ""
      }`}
    >
      <div className="athlete-chat-widget-inner">
        <ChatAvatar
          name={preview.coachName}
          imageUrl={preview.coachAvatarUrl}
          className="athlete-chat-widget-avatar shrink-0 text-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p
              className={`athlete-dashboard-eyebrow mb-0${
                hasUnread ? " athlete-dashboard-eyebrow--alert" : ""
              }`}
            >
              {hasUnread ? "Nieuw bericht" : "Chat"}
            </p>
            {preview.previewAt ? (
              <span className="athlete-chat-widget-time shrink-0">
                {formatPreviewTime(preview.previewAt)}
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-[15px] font-semibold text-app-text">
                {preview.coachName}
              </h2>
              <p className="athlete-chat-widget-preview line-clamp-2">
                {preview.previewSender ? (
                  <span className="font-medium text-app-text">
                    {preview.previewSender}:{" "}
                  </span>
                ) : null}
                {preview.previewText}
              </p>
            </div>
            {hasUnread ? (
              <span className="athlete-chat-widget-badge shrink-0">
                {preview.unreadCount > 9 ? "9+" : preview.unreadCount}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
