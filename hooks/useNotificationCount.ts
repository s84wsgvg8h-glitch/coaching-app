"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAthleteNotificationCount,
  getUnreadMessageCount,
  CHAT_UNREAD_CHANGED_EVENT,
} from "@/lib/chatUnread";
import { isCoachLikeRole } from "@/lib/authRoles";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

async function fetchNotificationCount(userId: string, role: string) {
  if (isCoachLikeRole(role)) {
    return getUnreadMessageCount(userId);
  }
  return getAthleteNotificationCount(userId);
}

export function useNotificationCount(
  userId: string,
  role: string,
  enabled = true,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notificationCount(userId, role),
    queryFn: () => fetchNotificationCount(userId, role),
    enabled: enabled && Boolean(userId && role),
    ...athleteQueryDefaults,
  });

  useEffect(() => {
    if (!userId || !role) return;

    function handleUnreadChanged() {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.notificationCount(userId, role),
      });
    }

    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, handleUnreadChanged);
    return () =>
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, handleUnreadChanged);
  }, [queryClient, role, userId]);

  return query;
}

export function prefetchNotificationCount(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  role: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.notificationCount(userId, role),
    queryFn: () => fetchNotificationCount(userId, role),
    ...athleteQueryDefaults,
  });
}
