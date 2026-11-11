"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  buildCommandItems,
  filterCommandItems,
  loadCommandPaletteData,
  type CommandAthleteDetail,
  type CommandItem,
  type CommandProgramRow,
} from "@/lib/commandPaletteSearch";
import { prefetchCoachAthleteProgramEntries } from "@/hooks/useAthleteProgramEntry";

type UseCommandPaletteSearchOptions = {
  enabled?: boolean;
};

export function useCommandPaletteSearch({
  enabled = true,
}: UseCommandPaletteSearchOptions = {}) {
  const { role, userId } = useAuth();
  const queryClient = useQueryClient();
  const [athletes, setAthletes] = useState<
    Array<{ id: string; full_name: string | null }>
  >([]);
  const [athleteDetails, setAthleteDetails] = useState<CommandAthleteDetail[]>([]);
  const [programs, setPrograms] = useState<CommandProgramRow[]>([]);
  const [athleteProgramHref, setAthleteProgramHref] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !userId) {
      setAthletes([]);
      setAthleteDetails([]);
      setPrograms([]);
      setAthleteProgramHref(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void loadCommandPaletteData(userId, role).then((data) => {
      if (cancelled) return;
      setAthletes(data.athletes);
      setAthleteDetails(data.athleteDetails);
      setPrograms(data.programs);
      setAthleteProgramHref(data.athleteProgramHref);
      setLoading(false);

      if (isCoachLikeRole(role) && data.athletes.length > 0) {
        void prefetchCoachAthleteProgramEntries(
          queryClient,
          userId,
          data.athletes.map((athlete) => athlete.id),
          data.athletes.length,
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, queryClient, role, userId]);

  const items = useMemo(
    () => buildCommandItems(role, athletes, programs, athleteProgramHref),
    [athleteProgramHref, athletes, programs, role],
  );

  const athleteDetailsById = useMemo(
    () => new Map(athleteDetails.map((athlete) => [athlete.id, athlete])),
    [athleteDetails],
  );

  return { items, athleteDetails, athleteDetailsById, loading, role };
}

export function useFilteredCommandItems(items: CommandItem[], query: string) {
  return useMemo(() => filterCommandItems(items, query), [items, query]);
}
