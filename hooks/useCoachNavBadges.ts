"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { isAdminRole } from "@/lib/authRoles";
import { countCoachTodosDueToday } from "@/lib/todoDueToday";
import { COACH_TODOS_CHANGED_EVENT, loadCoachTodosFast } from "@/lib/coachTodos";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getUnreadMessageCount,
} from "@/lib/chatUnread";
import { supabase } from "@/lib/supabaseClient";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults, ATHLETE_QUERY_STALE_MS } from "@/lib/queryOptions";

export type CoachNavBadges = {
  chat: number;
  todo: number;
  videoReview: number;
  pendingAthletes: number;
};

const EMPTY_BADGES: CoachNavBadges = {
  chat: 0,
  todo: 0,
  videoReview: 0,
  pendingAthletes: 0,
};

async function loadCoachNavBadgesFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  role: string,
): Promise<CoachNavBadges> {
  const isAdmin = isAdminRole(role);

  const [todos, chat, pendingResult, videoResult] = await Promise.all([
    queryClient.fetchQuery({
      queryKey: queryKeys.coachTodos(userId, role),
      queryFn: async () => {
        const { data, error } = await loadCoachTodosFast(userId, { isAdmin });
        if (error) throw error;
        return data;
      },
      staleTime: ATHLETE_QUERY_STALE_MS,
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.notificationCount(userId, role),
      queryFn: () => getUnreadMessageCount(userId),
      staleTime: ATHLETE_QUERY_STALE_MS,
    }),
    isAdmin
      ? supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "pending")
      : supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("role", "pending")
          .eq("coach_id", userId),
    supabase
      .from("video_reviews")
      .select("*", { count: "exact", head: true })
      .eq("coach_id", userId)
      .eq("status", "pending"),
  ]);

  return {
    chat,
    todo: countCoachTodosDueToday(todos),
    videoReview: videoResult.count || 0,
    pendingAthletes: pendingResult.count || 0,
  };
}

export function useCoachNavBadges(userId: string | null, role: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.coachNavBadges(userId || "", role),
    queryFn: () => loadCoachNavBadgesFromCache(queryClient, userId!, role),
    enabled: Boolean(userId && role),
    ...athleteQueryDefaults,
  });

  useEffect(() => {
    if (!userId || !role) return;
    const coachId = userId;

    function invalidate() {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coachNavBadges(coachId, role),
      });
    }

    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, invalidate);
    window.addEventListener(COACH_TODOS_CHANGED_EVENT, invalidate);
    window.addEventListener("focus", invalidate);

    return () => {
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, invalidate);
      window.removeEventListener(COACH_TODOS_CHANGED_EVENT, invalidate);
      window.removeEventListener("focus", invalidate);
    };
  }, [queryClient, role, userId]);

  if (!userId || !role) {
    return EMPTY_BADGES;
  }

  return query.data ?? EMPTY_BADGES;
}
