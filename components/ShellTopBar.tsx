"use client";

import { Bell, Search, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import { isAthleteProfileOpen } from "@/lib/athleteProfileNavigation";
import PageBackButton from "@/components/ui/PageBackButton";
import SearchInput from "@/components/ui/SearchInput";
import {
  ShellHeaderActionAvatar,
  ShellHeaderActionButton,
  ShellHeaderActionLink,
} from "@/components/ui/ShellHeaderActionChip";
import {
  dashboardFirstName,
  formatDashboardDate,
  getDashboardGreeting,
} from "@/lib/dashboardGreeting";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type ShellTopBarProps = {
  onSearchClick: () => void;
  onNotificationsClick: () => void;
  notificationCount?: number;
  className?: string;
  athleteProfileOpen?: boolean;
  onAthleteProfileToggle?: () => void;
};

export default function ShellTopBar({
  onSearchClick,
  onNotificationsClick,
  notificationCount = 0,
  className = "",
  athleteProfileOpen = false,
  onAthleteProfileToggle,
}: ShellTopBarProps) {
  const pathname = usePathname();
  const { profile, userId, role } = useAuth();
  const showSearch = isCoachLikeRole(role);
  const isCoachDashboard = pathname === "/dashboard" && isCoachLikeRole(role);
  const isAthleteDashboard = pathname === "/dashboard" && role === "atleet";
  // Athletes don't use the search center — including it adds shell-topbar--dashboard
  // which triggers a 1-column grid layout breaking the greeting + actions row.
  const showDashboardSearchCenter = isCoachDashboard;
  const isAthleteMobileProfile =
    role === "atleet" && isAthleteProfileOpen(pathname);
  const fullName = profile?.full_name || "Profiel";
  const firstName = dashboardFirstName(fullName);
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const [unread, setUnread] = useState(notificationCount);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const { data: cachedUnread } = useNotificationCount(userId, role, Boolean(userId && role));

  useEffect(() => {
    deferEffectUpdate(() => {
      setUnread(notificationCount);
    });
  }, [notificationCount]);

  useEffect(() => {
    if (cachedUnread == null) return;
    deferEffectUpdate(() => {
      setUnread(cachedUnread);
    });
  }, [cachedUnread]);

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

  const searchField = (
    <SearchInput
      ref={searchInputRef}
      value=""
      onChange={() => {}}
      readOnly
      onFocus={onSearchClick}
      onClick={onSearchClick}
      placeholder="Zoek pagina's, atleten, acties..."
      variant="pill"
      showClear={false}
      className="w-full"
      inputClassName="cursor-pointer"
      trailing={
        <>
          <kbd className="shell-topbar-search-kbd hidden shrink-0 sm:inline">
            ⌘K
          </kbd>
          {searchExpanded ? (
            <button
              type="button"
              onClick={() => setSearchExpanded(false)}
              className="ui-icon-btn shrink-0 app-focus-ring"
              aria-label="Zoeken sluiten"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </>
      }
    />
  );

  return (
    <header
      className={`shell-topbar z-30 shrink-0 ${
        showDashboardSearchCenter ? "shell-topbar--dashboard" : ""
      }${isAthleteDashboard ? " shell-topbar--athlete-dashboard" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="shell-topbar-inner">
        <div className="shell-topbar-leading flex min-w-0 items-center gap-1.5">
          {!isCoachDashboard && !isAthleteDashboard && !isAthleteMobileProfile ? (
            <Suspense fallback={null}>
              <PageBackButton variant="topbar" />
            </Suspense>
          ) : null}
          {isAthleteMobileProfile ? (
            <h1 className="shell-topbar-athlete-title truncate">Profiel</h1>
          ) : null}
          {isAthleteDashboard ? (
            <div className="shell-topbar-athlete-greeting min-w-0">
              <p className="shell-topbar-athlete-greeting-hey">
                Hey {firstName} 👋
              </p>
            </div>
          ) : null}
          {isCoachDashboard ? (
            <div className="shell-topbar-greeting">
              <p className="shell-topbar-greeting-title">
                {getDashboardGreeting()}, {firstName} 👋
              </p>
              <p className="shell-topbar-greeting-sub">{formatDashboardDate()}</p>
            </div>
          ) : null}
        </div>

        {showDashboardSearchCenter ? (
          <div className="shell-topbar-search-center">{searchField}</div>
        ) : null}

        <div className="shell-topbar-actions">
          {showSearch && !isCoachDashboard ? (
            <div
              ref={searchWrapRef}
              className={`shell-topbar-search-mobile flex items-center transition-all duration-200 ease-out ${
                searchExpanded ? "mr-auto w-[min(100vw-8rem,320px)] flex-1" : ""
              }`}
            >
              {searchExpanded ? (
                searchField
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

          {showSearch && showDashboardSearchCenter ? (
            <div
              ref={searchWrapRef}
              className={`shell-topbar-search-mobile flex items-center lg:hidden ${
                searchExpanded ? "w-full flex-1" : ""
              }`}
            >
              {searchExpanded ? (
                searchField
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

          <ShellHeaderActionButton
            onClick={onNotificationsClick}
            aria-label={
              unread > 0 ? `Notificaties, ${unread} ongelezen` : "Notificaties"
            }
            badge={unread}
            badgeLabel={unread > 0 ? `${unread} ongelezen notificaties` : undefined}
          >
            <ShellHeaderActionAvatar icon>
              <Bell className="h-4 w-4" aria-hidden="true" />
            </ShellHeaderActionAvatar>
          </ShellHeaderActionButton>

          {role === "atleet" && onAthleteProfileToggle ? (
            <ShellHeaderActionButton
              onClick={onAthleteProfileToggle}
              aria-label={athleteProfileOpen ? "Profiel sluiten" : "Profiel openen"}
              aria-pressed={athleteProfileOpen}
              className={[
                athleteProfileOpen ? "shell-topbar-action-chip--active" : "",
                isAthleteDashboard ? "shell-topbar-action-chip--athlete-avatar" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <ShellHeaderActionAvatar>{initials || "LC"}</ShellHeaderActionAvatar>
              <span
                className={`shell-topbar-action-copy min-w-0${
                  isAthleteDashboard ? " hidden lg:block" : ""
                }`}
              >
                <span className="shell-topbar-action-label block truncate">
                  {isAthleteDashboard ? fullName : "Profiel"}
                </span>
                {isAthleteDashboard ? (
                  <span className="shell-topbar-action-sublabel hidden lg:block">
                    Atleet
                  </span>
                ) : null}
              </span>
            </ShellHeaderActionButton>
          ) : (
            <ShellHeaderActionLink href="/profile" aria-label="Profiel">
              <ShellHeaderActionAvatar>{initials || "LC"}</ShellHeaderActionAvatar>
              <span
                className={`shell-topbar-action-copy min-w-0${
                  isAthleteDashboard ? " hidden lg:block" : ""
                }`}
              >
                <span className="shell-topbar-action-label block truncate">
                  <span className="lg:hidden">Profiel</span>
                  <span className="hidden lg:inline">{firstName}</span>
                </span>
                {isCoachLikeRole(role) ? (
                  <span className="shell-topbar-action-sublabel hidden lg:block">
                    Coach
                  </span>
                ) : null}
              </span>
            </ShellHeaderActionLink>
          )}
        </div>
      </div>
    </header>
  );
}
