"use client";

import { useRef, useState } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useQueryClient } from "@tanstack/react-query";
import {
  loadExerciseLibraryItems,
  type ExerciseLibraryItem,
} from "@/lib/exerciseLibrary";
import {
  loadAthleteVideoSubmitTarget,
  type AthleteVideoSubmitTarget,
} from "@/lib/athleteVideoSubmit";
import { getCachedProgramWeekCore } from "@/hooks/useProgramWeekCore";
import {
  loadProgramWeekCore,
  type ProgramWeekCoreData,
} from "@/lib/programWeekCoreLoader";
import { queryKeys } from "@/lib/queryKeys";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import { supabase } from "@/lib/supabaseClient";

export function useProgramWeekCoreData({
  blockId,
  weekId,
  athleteId,
  router,
  loadProgramNavigationRef,
  authUserId,
  authRole,
}: {
  blockId: string;
  weekId: string;
  athleteId: string | null;
  router: AppRouterInstance;
  loadProgramNavigationRef: React.MutableRefObject<
    (
      blockData: ProgramBlock | null,
      loadedRole: string,
      loadedUserId: string,
    ) => Promise<void>
  >;
  authUserId: string;
  authRole: string;
}) {
  const queryClient = useQueryClient();
  const saveStatusTimeoutRef = useRef<number | null>(null);

  const initialCore = getCachedProgramWeekCore(
    queryClient,
    blockId,
    weekId,
  ) as ProgramWeekCoreData | undefined;

  const [userId, setUserId] = useState(initialCore?.userId ?? authUserId ?? "");
  const [role, setRole] = useState(initialCore?.role ?? authRole ?? "");
  const [currentBlock, setCurrentBlock] = useState<ProgramBlock | null>(
    initialCore?.block ?? null,
  );
  const [week, setWeek] = useState<ProgramWeek | null>(initialCore?.week ?? null);
  const [days, setDays] = useState<ProgramDay[]>(initialCore?.days ?? []);
  const [exercisesByDay, setExercisesByDay] = useState<
    Record<string, ProgramExercise[]>
  >(initialCore?.exercisesByDay ?? {});
  const [programReady, setProgramReady] = useState(Boolean(initialCore));
  const [libraryItems, setLibraryItems] = useState<ExerciseLibraryItem[]>([]);
  const [libraryItemsById, setLibraryItemsById] = useState<
    Record<string, ExerciseLibraryItem>
  >({});
  const [athleteCoachId, setAthleteCoachId] = useState("");
  const [athleteDisplayName, setAthleteDisplayName] = useState("Atleet");
  const [videoSubmitTarget, setVideoSubmitTarget] =
    useState<AthleteVideoSubmitTarget>("chat");

  function applyCoreData(data: ProgramWeekCoreData) {
    setUserId(data.userId);
    setRole(data.role || authRole || "");
    setCurrentBlock(data.block);
    setWeek(data.week);
    setDays(data.days);
    setExercisesByDay(data.exercisesByDay);
    setProgramReady(true);
  }

  async function loadSecondaryData(
    blockData: ProgramBlock | null,
    loadedRole: string,
    loadedUserId: string,
  ) {
    void (async () => {
      const items = await loadExerciseLibraryItems(false);
      setLibraryItems(items);
      setLibraryItemsById(
        Object.fromEntries(items.map((item) => [item.id, item])),
      );

      await loadProgramNavigationRef.current?.(
        blockData,
        loadedRole,
        loadedUserId,
      );

      const ownerAthleteId =
        athleteId ||
        blockData?.athlete_id ||
        (loadedRole === "atleet" ? loadedUserId : "");

      if (ownerAthleteId) {
        const [{ data: athleteProfile }, submitTarget] = await Promise.all([
          supabase
            .from("profiles")
            .select("coach_id, full_name")
            .eq("id", ownerAthleteId)
            .maybeSingle(),
          loadAthleteVideoSubmitTarget(ownerAthleteId),
        ]);

        setAthleteDisplayName(athleteProfile?.full_name || "Atleet");
        setAthleteCoachId(
          athleteProfile?.coach_id || loadedUserId,
        );
        setVideoSubmitTarget(submitTarget);
      }
    })();
  }

  function setSavedSoon() {
    if (saveStatusTimeoutRef.current) {
      window.clearTimeout(saveStatusTimeoutRef.current);
    }

    saveStatusTimeoutRef.current = window.setTimeout(() => {
      // save indicator reset
    }, 1200);
  }

  async function runSave(callback: () => Promise<void>) {
    try {
      await callback();
      setSavedSoon();
    } catch (error: unknown) {
      console.error("SAVE ERROR:", error);
      console.error("SAVE ERROR JSON:", JSON.stringify(error, null, 2));

      const errRecord =
        typeof error === "object" && error !== null
          ? (error as Record<string, unknown>)
          : null;
      const message =
        error instanceof Error
          ? error.message
          : typeof errRecord?.message === "string"
            ? errRecord.message
            : typeof errRecord?.details === "string"
              ? errRecord.details
              : typeof errRecord?.hint === "string"
                ? errRecord.hint
                : JSON.stringify(error, null, 2) || "Opslaan mislukt";

      alert(message);
      throw error;
    }
  }

  function getOwnerAthleteId() {
    return (
      athleteId || currentBlock?.athlete_id || (role === "atleet" ? userId : "")
    );
  }

  async function loadExercisesForDays(loadedDays: ProgramDay[]) {
    const dayIds = loadedDays.map((day) => day.id);

    const { data, error } = await supabase
      .from("program_exercises")
      .select("*")
      .in("program_day_id", dayIds)
      .order("exercise_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    const grouped: Record<string, ProgramExercise[]> = {};

    loadedDays.forEach((day) => {
      grouped[day.id] = [];
    });

    (data || []).forEach((exercise) => {
      if (!grouped[exercise.program_day_id]) {
        grouped[exercise.program_day_id] = [];
      }

      grouped[exercise.program_day_id].push(exercise);
    });

    setExercisesByDay(grouped);
  }

  async function loadDays() {
    const { data } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_week_id", weekId)
      .order("day_number", { ascending: true });

    const loadedDays = data || [];
    setDays(loadedDays);

    if (loadedDays.length > 0) {
      await loadExercisesForDays(loadedDays);
    } else {
      setExercisesByDay({});
    }
  }

  async function loadData() {
    if (!authUserId) {
      router.replace("/login");
      return;
    }

    const cached = getCachedProgramWeekCore(
      queryClient,
      blockId,
      weekId,
    ) as ProgramWeekCoreData | undefined;

    if (cached) {
      applyCoreData(cached);
      void loadSecondaryData(cached.block, cached.role || authRole, authUserId);
      return;
    }

    setProgramReady(false);
    setUserId(authUserId);
    setRole(authRole || "");

    try {
      const data = await loadProgramWeekCore(blockId, weekId, {
        userId: authUserId,
        role: authRole,
      });
      queryClient.setQueryData(queryKeys.programWeekCore(blockId, weekId), data);
      applyCoreData(data);
      void loadSecondaryData(data.block, authRole, authUserId);
    } catch {
      router.replace("/login");
    }
  }

  function getExerciseLibraryItem(exercise: ProgramExercise) {
    if (!exercise.exercise_library_id) return null;
    return libraryItemsById[exercise.exercise_library_id] || null;
  }

  async function saveExerciseLibraryLink(
    exerciseId: string,
    libraryId: string | null,
  ) {
    const { error } = await supabase
      .from("program_exercises")
      .update({ exercise_library_id: libraryId })
      .eq("id", exerciseId);

    if (error) {
      alert(error.message);
      return;
    }

    setExercisesByDay((current) => {
      const next = { ...current };

      for (const dayId of Object.keys(next)) {
        next[dayId] = next[dayId].map((exercise) =>
          exercise.id === exerciseId
            ? { ...exercise, exercise_library_id: libraryId }
            : exercise,
        );
      }

      return next;
    });
  }

  return {
    userId,
    role,
    currentBlock,
    setCurrentBlock,
    week,
    setWeek,
    days,
    setDays,
    exercisesByDay,
    setExercisesByDay,
    programReady,
    libraryItems,
    libraryItemsById,
    athleteCoachId,
    athleteDisplayName,
    videoSubmitTarget,
    runSave,
    getOwnerAthleteId,
    loadData,
    loadDays,
    getExerciseLibraryItem,
    saveExerciseLibraryLink,
  };
}
