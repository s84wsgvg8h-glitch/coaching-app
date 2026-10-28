"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showAppToast } from "@/lib/appToast";
import type { ProgramExercise } from "@/lib/programWeek/types";
import {
  applyExerciseMovePreview,
  EXERCISE_DROP_EMPTY_DAY,
  type ExerciseDropIndicator,
} from "../_utils/programWeekExerciseDrag";

type UseProgramWeekExerciseDragParams = {
  exercisesByDay: Record<string, ProgramExercise[]>;
  setExercisesByDay: React.Dispatch<
    React.SetStateAction<Record<string, ProgramExercise[]>>
  >;
  loadDaysRef: React.MutableRefObject<(() => Promise<void>) | undefined>;
};

export function useProgramWeekExerciseDrag({
  exercisesByDay,
  setExercisesByDay,
  loadDaysRef,
}: UseProgramWeekExerciseDragParams) {
  const [draggedExercise, setDraggedExercise] = useState<{
    dayId: string;
    exerciseId: string;
  } | null>(null);
  const [exerciseDropIndicator, setExerciseDropIndicator] =
    useState<ExerciseDropIndicator | null>(null);
  const originalExerciseOrderRef = useRef<string[]>([]);
  const exerciseDropIndicatorRef = useRef<ExerciseDropIndicator | null>(null);
  const dragExerciseSnapshotRef = useRef<Record<
    string,
    ProgramExercise[]
  > | null>(null);
  const draggedExerciseDataRef = useRef<ProgramExercise | null>(null);
  const pendingExerciseMoveRef = useRef<Record<
    string,
    ProgramExercise[]
  > | null>(null);

  function previewExerciseMove(indicator: ExerciseDropIndicator) {
    if (!draggedExercise || !draggedExerciseDataRef.current) return;

    setExercisesByDay((current) => {
      const next = applyExerciseMovePreview(
        current,
        draggedExercise,
        indicator,
        draggedExerciseDataRef.current as ProgramExercise,
      );
      pendingExerciseMoveRef.current = next;
      return next;
    });
  }

  function setExerciseDropIndicatorState(indicator: ExerciseDropIndicator) {
    const previous = exerciseDropIndicatorRef.current;
    const indicatorChanged =
      !previous ||
      previous.dayId !== indicator.dayId ||
      previous.targetId !== indicator.targetId ||
      previous.position !== indicator.position;

    exerciseDropIndicatorRef.current = indicator;
    setExerciseDropIndicator(indicator);

    if (indicatorChanged) {
      previewExerciseMove(indicator);
    }
  }

  function handleExerciseDragStart(dayId: string, exerciseId: string) {
    const exercise = (exercisesByDay[dayId] || []).find(
      (item) => item.id === exerciseId,
    );
    draggedExerciseDataRef.current = exercise ?? null;
    dragExerciseSnapshotRef.current = Object.fromEntries(
      Object.entries(exercisesByDay).map(([id, items]) => [id, [...items]]),
    );
    pendingExerciseMoveRef.current = null;
    setDraggedExercise({ dayId, exerciseId });
    setExerciseDropIndicator(null);
    exerciseDropIndicatorRef.current = null;
    originalExerciseOrderRef.current = (exercisesByDay[dayId] || []).map(
      (exercise) => exercise.id,
    );
  }

  function handleExerciseDragOver(
    e: React.DragEvent<HTMLDivElement>,
    dayId: string,
    targetExerciseId: string,
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedExercise || draggedExercise.exerciseId === targetExerciseId) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const position =
      e.clientY < rect.top + rect.height / 2
        ? ("before" as const)
        : ("after" as const);

    setExerciseDropIndicatorState({
      dayId,
      targetId: targetExerciseId,
      position,
    });
  }

  function handleExerciseDragOverDay(
    e: React.DragEvent<HTMLDivElement>,
    dayId: string,
  ) {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedExercise) return;

    setExerciseDropIndicatorState({
      dayId,
      targetId: EXERCISE_DROP_EMPTY_DAY,
      position: "after",
    });
  }

  async function saveExerciseOrder(_sourceDayId: string) {
    if (!draggedExercise) return;

    const dragged = draggedExercise;
    const indicator = exerciseDropIndicatorRef.current;
    const snapshot = dragExerciseSnapshotRef.current;
    const originalSourceOrder = [...originalExerciseOrderRef.current];
    const pendingMove = pendingExerciseMoveRef.current;
    const draggedExerciseObj = draggedExerciseDataRef.current;

    setDraggedExercise(null);
    setExerciseDropIndicator(null);
    exerciseDropIndicatorRef.current = null;
    draggedExerciseDataRef.current = null;
    dragExerciseSnapshotRef.current = null;
    pendingExerciseMoveRef.current = null;

    if (!indicator || !draggedExerciseObj) {
      if (snapshot) {
        setExercisesByDay(snapshot);
      }
      return;
    }

    const sourceDayId = dragged.dayId;
    const targetDayId = indicator.dayId;
    const isCrossDay = sourceDayId !== targetDayId;
    const baseState = snapshot ?? exercisesByDay;
    const nextExercisesByDay =
      isCrossDay || !pendingMove
        ? applyExerciseMovePreview(
            baseState,
            dragged,
            indicator,
            draggedExerciseObj,
          )
        : pendingMove;

    setExercisesByDay(nextExercisesByDay);

    const sourceExercises = nextExercisesByDay[sourceDayId] || [];
    const targetExercises = nextExercisesByDay[targetDayId] || [];
    const sourceOrder = sourceExercises.map((exercise) => exercise.id);
    const sourceOrderChanged =
      sourceOrder.length !== originalSourceOrder.length ||
      sourceOrder.some((id, index) => id !== originalSourceOrder[index]);

    if (!isCrossDay && !sourceOrderChanged) {
      return;
    }

    const updates: Array<
      PromiseLike<{ error: { message: string } | null }>
    > = [];

    if (isCrossDay) {
      const movedExercise = targetExercises.find(
        (exercise) => exercise.id === dragged.exerciseId,
      );
      const movedIndex = targetExercises.findIndex(
        (exercise) => exercise.id === dragged.exerciseId,
      );

      if (!movedExercise || movedIndex === -1) {
        if (snapshot) {
          setExercisesByDay(snapshot);
        }
        return;
      }

      updates.push(
        supabase
          .from("program_exercises")
          .update({
            program_day_id: targetDayId,
            exercise_number: movedIndex + 1,
          })
          .eq("id", dragged.exerciseId),
      );

      sourceExercises.forEach((exercise, index) => {
        updates.push(
          supabase
            .from("program_exercises")
            .update({ exercise_number: index + 1 })
            .eq("id", exercise.id),
        );
      });

      targetExercises.forEach((exercise, index) => {
        if (exercise.id === dragged.exerciseId) return;
        updates.push(
          supabase
            .from("program_exercises")
            .update({ exercise_number: index + 1 })
            .eq("id", exercise.id),
        );
      });
    } else {
      targetExercises.forEach((exercise, index) => {
        updates.push(
          supabase
            .from("program_exercises")
            .update({ exercise_number: index + 1 })
            .eq("id", exercise.id),
        );
      });
    }

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      showAppToast(failed.error.message);
      await loadDaysRef.current?.();
      return;
    }

    if (isCrossDay) {
      showAppToast("Oefening verplaatst naar andere dag");
    }
  }

  return {
    draggedExercise,
    exerciseDropIndicator,
    handleExerciseDragStart,
    handleExerciseDragOver,
    handleExerciseDragOverDay,
    saveExerciseOrder,
  };
}
