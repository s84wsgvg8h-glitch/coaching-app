"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getPageTitle } from "@/lib/navigation";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getUnreadMessageCount,
} from "@/lib/chatUnread";

type AppTopBarProps = {
  onSearchClick: () => void;
};

function formatTopBarDate() {
  const today = new Date();
  const label = today.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function AppTopBar({ onSearchClick }: AppTopBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, role, userId } = useAuth();
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const pageTitle = getPageTitle(pathname, role);
  const isDashboard = pathname === "/dashboard";
  const fullName = profile?.full_name || "Profiel";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  useEffect(() => {
    if (!userId) return;

    async function loadUnread() {
      setChatUnreadCount(await getUnreadMessageCount(userId));
    }

    loadUnread();

    function handleChatUnreadChanged() {
      loadUnread();
    }

    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, handleChatUnreadChanged);
    return () => {
      window.removeEventListener(
        CHAT_UNREAD_CHANGED_EVENT,
        handleChatUnreadChanged,
      );
    };
  }, [pathname, userId]);

  function openAgenda() {
    router.push("/agenda");
  }

  return (
    <header
      className={`ui-topbar sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-app-border/50 bg-app-bg/85 pb-2.5 pt-0 backdrop-blur-md supports-[backdrop-filter]:bg-app-bg/70 ${
        isDashboard ? "mb-3" : "mb-5"
      }`}
    >
      {!isDashboard ? (
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <h1 className="truncate text-[15px] font-medium tracking-tight text-app-text">
            {pageTitle}
          </h1>
        </div>
      ) : (
        <div className="hidden min-w-0 flex-1 sm:block" aria-hidden="true" />
      )}

      <button
        type="button"
        onClick={onSearchClick}
        className="ui-search-pill ui-search-pill-compact app-focus-ring hidden max-w-[220px] flex-1 items-center gap-2 sm:flex lg:max-w-[260px]"
      >
        <span className="text-[13px] text-app-subtle" aria-hidden="true">
          ⌘K
        </span>
        <span className="flex-1 truncate text-left text-[12px] font-normal text-app-subtle">
          Zoeken…
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onSearchClick}
          className="ui-icon-btn app-focus-ring sm:hidden"
          aria-label="Zoeken"
        >
          ⌕
        </button>

        <button
          type="button"
          onClick={openAgenda}
          className="ui-pill-meta hidden items-center gap-1.5 px-3 py-1.5 text-[12px] text-app-muted transition hover:border-app-border-strong hover:text-app-text md:inline-flex app-focus-ring"
          aria-label="Open agenda"
        >
          <span aria-hidden="true">📅</span>
          <span>{formatTopBarDate()}</span>
        </button>

        <Link
          href="/chat"
          className="ui-icon-btn relative app-focus-ring"
          aria-label={
            chatUnreadCount > 0
              ? `Chat, ${chatUnreadCount} ongelezen`
              : "Chat"
          }
        >
          💬
          {chatUnreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-app-accent px-1 text-[9px] font-semibold text-white">
              {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
            </span>
          ) : null}
        </Link>

        <Link
          href="/profile"
          className="ui-profile-chip app-focus-ring"
          aria-label="Profiel"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-app-surface-hover text-[11px] font-semibold text-app-text">
            {initials || "👤"}
          </span>
          <span className="hidden max-w-[120px] truncate text-[13px] font-medium text-app-text lg:inline">
            {fullName}
          </span>
          <span className="hidden text-app-subtle lg:inline" aria-hidden="true">
            ▾
          </span>
        </Link>
      </div>
    </header>
  );
}
