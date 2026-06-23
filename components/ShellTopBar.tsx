"use client";

import Link from "next/link";
import { Bell, Search, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import ThemeToggle from "@/components/ThemeToggle";
import { isCoachLikeRole } from "@/lib/authRoles";
import PageBackButton from "@/components/ui/PageBackButton";
import { getAthleteNotificationCount, getUnreadMessageCount, CHAT_UNREAD_CHANGED_EVENT } from "@/lib/chatUnread";

type ShellTopBarProps = {
  onSearchClick: () => void;
  onNotificationsClick: () => void;
  notificationCount?: number;
};

export default function ShellTopBar({
  onSearchClick,
  onNotificationsClick,
  notificationCount = 0,
}: ShellTopBarProps) {
  const { profile, userId, role } = useAuth();
  const showSearch = isCoachLikeRole(role);
  const fullName = profile?.full_name || "Profiel";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const [unread, setUnread] = useState(notificationCount);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!searchExpanded) return;

    searchInputRef.current?.focus();

    function handlePointerDown(event: MouseEvent) {
      if (
        searchWrapRef.current &&
        !searchWrapRef.current.contains(event.target as Node)
      ) {
        setSearchExpanded(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [searchExpanded]);

  return (
    <header className="shell-topbar z-30 shrink-0 pt-safe">
      <div className="flex items-center justify-between gap-1.5 px-0.5 py-1.5 md:py-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <Suspense fallback={null}>
            <PageBackButton variant="topbar" />
          </Suspense>
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5">
        {showSearch ? (
          <div
            ref={searchWrapRef}
            className={`flex items-center transition-all duration-200 ease-out ${
              searchExpanded ? "mr-auto w-[min(100vw-8rem,320px)] flex-1" : ""
            }`}
          >
            {searchExpanded ? (
              <div className="shell-topbar-search-expanded app-focus-ring">
                <Search className="h-4 w-4 shrink-0 text-app-subtle" />
                <input
                  ref={searchInputRef}
                  readOnly
                  onFocus={onSearchClick}
                  onClick={onSearchClick}
                  placeholder="Zoek pagina's, atleten, acties..."
                  className="min-w-0 flex-1 cursor-pointer bg-transparent text-[13px] text-app-text placeholder:text-app-subtle focus:outline-none"
                />
                <kbd className="shell-topbar-search-kbd hidden shrink-0 sm:inline">
                  ⌘K
                </kbd>
                <button
                  type="button"
                  onClick={() => setSearchExpanded(false)}
                  className="ui-icon-btn shrink-0 app-focus-ring"
                  aria-label="Zoeken sluiten"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchExpanded(true);
                  window.requestAnimationFrame(() => onSearchClick());
                }}
                className="ui-icon-btn app-focus-ring"
                aria-label="Zoeken"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : null}

        <ThemeToggle compact className="shrink-0" />

        <button
          type="button"
          onClick={onNotificationsClick}
          className="ui-icon-btn relative app-focus-ring"
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
          className="ui-icon-btn app-focus-ring"
          aria-label="Profiel"
        >
          <span className="text-[12px] font-semibold">{initials || "👤"}</span>
        </Link>
        </div>
      </div>
    </header>
  );
}
