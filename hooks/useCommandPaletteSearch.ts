"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  buildCommandItems,
  filterCommandItems,
  loadCommandPaletteData,
  type CommandAthleteDetail,
  type CommandItem,
  type CommandProgramRow,
} from "@/lib/commandPaletteSearch";

type UseCommandPaletteSearchOptions = {
  enabled?: boolean;
};

export function useCommandPaletteSearch({
  enabled = true,
}: UseCommandPaletteSearchOptions = {}) {
  const { role, userId } = useAuth();
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
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, role, userId]);

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
