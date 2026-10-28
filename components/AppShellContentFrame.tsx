"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import MobilePullToRefreshInner from "@/components/mobile/MobilePullToRefreshInner";
import { useMobilePullToRefresh } from "@/hooks/useMobilePullToRefresh";
import { isMobilePullToRefreshPath } from "@/lib/mobilePullToRefresh";

type AppShellContentFrameProps = {
  topBar: ReactNode;
  notificationPanel: ReactNode;
  pageContent: ReactNode;
  contentClassName: string;
  reserveBottomNav: boolean;
  isAthleteDashboard: boolean;
  isProfileMobileRoute: boolean;
  hideMobileTopBar?: boolean;
};

/** Single scroll mount for mobile + desktop — avoids rendering page content twice. */
export default function AppShellContentFrame({
  topBar,
  notificationPanel,
  pageContent,
  contentClassName,
  reserveBottomNav,
  isAthleteDashboard,
  isProfileMobileRoute,
  hideMobileTopBar = false,
}: AppShellContentFrameProps) {
  const pathname = usePathname();
  const bodyRef = useRef<HTMLDivElement>(null);

  const ptrEnabled = isMobilePullToRefreshPath(pathname);
  const { pullDistance, isRefreshing, contentStyle, threshold } =
    useMobilePullToRefresh({
      scrollRef: bodyRef,
      enabled: ptrEnabled,
    });

  const shellClass = [
    "mobile-page-shell app-shell-content-frame flex min-h-0 flex-1 flex-col",
    reserveBottomNav ? "mobile-page-shell--reserve-bottom-nav" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const bodyClass = [
    "mobile-page-shell__body mobile-page-shell__body--scroll",
    "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden",
    "lg:mobile-scroll lg:overflow-y-auto md:lg:pb-6",
    contentClassName,
    isAthleteDashboard ? "app-page-content--athlete-dashboard-mobile" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const pageContentWrapped = isProfileMobileRoute ? (
    <div className="app-page-content app-page-content--profile-mobile min-w-0">
      {pageContent}
    </div>
  ) : (
    pageContent
  );

  const bodyInner = ptrEnabled ? (
    <MobilePullToRefreshInner
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      contentStyle={contentStyle}
      threshold={threshold}
    >
      {pageContentWrapped}
    </MobilePullToRefreshInner>
  ) : (
    pageContentWrapped
  );

  return (
    <>
      {notificationPanel}
      <div className={shellClass}>
        {hideMobileTopBar ? (
          <div className="mobile-safe-top bg-app-bg lg:hidden" aria-hidden="true" />
        ) : topBar ? (
          <div className="mobile-page-shell__header lg:hidden">{topBar}</div>
        ) : null}
        {topBar ? <div className="hidden shrink-0 lg:block">{topBar}</div> : null}
        <div ref={bodyRef} className={bodyClass}>
          {bodyInner}
        </div>
      </div>
    </>
  );
}
