"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { isCoachLikeRole } from "@/lib/authRoles";

const COACH_ROUTES = [
  "/dashboard",
  "/athletes",
  "/chat",
  "/todo",
  "/programs",
] as const;

const ATHLETE_CRITICAL_ROUTES = [
  "/dashboard",
  "/programs",
  "/chat",
  "/profile",
] as const;

const ATHLETE_IDLE_ROUTES = [
  "/data",
  "/leaderboard",
  "/merch",
  "/meet-week",
  "/invulscore",
] as const;

function prefetchWhenIdle(callback: () => void) {
  if (typeof window === "undefined") return;

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(callback, { timeout: 2500 });
    return;
  }

  globalThis.setTimeout(callback, 1200);
}

export function usePrefetchAppRoutes(role: string | null | undefined) {
  const router = useRouter();

  useEffect(() => {
    const routes = isCoachLikeRole(role)
      ? COACH_ROUTES
      : role === "atleet"
        ? ATHLETE_CRITICAL_ROUTES
        : COACH_ROUTES;

    for (const href of routes) {
      router.prefetch(href);
    }

    if (role !== "atleet") return;

    prefetchWhenIdle(() => {
      for (const href of ATHLETE_IDLE_ROUTES) {
        router.prefetch(href);
      }
    });
  }, [router, role]);
}
