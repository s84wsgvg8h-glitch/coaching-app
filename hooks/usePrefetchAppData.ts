"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isCoachLikeRole } from "@/lib/authRoles";
import { prefetchAthleteCoachChatPreview } from "@/hooks/useAthleteCoachChatPreview";
import { prefetchAthleteFillScore } from "@/hooks/useAthleteFillScore";
import {
  getCachedAthleteProgramHref,
  prefetchAthleteProgramEntry,
  prefetchCoachAthleteProgramEntries,
} from "@/hooks/useAthleteProgramEntry";
import { prefetchChatOverview } from "@/hooks/useChatOverview";
import { prefetchCoachCalendarEvents } from "@/hooks/useCoachCalendarEvents";
import { prefetchCoachTodos } from "@/hooks/useCoachTodosQuery";
import { prefetchNotificationCount } from "@/hooks/useNotificationCount";
import { prefetchTeamEngagementScore } from "@/hooks/useTeamEngagementScore";
import { getCoachLastAthleteId } from "@/lib/coachLastAthlete";
import { loadCoachProgramAthletes } from "@/lib/coachProgramAthletes";
import { prefetchProgramWeekFromHref, parseProgramWeekHref } from "@/lib/prefetchProgramWeekFromHref";
import {
  cacheAllWeeksForBlock,
  cacheAthleteProgramsOffline,
} from "@/lib/programWeekCoreClient";
import { readAthleteProgramHrefSession } from "@/lib/programEntrySessionCache";
import { queryKeys } from "@/lib/queryKeys";
import { getRealSupabase } from "@/lib/supabaseClient";

function scheduleIdlePrefetch(callback: () => void) {
  if (typeof window === "undefined") return;

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(() => callback(), { timeout: 4000 });
    return;
  }

  globalThis.setTimeout(callback, 1500);
}

async function prefetchAthleteProfile(userId: string) {
  const client = getRealSupabase();
  const { PROFILE_DETAILS_SELECT } = await import("@/lib/profileDetails");
  const { data } = await client
    .from("profiles")
    .select(PROFILE_DETAILS_SELECT)
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    return data;
  }

  return null;
}

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

        void prefetchAthleteProfile(userId);

        const href =
          getCachedAthleteProgramHref(queryClient, userId, userId) ??
          readAthleteProgramHrefSession();

        if (href && href !== "/programs") {
          await prefetchProgramWeekFromHref(queryClient, href, {
            userId,
            role,
          });
          const parsed = parseProgramWeekHref(href);
          if (parsed) {
            void cacheAllWeeksForBlock(parsed.blockId, { userId, role });
          }
          void cacheAthleteProgramsOffline(userId, { userId, role });
        }

        scheduleIdlePrefetch(() => {
          void import("@/app/kennisbank/page");
          void import("@/app/statistics/page");
          void import("@/app/leaderboard/page");
        });

        return;
      }

      if (isCoachLikeRole(role)) {
        await Promise.all([
          prefetchNotificationCount(queryClient, userId, role),
          prefetchChatOverview(queryClient, userId, role),
          prefetchCoachCalendarEvents(queryClient, userId),
          prefetchCoachTodos(queryClient, userId, role),
          prefetchTeamEngagementScore(queryClient, userId, role),
          void import("@/components/chat/ChatApp"),
          void import("@/app/programs/page"),
        ]);

        scheduleIdlePrefetch(() => {
          void (async () => {
            const athletes = await loadCoachProgramAthletes(userId);
            queryClient.setQueryData(
              queryKeys.coachProgramAthletes(userId),
              athletes,
            );

            const lastAthleteId = getCoachLastAthleteId();
            const prefetchIds = [
              ...(lastAthleteId ? [lastAthleteId] : []),
              ...athletes.map((athlete) => athlete.id),
            ];

            await prefetchCoachAthleteProgramEntries(
              queryClient,
              userId,
              prefetchIds,
            );

            if (lastAthleteId) {
              const href = getCachedAthleteProgramHref(
                queryClient,
                lastAthleteId,
                userId,
              );
              if (href && href !== "/programs") {
                await prefetchProgramWeekFromHref(queryClient, href, {
                  userId,
                  role,
                });
                const parsed = parseProgramWeekHref(href);
                if (parsed) {
                  void cacheAllWeeksForBlock(parsed.blockId, { userId, role });
                }
                void cacheAthleteProgramsOffline(lastAthleteId, {
                  userId,
                  role,
                });
              }
            }
          })();

          void import("@/app/athletes/page");
          void import("@/app/agenda/page");
        });
      }
    })();
  }, [enabled, fullName, queryClient, role, userId]);
}
