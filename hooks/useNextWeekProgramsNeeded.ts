"use client";

import { useQuery } from "@tanstack/react-query";
import { loadAthletesNeedingProgramNextWeek } from "@/lib/coachProgramAlerts";
import { queryKeys } from "@/lib/queryKeys";
import { athleteQueryDefaults } from "@/lib/queryOptions";

export function useNextWeekProgramsNeeded(coachId: string, isAdmin: boolean) {
  return useQuery({
    queryKey: queryKeys.nextWeekProgramsNeeded(coachId, isAdmin),
    queryFn: () => loadAthletesNeedingProgramNextWeek(coachId, isAdmin),
    enabled: Boolean(coachId),
    ...athleteQueryDefaults,
  });
}
