"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isCoachLikeRole } from "@/lib/authRoles";
import { prefetchAthleteCoachChatPreview } from "@/hooks/useAthleteCoachChatPreview";
import { prefetchAthleteFillScore } from "@/hooks/useAthleteFillScore";
import {
  getCachedAthleteProgramHref,
  prefetchAthleteProgramEntry,
} from "@/hooks/useAthleteProgramEntry";
import { prefetchChatOverview } from "@/hooks/useChatOverview";
import { prefetchCoachCalendarEvents } from "@/hooks/useCoachCalendarEvents";
import { prefetchCoachTodos } from "@/hooks/useCoachTodosQuery";
import { prefetchNotificationCount } from "@/hooks/useNotificationCount";
import { prefetchTeamEngagementScore } from "@/hooks/useTeamEngagementScore";
import { prefetchProgramWeekFromHref } from "@/lib/prefetchProgramWeekFromHref";
import { readAthleteProgramHrefSession } from "@/lib/programEntrySessionCache";

export function usePrefetchAppData(
  userId: string,
  role: string,
  fullName: string,
  enabled: boolean,
) {
  const queryClient = useQueryClient();
  const prefetchedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !userId || !role || prefetchedRef.current) return;
    prefetchedRef.current = true;

    void (async () => {
      if (role === "atleet") {
        await Promise.all([
          prefetchAthleteProgramEntry(queryClient, userId, userId),
          prefetchAthleteFillScore(queryClient, userId, fullName),
          prefetchAthleteCoachChatPreview(queryClient, userId),
          prefetchNotificationCount(queryClient, userId, role),
          prefetchChatOverview(queryClient, userId, role),
          void import("@/components/chat/ChatApp"),
        ]);

        const href =
          getCachedAthleteProgramHref(queryClient, userId, userId) ??
          readAthleteProgramHrefSession();

        if (href && href !== "/programs") {
          await prefetchProgramWeekFromHref(queryClient, href, {
            userId,
            role,
          });
        }
        return;
      }

      if (isCoachLikeRole(role)) {
        await Promise.all([
          prefetchNotificationCount(queryClient, userId, role),
          prefetchChatOverview(queryClient, userId, role),
          prefetchCoachCalendarEvents(queryClient, userId),
          prefetchCoachTodos(queryClient, userId),
          prefetchTeamEngagementScore(queryClient, userId, role),
          void import("@/components/chat/ChatApp"),
        ]);
      }
    })();
  }, [enabled, fullName, queryClient, role, userId]);
}
