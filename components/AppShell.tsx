"use client";

import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DemoModeBanner from "@/components/DemoModeBanner";
import DemoPagesPanel from "@/components/DemoPagesPanel";
import CoachAppSidebar from "@/components/coach/CoachAppSidebar";
import AthleteAppSidebar from "@/components/athlete/AthleteAppSidebar";
import CoachMobileBottomNav from "@/components/coach/CoachMobileBottomNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import AppShellContentFrame from "@/components/AppShellContentFrame";
import SystemBanner from "@/components/SystemBanner";
import AppToastHost from "@/components/ui/AppToastHost";
import NotificationPanel from "@/components/dashboard/NotificationPanel";
import ShellTopBar from "@/components/ShellTopBar";
import { useAuth } from "@/components/AuthProvider";
import { useCommandPaletteHotkey } from "@/hooks/useCommandPaletteHotkey";
import { usePrefetchAppRoutes } from "@/hooks/usePrefetchAppRoutes";
import { usePrefetchAppData } from "@/hooks/usePrefetchAppData";
import { useCoachAutoTodoSync } from "@/hooks/useCoachAutoTodoSync";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  getAthleteProfileReturn,
  isProfileOpen,
  saveAthleteProfileReturn,
} from "@/lib/athleteProfileNavigation";
import { runUiMigrationIfNeeded } from "@/lib/uiMigration";
import { isDemoMode } from "@/lib/demo/demoMode";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import { isActiveChatConversation } from "@/components/chat/chatAppRoute";
import { shouldHideMobileTopBar } from "@/lib/mobileShellRoutes";

const CommandPalette = dynamic(
  () => import("@/components/dashboard/CommandPalette"),
  { ssr: false },
);

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

const CHROMELESS_PREFIXES = ["/login", "/signup", "/intake"];

