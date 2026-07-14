"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  loadCoachCalendarEvents,
  type CoachCalendarEvent,
} from "@/lib/coachCalendarEvents";
import { athleteQueryDefaults } from "@/lib/queryOptions";
import { queryKeys } from "@/lib/queryKeys";

export function useCoachCalendarEvents(coachId: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.coachCalendarEvents(coachId),
    queryFn: () => loadCoachCalendarEvents(coachId),
    enabled: enabled && Boolean(coachId),
    ...athleteQueryDefaults,
  });
}

export function prefetchCoachCalendarEvents(
  queryClient: ReturnType<typeof useQueryClient>,
  coachId: string,
) {
  return queryClient.prefetchQuery({
    queryKey: queryKeys.coachCalendarEvents(coachId),
    queryFn: () => loadCoachCalendarEvents(coachId),
    ...athleteQueryDefaults,
  });
}

export type { CoachCalendarEvent };
