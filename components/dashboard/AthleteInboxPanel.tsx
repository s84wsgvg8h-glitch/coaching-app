"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ChatAvatar from "@/components/chat/ChatAvatar";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAthleteCoachChatPreview } from "@/hooks/useAthleteCoachChatPreview";

type AthleteInboxPanelProps = {
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

export default function AthleteInboxPanel({ athleteId }: AthleteInboxPanelProps) {
  const { data: preview, isPending } = useAthleteCoachChatPreview(
    athleteId,
    Boolean(athleteId),
  );

  const unread = preview?.unreadCount ?? 0;

  return (
    <div className="dashboard-cockpit-panel athlete-inbox-panel premium-card glass-accent-card">
      <div className="dashboard-panel flex h-full min-h-0 flex-col">
        <div className="mb-2 flex shrink-0 items-start justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-semibold tracking-tight text-app-text">
              Inbox
            </h2>
            <p className="text-[11px] text-app-muted">Snelle acties</p>
          </div>
        </div>

        {isPending && !preview ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ) : !preview ? (
          <p className="text-[12px] text-app-muted">
            Nog geen coach gekoppeld aan je account.
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1 items-start gap-3">
              <ChatAvatar
                name={preview.coachName}
                imageUrl={preview.coachAvatarUrl}
                className="h-10 w-10 shrink-0 text-sm"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-[13px] font-semibold text-app-text">
                    {preview.coachName}
                  </p>
                  {preview.previewAt ? (
                    <span className="shrink-0 text-[11px] text-app-muted">
                      {formatPreviewTime(preview.previewAt)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 line-clamp-2 text-[12px] text-app-muted">
                  {preview.previewSender ? (
                    <span className="font-medium text-app-text">
                      {preview.previewSender}:{" "}
                    </span>
                  ) : null}
                  {preview.previewText}
                </p>
              </div>
            </div>

            {unread > 0 ? (
              <div className="mt-3 flex items-center gap-2 text-[11px] text-app-muted">
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400"
                  aria-hidden="true"
                />
                <span>
                  Bericht{" "}
                  <span className="font-semibold tabular-nums text-app-text">
                    {unread}
                  </span>{" "}
                  {unread === 1 ? "Ongelezen bericht" : "Ongelezen berichten"}
                </span>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-auto flex shrink-0 justify-end pt-3">
          <Link
            href={`/chat?from=${encodeURIComponent("/dashboard")}`}
            className="athlete-inbox-open-btn app-focus-ring"
          >
            Open chat
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