export default function AppShell({
  children,
  className = "bg-app-bg",
  contentClassName = "app-page-content px-2 md:px-3 lg:px-4",
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, userId, profile, loading: authLoading } = useAuth();
  usePrefetchAppRoutes(role);
  usePrefetchAppData(
    userId,
    role,
    profile?.full_name || "",
    !authLoading && Boolean(userId && role),
  );
  const showAthleteNav = role === "atleet";
  const showCoachNav = isCoachLikeRole(role);
  useCoachAutoTodoSync(
    showCoachNav && userId ? userId : null,
    role === "admin",
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const hideChrome = CHROMELESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const hideBottomNav =
    hideChrome || (pathname.startsWith("/chat") && isActiveChatConversation(pathname));
  const isChatRoute = pathname.startsWith("/chat");
  const hideFloatingChrome = hideChrome || isChatRoute;
  const showCoachSidebar = showCoachNav && !hideChrome;
  const showAthleteSidebar = showAthleteNav && !hideChrome;
  const isAthleteDashboard = pathname === "/dashboard" && showAthleteNav;
  const isCoachDashboard = pathname === "/dashboard" && showCoachNav;
  const useMobilePageShell =
    (showAthleteNav || showCoachNav) && !hideChrome && !isChatRoute;
  const isProfileMobileOpen = isProfileOpen(pathname);
  const isProfileMobileRoute =
    useMobilePageShell &&
    (pathname === "/profile" || pathname.startsWith("/profile/"));
  const hideMobileTopBar = shouldHideMobileTopBar(pathname, role);

  useCommandPaletteHotkey(() => {
    if (!showCoachNav && !showAthleteNav) return;
    setCommandOpen(true);
  });

  useEffect(() => {
    runUiMigrationIfNeeded();
    deferEffectUpdate(() => {
      setDemoMode(isDemoMode());
    });
  }, []);

  useEffect(() => {
    deferEffectUpdate(() => {
      setDemoMode(isDemoMode());
    });
  }, [pathname]);

  useEffect(() => {
    deferEffectUpdate(() => {
      setNotificationOpen(false);
    });
  }, [pathname]);

  const topBar =
    !hideFloatingChrome ? (
      <ShellTopBar
        onSearchClick={() => setCommandOpen(true)}
        onNotificationsClick={() => setNotificationOpen((value) => !value)}
        mobileProfileOpen={isProfileMobileOpen}
        onProfileToggle={
          showAthleteNav || showCoachNav
            ? () => {
                if (isProfileMobileOpen) {
                  router.push(getAthleteProfileReturn());
                } else {
                  saveAthleteProfileReturn(pathname);
                  router.push("/profile");
                }
              }
            : undefined
        }
      />
    ) : null;

  const notificationPanel =
    !hideFloatingChrome ? (
      <NotificationPanel
        open={notificationOpen}
        onClose={() => setNotificationOpen(false)}
      />
    ) : null;

  const pageContent =
    demoMode && !hideBottomNav ? (
      <div className="mx-auto flex w-full max-w-[1800px] min-w-0 flex-1 gap-4">
        <DemoPagesPanel />
        <div className="min-w-0 flex-1">
          <SystemBanner />
          <DemoModeBanner />
          {showAthleteNav && !isChatRoute ? (
            <div className="athlete-app-layout min-w-0">{children}</div>
          ) : (
            children
          )}
        </div>
      </div>
    ) : (
      <>
        {!isChatRoute ? <SystemBanner /> : null}
        {!isChatRoute ? <DemoModeBanner /> : null}
        {showAthleteNav && !isChatRoute ? (
          <div className="athlete-app-layout min-w-0 flex-1">
            {children}
          </div>
        ) : showCoachNav && isProfileMobileRoute && !isChatRoute ? (
          <div className="athlete-app-layout min-w-0 flex-1">{children}</div>
        ) : (
          children
        )}
      </>
    );

  const coachDesktopContent = (
    <>
      {topBar}
      {notificationPanel}
      <section
        className={`mobile-scroll relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto md:pb-6 ${contentClassName}`}
      >
        {pageContent}
      </section>
    </>
  );

  return (
    <main
      id="main-content"
      className={`app-shell flex min-h-0 flex-1 flex-col ${className}${
        isAthleteDashboard ? " app-shell--athlete-dashboard-mobile" : ""
      }${isCoachDashboard ? " app-shell--coach-dashboard-mobile" : ""}${
        isProfileMobileOpen ? " app-shell--athlete-profile-mobile" : ""
      }${isProfileMobileRoute ? " app-shell--profile-mobile" : ""}${
        isChatRoute && (showCoachSidebar || showAthleteSidebar)
          ? " app-shell--chat-with-sidebar"
          : ""
      } lg:relative lg:flex lg:h-[100dvh] lg:min-h-0 lg:flex-none lg:overflow-hidden`}
    >
      <div className="app-shell-glow pointer-events-none" aria-hidden="true" />
      <div
        className={`flex min-h-0 min-w-0 flex-1 flex-col ${
          showCoachSidebar
            ? "lg:flex-row premium-coach-ui"
            : showAthleteSidebar
              ? "lg:flex-row premium-coach-ui premium-athlete-ui"
              : ""
        }`}
      >
        {showCoachSidebar ? <CoachAppSidebar /> : null}
        {showAthleteSidebar ? <AthleteAppSidebar /> : null}

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {useMobilePageShell ? (
            <AppShellContentFrame
              topBar={topBar}
              notificationPanel={notificationPanel}
              pageContent={pageContent}
              contentClassName={contentClassName}
              reserveBottomNav={!hideBottomNav}
              isAthleteDashboard={isAthleteDashboard}
              isProfileMobileRoute={isProfileMobileRoute}
              hideMobileTopBar={hideMobileTopBar}
            />
          ) : (
            coachDesktopContent
          )}
        </div>
      </div>

      {!hideBottomNav && showAthleteNav ? <MobileBottomNav /> : null}
      {!hideBottomNav && showCoachNav ? <CoachMobileBottomNav /> : null}
      {!hideChrome && (showCoachNav || showAthleteNav) && commandOpen ? (
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      ) : null}
      <AppToastHost />
    </main>
  );
}
