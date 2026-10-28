"use client";

import { Bell, Search, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import { isProfileOpen } from "@/lib/athleteProfileNavigation";
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
  mobileProfileOpen?: boolean;
  onProfileToggle?: () => void;
};

export default function ShellTopBar({
  onSearchClick,
  onNotificationsClick,
  notificationCount = 0,
  className = "",
  mobileProfileOpen = false,
  onProfileToggle,
}: ShellTopBarProps) {
  const pathname = usePathname();
  const { profile, userId, role } = useAuth();
  const { t } = useLocale();
  const showTopBarSearch = isCoachLikeRole(role) && pathname !== "/dashboard";
  const isCoachDashboard = pathname === "/dashboard" && isCoachLikeRole(role);
  const isAthleteDashboard = pathname === "/dashboard" && role === "atleet";
  // Athletes don't use the search center — including it adds shell-topbar--dashboard
  // which triggers a 1-column grid layout breaking the greeting + actions row.
  // Coach dashboard search lives in the cockpit center column (desktop), not the topbar.
  const showDashboardSearchCenter = false;
  const isMobileProfilePage = isProfileOpen(pathname);
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
      placeholder={t("shell.searchPages")}
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
              aria-label={t("shell.closeSearch")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </>
      }
    />
  );

  const openSearch = () => {
    setSearchExpanded(true);
    window.requestAnimationFrame(() => onSearchClick());
  };

  return (
    <header
      className={`shell-topbar z-30 shrink-0 ${
        showDashboardSearchCenter ? "shell-topbar--dashboard" : ""
      }${isAthleteDashboard ? " shell-topbar--athlete-dashboard" : ""}${
        isCoachDashboard ? " shell-topbar--coach-dashboard" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <div className="shell-topbar-inner">
        <div className="shell-topbar-leading flex min-w-0 items-center gap-1.5">
          {!isCoachDashboard && !isAthleteDashboard && !isMobileProfilePage ? (
            <Suspense fallback={null}>
              <PageBackButton variant="topbar" />
            </Suspense>
          ) : null}
          {isMobileProfilePage ? (
            <h1 className="shell-topbar-athlete-title truncate">{t("profile.title")}</h1>
          ) : null}
          {isAthleteDashboard ? (
            <div className="shell-topbar-dashboard-greeting shell-topbar-athlete-greeting min-w-0">
              <p className="shell-topbar-dashboard-greeting-title shell-topbar-athlete-greeting-hey">
                Hey {firstName} 👋
              </p>
            </div>
          ) : null}
          {isCoachDashboard ? (
            <>
              <div className="shell-topbar-dashboard-greeting min-w-0 lg:hidden">
                <p className="shell-topbar-dashboard-greeting-title">
                  {getDashboardGreeting()}, {firstName} 👋
                </p>
              </div>
              <div className="shell-topbar-greeting hidden lg:block">
                <p className="shell-topbar-greeting-title">
                  {getDashboardGreeting()}, {firstName} 👋
                </p>
                <p className="shell-topbar-greeting-sub">{formatDashboardDate()}</p>
              </div>
            </>
          ) : null}
        </div>

        {showDashboardSearchCenter ? (
          <div className="shell-topbar-search-center">{searchField}</div>
        ) : null}

        <div className="shell-topbar-actions">
          {showTopBarSearch ? (
            <div
              ref={searchWrapRef}
              className={`shell-topbar-search-mobile flex items-center transition-all duration-200 ease-out ${
                searchExpanded ? "mr-auto w-[min(100vw-8rem,320px)] flex-1 lg:w-auto lg:flex-none" : ""
              }`}
            >
              {searchExpanded ? (
                searchField
              ) : (
                <ShellHeaderActionButton
                  onClick={openSearch}
                  className="shell-topbar-search-btn"
                  aria-label={t("common.search")}
                >
                  <ShellHeaderActionAvatar icon>
                    <Search className="h-4 w-4" aria-hidden="true" />
                  </ShellHeaderActionAvatar>
                </ShellHeaderActionButton>
              )}
            </div>
          ) : null}

          <ShellHeaderActionButton
            onClick={onNotificationsClick}
            className="shell-topbar-notifications-btn"
            aria-label={
              unread > 0
                ? t("shell.unreadNotificationsShort", { count: unread })
                : t("common.notifications")
            }
            badge={unread}
            badgeLabel={
              unread > 0 ? t("shell.unreadNotifications", { count: unread }) : undefined
            }
          >
            <ShellHeaderActionAvatar icon>
              <Bell className="h-4 w-4" aria-hidden="true" />
            </ShellHeaderActionAvatar>
          </ShellHeaderActionButton>

          {onProfileToggle ? (
            <ShellHeaderActionButton
              onClick={onProfileToggle}
              aria-label={
                mobileProfileOpen ? t("profile.closeProfile") : t("profile.openProfile")
              }
              aria-pressed={mobileProfileOpen}
              className={[
                mobileProfileOpen ? "shell-topbar-action-chip--active" : "",
                "shell-topbar-action-chip--athlete-avatar",
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
                  {isAthleteDashboard ? fullName : t("common.profile")}
                </span>
                {isAthleteDashboard ? (
                  <span className="shell-topbar-action-sublabel hidden lg:block">
                    {t("common.athlete")}
                  </span>
                ) : null}
              </span>
            </ShellHeaderActionButton>
          ) : (
            <ShellHeaderActionLink
              href="/profile"
              aria-label={t("common.profile")}
              className={isCoachDashboard ? "shell-topbar-action-chip--athlete-avatar" : undefined}
            >
              <ShellHeaderActionAvatar>{initials || "LC"}</ShellHeaderActionAvatar>
              <span
                className={`shell-topbar-action-copy min-w-0${
                  isAthleteDashboard ? " hidden lg:block" : ""
                }`}
              >
                <span className="shell-topbar-action-label block truncate">
                  <span className="lg:hidden">{t("common.profile")}</span>
                  <span className="hidden lg:inline">{firstName}</span>
                </span>
              </span>
            </ShellHeaderActionLink>
          )}
        </div>
      </div>
    </header>
  );
}
