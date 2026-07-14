"use client";

import type { ReactNode } from "react";
import AppShell from "@/components/AppShell";

type AppShellRouteLoadingProps = {
  children: ReactNode;
  contentClassName?: string;
};

export default function AppShellRouteLoading({
  children,
  contentClassName = "flex-1 px-4 pb-16 pt-2 md:px-6 md:pt-3",
}: AppShellRouteLoadingProps) {
  return <AppShell contentClassName={contentClassName}>{children}</AppShell>;
}
