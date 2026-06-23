"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DemoModeBanner from "@/components/DemoModeBanner";
import DemoPagesPanel from "@/components/DemoPagesPanel";
import CoachMobileBottomNav from "@/components/coach/CoachMobileBottomNav";
import MobileBottomNav from "@/components/MobileBottomNav";
import SystemBanner from "@/components/SystemBanner";
import CommandPalette, {
  useCommandPaletteHotkey,
} from "@/components/dashboard/CommandPalette";
import NotificationPanel from "@/components/dashboard/NotificationPanel";
import ShellTopBar from "@/components/ShellTopBar";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import { runUiMigrationIfNeeded } from "@/lib/uiMigration";
import { isDemoMode } from "@/lib/demo/demoMode";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

const CHROMELESS_PREFIXES = ["/login", "/signup", "/intake"];

export default function AppShell({
  children,
  className = "min-h-[100dvh] bg-app-bg",
  contentClassName = "app-page-content px-2 md:px-3 lg:px-4",
}: AppShellProps) {
  const pathname = usePathname();
  const { role } = useAuth();
  const showAthleteNav = role === "atleet";
  const showCoachNav = isCoachLikeRole(role);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const hideChrome = CHROMELESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const hideBottomNav = hideChrome || pathname.startsWith("/chat");
  const isChatRoute = pathname.startsWith("/chat");
  const hideFloatingChrome = hideBottomNav;
  const mobileBottomPad =
    hideBottomNav
      ? ""
      : showAthleteNav || showCoachNav
        ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-6"
        : "pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:pb-6";

  useCommandPaletteHotkey(() => {
    if (showAthleteNav) return;
    setCommandOpen(true);
  });

  useEffect(() => {
    runUiMigrationIfNeeded();
    setDemoMode(isDemoMode());
  }, []);

  useEffect(() => {
    setDemoMode(isDemoMode());
  }, [pathname]);

  useEffect(() => {
    setNotificationOpen(false);
  }, [pathname]);

  return (
    <main
      className={`app-shell relative ${className} lg:flex lg:h-[100dvh] lg:min-h-0 lg:flex-col lg:overflow-hidden`}
    >
      <div className="app-shell-glow pointer-events-none" aria-hidden="true" />
      {!hideFloatingChrome ? (
        <>
          <ShellTopBar
            onSearchClick={() => setCommandOpen(true)}
            onNotificationsClick={() => setNotificationOpen((value) => !value)}
          />
          <NotificationPanel
            open={notificationOpen}
            onClose={() => setNotificationOpen(false)}
          />
        </>
      ) : null}
      <section
        className={`mobile-scroll relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto ${mobileBottomPad} ${contentClassName}`}
      >
        {demoMode && !hideBottomNav ? (
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
            <SystemBanner />
            <DemoModeBanner />
            {showAthleteNav && !isChatRoute ? (
              <div className="athlete-app-layout min-w-0 flex-1">{children}</div>
            ) : (
              children
            )}
          </>
        )}
      </section>
      {!hideBottomNav && showAthleteNav ? <MobileBottomNav /> : null}
      {!hideBottomNav && showCoachNav ? <CoachMobileBottomNav /> : null}
      {!hideChrome && !showAthleteNav ? (
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      ) : null}
    </main>
  );
}
