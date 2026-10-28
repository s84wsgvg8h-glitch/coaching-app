"use client";

import Link from "next/link";
import { ChevronRight, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
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
      <div
        className="athlete-dashboard-hero-card athlete-dashboard-hero-card--chat animate-pulse"
        aria-hidden="true"
      >
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="mx-auto h-3 w-20" />
          <Skeleton className="mx-auto h-4 w-28" />
          <Skeleton className="h-3 w-full" />
        </div>
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="athlete-dashboard-hero-card athlete-dashboard-hero-card--chat athlete-dashboard-hero-card--static">
        <div className="athlete-dashboard-hero-card-topline">
          <p className="athlete-dashboard-hero-eyebrow">Chat</p>
        </div>
        <div className="athlete-dashboard-chat-body">
          <span className="athlete-dashboard-chat-empty-icon" aria-hidden="true">
            <MessageCircle className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="athlete-dashboard-chat-name">Coach chat</p>
            <p className="athlete-dashboard-chat-preview">
              Nog geen coach gekoppeld aan je account.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasUnread = preview.unreadCount > 0;
  const eyebrowLabel = hasUnread ? "Nieuw bericht" : "Van je coach";

  return (
    <Link
      href={`/chat?from=${encodeURIComponent("/dashboard")}`}
      className={`athlete-dashboard-hero-card athlete-dashboard-hero-card--chat app-focus-ring${
        isFetching ? " opacity-95" : ""
      }`}
    >
      <div className="athlete-dashboard-hero-card-topline">
        <p
          className={`athlete-dashboard-hero-eyebrow${
            hasUnread ? " athlete-dashboard-hero-eyebrow--alert" : ""
          }`}
        >
          {eyebrowLabel}
        </p>
        {preview.previewAt ? (
          <span className="athlete-chat-widget-time shrink-0">
            {formatPreviewTime(preview.previewAt)}
          </span>
        ) : null}
      </div>

      <div className="athlete-dashboard-chat-body athlete-dashboard-chat-body--no-avatar">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="athlete-dashboard-chat-name truncate">{preview.coachName}</p>
            {hasUnread ? (
              <span className="athlete-chat-widget-badge shrink-0">
                {preview.unreadCount > 9 ? "9+" : preview.unreadCount}
              </span>
            ) : null}
          </div>
          <p className="athlete-dashboard-chat-preview line-clamp-1">
            {preview.previewSender ? (
              <span className="font-medium text-app-text">
                {preview.previewSender}:{" "}
              </span>
            ) : null}
            {preview.previewText}
          </p>
        </div>
        <ChevronRight
          className="athlete-dashboard-chat-chevron shrink-0"
          aria-hidden="true"
        />
      </div>
    </Link>
  );
}
