"use client";

import type { ReactNode } from "react";
import RouteLoadingShell from "@/components/loading/RouteLoadingShell";

type AppShellRouteLoadingProps = {
  children: ReactNode;
  contentClassName?: string;
  hideBottomNav?: boolean;
  hideMobileTopBar?: boolean;
};

export default function AppShellRouteLoading({
  children,
  hideBottomNav,
  hideMobileTopBar,
}: AppShellRouteLoadingProps) {
  return (
    <RouteLoadingShell hideBottomNav={hideBottomNav} hideMobileTopBar={hideMobileTopBar}>
      {children}
    </RouteLoadingShell>
  );
}
