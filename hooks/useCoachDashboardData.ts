"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { loadCoachDashboardData } from "@/lib/coachDashboardLoader";
import { COACH_TODOS_CHANGED_EVENT, refreshCoachAutoTodos } from "@/lib/coachTodos";
import { CHAT_UNREAD_CHANGED_EVENT } from "@/lib/chatUnread";
import { processDueBroadcasts } from "@/lib/scheduledBroadcasts";
import { schedulePeriodizationAlertDetection } from "@/lib/periodizationAlertScheduler";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

export function useCoachDashboardData(
  userId: string,
  role: string,
  enabled = true,
) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.coachDashboard(userId, role),
    queryFn: () => loadCoachDashboardData(userId, role, queryClient),
    enabled: enabled && Boolean(userId && role),
    ...athleteQueryDefaults,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled || !userId || !role) return;

    function invalidateDashboard() {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.coachDashboard(userId, role),
      });
    }

    window.addEventListener(COACH_TODOS_CHANGED_EVENT, invalidateDashboard);
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, invalidateDashboard);

    return () => {
      window.removeEventListener(COACH_TODOS_CHANGED_EVENT, invalidateDashboard);
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, invalidateDashboard);
    };
  }, [enabled, queryClient, role, userId]);

  useEffect(() => {
    if (!enabled || !userId || !role || !query.isSuccess) return;

    void refreshCoachAutoTodos(userId, role === "admin");
    void processDueBroadcasts(userId);
    schedulePeriodizationAlertDetection(userId, role);
  }, [enabled, query.isSuccess, role, userId]);

  return query;
}
