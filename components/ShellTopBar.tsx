"use client";

import { Bell } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useLocale } from "@/components/LocaleProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import { isProfileOpen } from "@/lib/athleteProfileNavigation";
import PageBackButton from "@/components/ui/PageBackButton";
import {
  ShellHeaderActionAvatar,
  ShellHeaderActionButton,
  ShellHeaderActionLink,
} from "@/components/ui/ShellHeaderActionChip";
import {
  dashboardFirstName,
  getDashboardGreeting,
} from "@/lib/dashboardGreeting";
import { getPageTitle } from "@/lib/navigation";
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
  onSearchClick: _onSearchClick,
  onNotificationsClick,
  notificationCount = 0,
  className = "",
  mobileProfileOpen = false,
  onProfileToggle,
}: ShellTopBarProps) {
  const pathname = usePathname();
  const { profile, userId, role } = useAuth();
  const { t } = useLocale();
  const isCoachDashboard = pathname === "/dashboard" && isCoachLikeRole(role);
  const isAthleteDashboard = pathname === "/dashboard" && role === "atleet";
  const isMobileProfilePage = isProfileOpen(pathname);
  const showCoachPageTitle =
    isCoachLikeRole(role) &&
    !isCoachDashboard &&
    !isAthleteDashboard &&
    !isMobileProfilePage;
  const pageTitle = showCoachPageTitle
    ? getPageTitle(pathname, role || "coach")
    : null;
  const fullName = profile?.full_name || "Profiel";
  const firstName = dashboardFirstName(fullName);
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const [unread, setUnread] = useState(notificationCount);
  const { data: cachedUnread } = useNotificationCount(
    userId,
    role,
    Boolean(userId && role),
  );

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

  return (
    <header
      className={`shell-topbar z-30 shrink-0${
        isAthleteDashboard ? " shell-topbar--athlete-dashboard" : ""
      }${isCoachDashboard ? " shell-topbar--coach-dashboard" : ""}${
        showCoachPageTitle ? " shell-topbar--page-title" : ""
      }${className ? ` ${className}` : ""}`}
    >
      <div className="shell-topbar-inner">
        <div className="shell-topbar-leading flex min-w-0 items-center gap-1.5">
          {showCoachPageTitle && pageTitle ? (
            <h1 className="shell-topbar-page-title truncate">{pageTitle}</h1>
          ) : !isCoachDashboard &&
            !isAthleteDashboard &&
            !isMobileProfilePage ? (
            <Suspense fallback={null}>
              <PageBackButton variant="topbar" />
            </Suspense>
          ) : null}
          {isMobileProfilePage ? (
            <h1 className="shell-topbar-athlete-title truncate">
              {t("profile.title")}
            </h1>
          ) : null}
          {isAthleteDashboard ? (
            <div className="shell-topbar-dashboard-greeting shell-topbar-athlete-greeting min-w-0">
              <p className="shell-topbar-dashboard-greeting-title shell-topbar-athlete-greeting-hey">
                Hey {firstName} 👋
              </p>
            </div>
          ) : null}
          {isCoachDashboard ? (
            <div className="shell-topbar-dashboard-greeting min-w-0 lg:hidden">
              <p className="shell-topbar-dashboard-greeting-title">
                {getDashboardGreeting()}, {firstName} 👋
              </p>
            </div>
          ) : null}
        </div>

        <div className="shell-topbar-actions">
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
              unread > 0
                ? t("shell.unreadNotifications", { count: unread })
                : undefined
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
                mobileProfileOpen
                  ? t("profile.closeProfile")
                  : t("profile.openProfile")
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
              className={
                isCoachDashboard
                  ? "shell-topbar-action-chip--athlete-avatar"
                  : undefined
              }
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
