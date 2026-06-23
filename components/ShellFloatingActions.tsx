"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getAthleteNotificationCount, getUnreadMessageCount, CHAT_UNREAD_CHANGED_EVENT } from "@/lib/chatUnread";

type ShellFloatingActionsProps = {
  onSearchClick: () => void;
  onNotificationsClick: () => void;
  notificationCount?: number;
};

export default function ShellFloatingActions({
  onSearchClick,
  onNotificationsClick,
  notificationCount = 0,
}: ShellFloatingActionsProps) {
  const { profile, userId, role } = useAuth();
  const fullName = profile?.full_name || "Profiel";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const [unread, setUnread] = useState(notificationCount);

  useEffect(() => {
    setUnread(notificationCount);
  }, [notificationCount]);

  useEffect(() => {
    if (!userId) return;

    async function refresh() {
      setUnread(
        role === "atleet"
          ? await getAthleteNotificationCount(userId)
          : await getUnreadMessageCount(userId),
      );
    }

    void refresh();
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, refresh);
  }, [role, userId]);

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-30 flex items-center gap-1.5 md:right-5 md:top-4">
      <button
        type="button"
        onClick={onSearchClick}
        className="pointer-events-auto ui-icon-btn hidden app-focus-ring sm:inline-flex"
        aria-label="Zoeken (⌘K)"
        title="Zoeken (⌘K)"
      >
        ⌘K
      </button>

      <button
        type="button"
        onClick={onNotificationsClick}
        className="pointer-events-auto ui-icon-btn relative app-focus-ring"
        aria-label="Notificaties"
      >
        <Bell className="h-4 w-4" />
        {unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-app-accent px-1 text-[9px] font-semibold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      <Link
        href="/profile"
        className="pointer-events-auto ui-profile-chip app-focus-ring"
        aria-label="Profiel"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app-surface-hover text-[11px] font-semibold text-app-text">
          {initials || "👤"}
        </span>
        <span className="hidden max-w-[120px] truncate text-[13px] font-medium text-app-text lg:inline">
          {fullName}
        </span>
      </Link>
    </div>
  );
}
