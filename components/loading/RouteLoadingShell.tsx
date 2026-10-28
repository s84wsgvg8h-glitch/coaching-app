"use client";

import type { ReactNode } from "react";
import AthleteRouteLoadingShell from "@/components/mobile/AthleteRouteLoadingShell";
import { Skeleton } from "@/components/ui/Skeleton";

type RouteLoadingShellProps = {
  children: ReactNode;
  hideBottomNav?: boolean;
  hideMobileTopBar?: boolean;
};

/** Lightweight route loading chrome — no prefetch hooks or full AppShell remount. */
export default function RouteLoadingShell({
  children,
  hideBottomNav = false,
  hideMobileTopBar = false,
}: RouteLoadingShellProps) {
  return (
    <>
      <div className="lg:hidden">
        <AthleteRouteLoadingShell
          hideBottomNav={hideBottomNav}
          hideMobileTopBar={hideMobileTopBar}
        >
          {children}
        </AthleteRouteLoadingShell>
      </div>
      <div className="hidden min-h-0 flex-1 flex-col lg:flex">
        <div className="flex min-h-0 flex-1 flex-col bg-app-bg">
          <div className="hidden shrink-0 border-b border-app-border px-4 py-3 lg:block">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-8 w-40 rounded-lg" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
              </div>
            </div>
          </div>
          <div className="app-page-content flex-1 px-4 py-3 md:px-6">{children}</div>
        </div>
      </div>
    </>
  );
}
