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

const ATHLETE_ROUTES = [
  "/dashboard",
  "/programs",
  "/chat",
  "/profile",
  "/data",
  "/leaderboard",
  "/merch",
  "/meet-week",
  "/invulscore",
] as const;

export function usePrefetchAppRoutes(role: string | null | undefined) {
  const router = useRouter();

  useEffect(() => {
    const routes = isCoachLikeRole(role)
      ? COACH_ROUTES
      : role === "atleet"
        ? ATHLETE_ROUTES
        : COACH_ROUTES;

    for (const href of routes) {
      router.prefetch(href);
    }
  }, [router, role]);
}
