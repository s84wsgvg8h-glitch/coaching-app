"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadChatOverview, type ChatOverviewData } from "@/lib/chatOverviewLoader";
import { CHAT_UNREAD_CHANGED_EVENT } from "@/lib/chatUnread";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

export function useChatOverview(userId: string, role: string, enabled = true) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.chatOverview(userId, role),
    queryFn: () => loadChatOverview(userId, role, { skipUnreadCounts: true }),
    enabled: enabled && Boolean(userId && role),
    initialData: () =>
      userId && role
        ? queryClient.getQueryData<ChatOverviewData>(
            queryKeys.chatOverview(userId, role),
          )
        : undefined,
    ...athleteQueryDefaults,
  });

  useEffect(() => {
    if (!userId || !role) return;

    function handleUnreadChanged() {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.chatOverview(userId, role),
      });
    }

    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, handleUnreadChanged);
    return () =>
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, handleUnreadChanged);
  }, [queryClient, role, userId]);

  return query;
}

export function prefetchChatOverview(
  queryClient: ReturnType<typeof useQueryClient>,
  userId: string,
  role: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.chatOverview(userId, role),
    queryFn: () => loadChatOverview(userId, role, { skipUnreadCounts: true }),
    ...athleteQueryDefaults,
  });
}
