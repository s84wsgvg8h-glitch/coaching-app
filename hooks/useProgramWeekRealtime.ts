import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

type ProgramWeekRealtimeOptions = {
  weekId: string;
  dayIds: string[];
  ownerAthleteId: string;
  enabled: boolean;
  onProgramStructureChange: () => void;
  onAthleteLogChange: () => void;
};

export function useProgramWeekRealtime({
  weekId,
  dayIds,
  ownerAthleteId,
  enabled,
  onProgramStructureChange,
  onAthleteLogChange,
}: ProgramWeekRealtimeOptions) {
  const dayIdsKey = dayIds.join("|");
  const dayIdSetRef = useRef(new Set<string>());
  const onProgramRef = useRef(onProgramStructureChange);
  const onAthleteRef = useRef(onAthleteLogChange);
  const debounceTimersRef = useRef<Record<string, number>>({});

  useEffect(() => {
    dayIdSetRef.current = new Set(dayIds);
    onProgramRef.current = onProgramStructureChange;
    onAthleteRef.current = onAthleteLogChange;
  }, [dayIds, onAthleteLogChange, onProgramStructureChange]);

  useEffect(() => {
    if (!enabled || !weekId) return;

    const schedule = (key: string, fn: () => void, delayMs = 280) => {
      const timers = debounceTimersRef.current;
      window.clearTimeout(timers[key]);
      timers[key] = window.setTimeout(fn, delayMs);
    };

    const isOurDay = (dayId: string | undefined | null) =>
      Boolean(dayId && dayIdSetRef.current.has(dayId));

    const channel = supabase.channel(`program-week-live-${weekId}`);

    channel
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "program_days",
          filter: `program_week_id=eq.${weekId}`,
        },
        () => {
          schedule("program-days", () => onProgramRef.current());
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "program_weeks",
          filter: `id=eq.${weekId}`,
        },
        () => {
          schedule("program-week", () => onProgramRef.current());
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "program_exercises",
        },
        (payload) => {
          const row = (payload.new || payload.old) as {
            program_day_id?: string;
          };
          if (!isOurDay(row.program_day_id)) return;
          schedule("program-exercises", () => onProgramRef.current());
        },
      );

    if (ownerAthleteId) {
      channel
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "athlete_exercise_sets",
            filter: `athlete_id=eq.${ownerAthleteId}`,
          },
          () => {
            schedule("athlete-sets", () => onAthleteRef.current());
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "athlete_exercise_videos",
            filter: `athlete_id=eq.${ownerAthleteId}`,
          },
          () => {
            schedule("athlete-videos", () => onAthleteRef.current());
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "athlete_exercise_notes",
            filter: `athlete_id=eq.${ownerAthleteId}`,
          },
          () => {
            schedule("athlete-notes", () => onAthleteRef.current());
          },
        );
    }

    channel.subscribe();

    return () => {
      const timers = debounceTimersRef.current;
      for (const timerId of Object.values(timers)) {
        window.clearTimeout(timerId);
      }
      debounceTimersRef.current = {};
      void supabase.removeChannel(channel);
    };
  }, [dayIdsKey, enabled, ownerAthleteId, weekId]);
}
