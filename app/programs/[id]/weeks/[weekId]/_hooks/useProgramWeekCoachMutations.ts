"use client";

import { useRef, useState, type Dispatch, RefObject, SetStateAction } from "react";
import { normalizeExerciseName } from "@/lib/programWeek/exerciseUtils";
import { setEmptyDragImage } from "@/lib/programWeek/constants";
import {
  buildRawPasteApplication,
  replacePendingExerciseId,
  type RawPasteTarget,
} from "@/lib/programWeek/rawPasteApply";
import {
  formatDate as formatDateValue,
  formatDateRangeLabel as formatDateRangeLabelValue,
  formatDutchDateWithFullMonth,
  getBlockEndDateObject as getBlockEndDateObjectValue,
  getBlockStartDateObject as getBlockStartDateObjectValue,
  buildProgramWeekDayDates,
  getDayDateLabel,
  getDayDateLabelForProgramDay,
  getDayDateInputValue as getProgramDayDateInputValue,
  getDayDateObject as getProgramDayDateObject,
  getDayDateForProgramDay,
  getWeekEndDateObject as getWeekEndDateObjectValue,
  getWeekStartDateObject as getWeekStartDateObjectValue,
} from "@/lib/programWeek/dateFormatting";
import { parseWeekdayFromDayTitle, formatProgramDayTitle } from "@/lib/programWeek/weekdayFromTitle";
import {
  getCoachExerciseColorClass as getCoachExerciseColorClassValue,
  getDisplayIntensity as getDisplayIntensityValue,
  getExerciseColorClass as getExerciseColorClassValue,
  getExercisePriority as getExercisePriorityValue,
  getExercisePriorityClass as getExercisePriorityClassValue,
  getExercisePriorityLabel as getExercisePriorityLabelValue,
  getExercisePriorityShortLabel as getExercisePriorityShortLabelValue,
  getIntensityType as getIntensityTypeValue,
  getIntensityValue as getIntensityValueLib,
  getPlannedNumber as getPlannedNumberValue,
} from "@/lib/programWeek/exerciseDisplay";
import { estimateE1rmFromSet, formatPrescriptionIntensity, parseSetNumber } from "@/lib/exercisePrescription";
import { mergeAthleteSetRowsWithDefaults } from "@/lib/athleteSetDefaults";
import type {
  AthleteExerciseSet,
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import { insertProgramExerciseForDay } from "@/lib/programExerciseCreate";
import {
  offlineBatchUpdateProgramDays,
  offlineBatchUpdateProgramExercises,
  offlineDeleteProgramDay,
  offlineDeleteProgramExercise,
  offlineInsertProgramDay,
  offlineUpdateProgramDay,
  offlineUpdateProgramExercise,
} from "@/lib/offlineProgramMutation";
import { supabase } from "@/lib/supabaseClient";
import { showAppToast } from "@/lib/appToast";
import {
  applyExercisePatchAcrossBlock,
  isApplyAllWeeksActive,
} from "@/lib/programWeek/applyExerciseAcrossBlock";
import {
  applyExerciseMovePreview,
  EXERCISE_DROP_EMPTY_DAY,
  type ExerciseDropIndicator,
} from "../_utils/programWeekExerciseDrag";

export type UseProgramWeekCoachMutationsOptions = {
  blockId: string;
  weekId: string;
  days: ProgramDay[];
  setDays: Dispatch<SetStateAction<ProgramDay[]>>;
  exercisesByDay: Record<string, ProgramExercise[]>;
  setExercisesByDay: Dispatch<SetStateAction<Record<string, ProgramExercise[]>>>;
  currentBlock: ProgramBlock | null;
  week: ProgramWeek | null;
  blockWeeks: ProgramWeek[];
  athleteCurrentMaxes: import("@/lib/athleteCurrentMaxes").AthleteCurrentMaxes | null;
  showE1rmInline: boolean;
  athleteSetInputs: Record<string, AthleteExerciseSet[]>;
  runSave: (callback: () => Promise<void>) => Promise<void>;
  loadDays: () => Promise<void>;
};

export function useProgramWeekCoachMutations({
  blockId,
  weekId,
  days,
  setDays,
  exercisesByDay,
  setExercisesByDay,
  currentBlock,
  week,
  blockWeeks,
  athleteCurrentMaxes,
  showE1rmInline,
  athleteSetInputs,
  runSave,
  loadDays,
}: UseProgramWeekCoachMutationsOptions) {
  const [openDayNoteId, setOpenDayNoteId] = useState("");
  const [openDayWarmupId, setOpenDayWarmupId] = useState("");
  const [openExerciseNoteId, setOpenExerciseNoteId] = useState("");

  const [isCreatingDay, setIsCreatingDay] = useState(false);
  const [newDayTitle, setNewDayTitle] = useState("");
  const newDayInputRef = useRef<HTMLInputElement | null>(null);

  const [creatingExerciseDayId, setCreatingExerciseDayId] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSets, setExerciseSets] = useState("");
  const [exerciseReps, setExerciseReps] = useState("");
  const [exerciseIntensity, setExerciseIntensity] = useState("");
  const [exerciseIntensityType, setExerciseIntensityType] = useState("rpe");
  const [exerciseLoadKg, setExerciseLoadKg] = useState("");

  const exerciseNameInputRef = useRef<HTMLInputElement | null>(null);
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

  const [draggedDayId, setDraggedDayId] = useState("");
  const [dayDropIndicator, setDayDropIndicator] = useState<{
    targetId: string;
    position: "before" | "after";
  } | null>(null);
  const originalDayOrderRef = useRef<string[]>([]);
  const dayDropIndicatorRef = useRef<{
    targetId: string;
    position: "before" | "after";
  } | null>(null);

  const [uitlegMode, setUitlegMode] = useState(false);
  const offlineCtx = { blockId, weekId };
  const creatingDayRef = useRef(false);

  async function propagateExercisePatch(
    exerciseId: string,
    patch: Record<string, string | number | null>,
  ) {
    if (!isApplyAllWeeksActive(blockId)) return;

    try {
      await applyExercisePatchAcrossBlock({
        blockId,
        exerciseId,
        patch,
      });
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "")
          : "";
      showAppToast(message || "Andere weken konden niet worden bijgewerkt.");
    }
  }

  async function createDay(dayNumber: number) {
    if (creatingDayRef.current) return;

    if (!newDayTitle.trim()) {
      alert("Vul een naam in voor de dag");
      return;
    }

    const row = {
      title: formatProgramDayTitle(newDayTitle.trim()),
      day_number: dayNumber,
      program_week_id: weekId,
      notes: "",
      warmup: "",
    };

    creatingDayRef.current = true;
    try {
      const queued = await offlineInsertProgramDay(offlineCtx, row);
      setNewDayTitle("");
      setIsCreatingDay(false);
      if (!queued) {
        await loadDays();
      }
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? String((error as { message?: string }).message || "")
          : "";
      alert(message || "Dag kon niet worden aangemaakt.");
    } finally {
      creatingDayRef.current = false;
    }
  }


  function updateDayLocal(
    dayId: string,
    field: "notes" | "warmup" | "title" | "scheduled_date",
    value: string,
  ) {
    setDays((current) =>
      current.map((day) =>
        day.id === dayId
          ? {
              ...day,
              [field]: value,
            }
          : day,
      ),
    );
  }


  async function saveDayMeta(
    dayId: string,
    updates: { title?: string; scheduled_date?: string | null },
  ) {
    let finalUpdates = { ...updates };

    if (updates.title !== undefined) {
      const formattedTitle = formatProgramDayTitle(updates.title);
      finalUpdates = { ...finalUpdates, title: formattedTitle };
      updateDayLocal(dayId, "title", formattedTitle);

      const day = days.find((entry) => entry.id === dayId);
      if (day && parseWeekdayFromDayTitle(formattedTitle) !== null) {
        const mergedDay = { ...day, title: formattedTitle };
        const scheduledDate = getProgramDayDateInputValue(
          currentBlock,
          week,
          mergedDay,
          undefined,
          blockWeeks,
        );
        if (scheduledDate) {
          finalUpdates = { ...finalUpdates, scheduled_date: scheduledDate };
          updateDayLocal(dayId, "scheduled_date", scheduledDate);
        }
      }
    }

    await runSave(async () => {
      await offlineUpdateProgramDay(offlineCtx, dayId, finalUpdates);
    });
  }


  async function saveDayField(
    dayId: string,
    field: "notes" | "warmup",
    value: string,
  ) {
    await runSave(async () => {
      await offlineUpdateProgramDay(offlineCtx, dayId, { [field]: value });
    });

    setOpenDayNoteId("");
    setOpenDayWarmupId("");
  }


  async function deleteDayField(dayId: string, field: "notes" | "warmup") {
    const previousDay = days.find((day) => day.id === dayId);
    updateDayLocal(dayId, field, "");

    try {
      await runSave(async () => {
        await offlineUpdateProgramDay(offlineCtx, dayId, { [field]: "" });
      });
    } catch {
      if (previousDay) updateDayLocal(dayId, field, previousDay[field] || "");
      await loadDays();
      return;
    }

    if (field === "notes") setOpenDayNoteId("");
    if (field === "warmup") setOpenDayWarmupId("");
  }


  async function addExercise(dayId: string) {
    const rawName =
      exerciseNameInputRef.current?.value ?? exerciseName;
    if (!rawName.trim()) {
      alert("Vul een oefening in");
      return;
    }

    const intensityValue = exerciseIntensity.trim();

    const loadValue =
      exerciseIntensityType === "kg" || exerciseIntensityType === "%"
        ? intensityValue
          ? `${intensityValue}${exerciseIntensityType}`
          : ""
        : "";

    const rpeValue = exerciseIntensityType === "rpe" ? intensityValue : "";

    try {
      await runSave(async () => {
        const { error } = await insertProgramExerciseForDay({
          dayId,
          name: normalizeExerciseName(rawName),
          sets: exerciseSets.trim(),
          reps: exerciseReps.trim(),
          load: loadValue,
          rpe: rpeValue,
          notes: "",
          exerciseNumber: (exercisesByDay[dayId] || []).length + 1,
          priority: "",
        });

        if (error) throw new Error(error);
      });
    } catch {
      return;
    }

    setExerciseName("");
    if (exerciseNameInputRef.current) {
      exerciseNameInputRef.current.value = "";
    }
    setExerciseSets("");
    setExerciseReps("");
    setExerciseIntensity("");
    setExerciseIntensityType("rpe");
    setCreatingExerciseDayId("");

    await loadDays();
  }


  async function insertExerciseFromRaw(
    dayId: string,
    seed: Partial<
      Pick<
        ProgramExercise,
        "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
      >
    > = {},
    afterIndex?: number,
  ) {
    const sorted = [...(exercisesByDay[dayId] || [])].sort(
      (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
    );
    const insertAt =
      afterIndex === undefined ? sorted.length : Math.max(afterIndex + 1, 0);

    const name = seed.name ? normalizeExerciseName(seed.name) : "Nieuwe oefening";

    try {
      await runSave(async () => {
        for (let index = insertAt; index < sorted.length; index += 1) {
          const { error } = await supabase
            .from("program_exercises")
            .update({ exercise_number: index + 2 })
            .eq("id", sorted[index].id);

          if (error) throw error;
        }

        const { error } = await insertProgramExerciseForDay({
          dayId,
          name,
          sets: (seed.sets ?? "").trim(),
          reps: (seed.reps ?? "").trim(),
          load: seed.load ?? "",
          rpe: seed.rpe ?? "",
          notes: (seed.notes ?? "").trim(),
          exerciseNumber: insertAt + 1,
          priority: seed.priority ?? "",
        });

        if (error) throw new Error(error);
      });
    } catch {
      return;
    }

    await loadDays();
  }


  async function applyRawClipboardPaste(targets: RawPasteTarget[]) {
    if (targets.length === 0) return;

    const previousExercisesByDay = exercisesByDay;
    const { next, ops } = buildRawPasteApplication(exercisesByDay, targets);
    setExercisesByDay(next);

    try {
      await runSave(async () => {
        for (const op of ops) {
          if (op.type === "update") {
            if (Object.keys(op.fields).length === 0) continue;

            const { error } = await supabase
              .from("program_exercises")
              .update(op.fields)
              .eq("id", op.exerciseId);

            if (error) throw error;
            continue;
          }

          const sorted = [...(next[op.dayId] || [])].sort(
            (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
          );
          const insertAt = Math.max(op.afterIndex + 1, 0);
          const persistedBefore = sorted.filter(
            (exercise) =>
              !exercise.id.startsWith("pending-") &&
              (exercise.exercise_number || 0) > insertAt,
          );

          for (const exercise of persistedBefore) {
            const { error } = await supabase
              .from("program_exercises")
              .update({ exercise_number: exercise.exercise_number })
              .eq("id", exercise.id);

            if (error) throw error;
          }

          const name =
            op.seed.name === undefined
              ? "Nieuwe oefening"
              : normalizeExerciseName(op.seed.name);

          const { exercise: inserted, error } = await insertProgramExerciseForDay({
            dayId: op.dayId,
            name,
            sets: (op.seed.sets ?? "").trim(),
            reps: (op.seed.reps ?? "").trim(),
            load: op.seed.load ?? "",
            rpe: op.seed.rpe ?? "",
            notes: (op.seed.notes ?? "").trim(),
            exerciseNumber: insertAt + 1,
            priority: op.seed.priority ?? "",
          });

          if (error) throw new Error(error);

          if (inserted) {
            setExercisesByDay((current) =>
              replacePendingExerciseId(current, op.tempId, inserted),
            );
          }
        }
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
    }
  }


  async function duplicateExerciseRow(dayId: string, exerciseId: string) {
    const sorted = [...(exercisesByDay[dayId] || [])].sort(
      (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
    );
    const index = sorted.findIndex((exercise) => exercise.id === exerciseId);
    if (index === -1) return;

    const exercise = sorted[index];
    await insertExerciseFromRaw(
      dayId,
      {
        name: exercise.name,
        sets: exercise.sets || "",
        reps: exercise.reps || "",
        load: exercise.load || "",
        rpe: exercise.rpe || "",
        notes: exercise.notes || "",
        priority: exercise.priority || "",
      },
      index,
    );
  }


  function updateExerciseLocal(
    dayId: string,
    exerciseId: string,
    field: keyof ProgramExercise,
    value: string,
  ) {
    setExercisesByDay((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              [field]: value,
            }
          : exercise,
      ),
    }));
  }


  async function saveExerciseField(
    exerciseId: string,
    field:
      | "name"
      | "sets"
      | "reps"
      | "load"
      | "rpe"
      | "notes"
      | "exercise_format"
      | "superset_group"
      | "rest_seconds",
    value: string,
  ) {
    let cleanValue: string | number | null =
      field === "name" ? normalizeExerciseName(value) : value.trim();

    if (field === "rest_seconds") {
      cleanValue = value.trim() ? Number.parseInt(value.trim(), 10) : null;
      if (cleanValue !== null && !Number.isFinite(cleanValue)) cleanValue = null;
    }

    if (field === "superset_group") {
      cleanValue = value.trim() || null;
    }
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => {
      const next = { ...current };

      Object.keys(next).forEach((dayId) => {
        next[dayId] = (next[dayId] || []).map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                [field]: cleanValue,
              }
            : exercise,
        );
      });

      return next;
    });

    try {
      await runSave(async () => {
        await offlineUpdateProgramExercise(offlineCtx, exerciseId, {
          [field]: cleanValue,
        });
      });
      await propagateExercisePatch(exerciseId, {
        [field]: cleanValue as string | number | null,
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
      return;
    }

    if (field === "notes") {
      setOpenExerciseNoteId("");
    }
  }


  async function saveExerciseFields(
    exerciseId: string,
    updates: Partial<
      Pick<ProgramExercise, "name" | "sets" | "reps" | "load" | "rpe" | "notes">
    >,
    options?: { reloadOnError?: boolean },
  ): Promise<boolean> {
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [
        key,
        typeof value === "string"
          ? key === "name"
            ? normalizeExerciseName(value)
            : value.trim()
          : value,
      ]),
    );
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => {
      const next = { ...current };

      Object.keys(next).forEach((dayId) => {
        next[dayId] = (next[dayId] || []).map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                ...cleanUpdates,
              }
            : exercise,
        );
      });

      return next;
    });

    try {
      await runSave(async () => {
        await offlineUpdateProgramExercise(offlineCtx, exerciseId, cleanUpdates);
      });
      await propagateExercisePatch(
        exerciseId,
        cleanUpdates as Record<string, string | number | null>,
      );
      return true;
    } catch {
      setExercisesByDay(previousExercisesByDay);
      if (options?.reloadOnError !== false) {
        await loadDays();
      }
      return false;
    }
  }


  async function saveExercisePriority(exerciseId: string, priority: string) {
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => {
      const next = { ...current };

      Object.keys(next).forEach((dayId) => {
        next[dayId] = (next[dayId] || []).map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                priority,
              }
            : exercise,
        );
      });

      return next;
    });

    try {
      await runSave(async () => {
        await offlineUpdateProgramExercise(offlineCtx, exerciseId, { priority });
      });
      await propagateExercisePatch(exerciseId, { priority });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
    }
  }


  function handleCoachExerciseEnter(
    e: React.KeyboardEvent<HTMLInputElement>,
    exerciseId: string,
    field: "name" | "sets" | "reps" | "load" | "rpe",
    value: string,
  ) {
    if (e.key !== "Enter") return;

    e.preventDefault();
    saveExerciseField(exerciseId, field, value);
    e.currentTarget.blur();
  }


  async function deleteExerciseNote(dayId: string, exerciseId: string) {
    const previousExercisesByDay = exercisesByDay;
    updateExerciseLocal(dayId, exerciseId, "notes", "");

    try {
      await runSave(async () => {
        await offlineUpdateProgramExercise(offlineCtx, exerciseId, { notes: "" });
      });
      await propagateExercisePatch(exerciseId, { notes: "" });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
      return;
    }

    setOpenExerciseNoteId("");
  }


  async function updateIntensityType(
    dayId: string,
    exercise: ProgramExercise,
    type: string,
  ) {
    const currentIntensity = exercise.rpe || exercise.load || "";

    const cleanValue = currentIntensity
      .replace("%", "")
      .replace("kg", "")
      .replace("KG", "")
      .trim();

    const newLoad = type === "%" || type === "kg" ? `${cleanValue}${type}` : "";
    const newRpe = type === "rpe" ? cleanValue : "";
    const previousExercisesByDay = exercisesByDay;

    setExercisesByDay((current) => ({
      ...current,
      [dayId]: (current[dayId] || []).map((item) =>
        item.id === exercise.id
          ? {
              ...item,
              load: newLoad,
              rpe: newRpe,
            }
          : item,
      ),
    }));

    try {
      await runSave(async () => {
        await offlineUpdateProgramExercise(offlineCtx, exercise.id, {
          load: newLoad,
          rpe: newRpe,
        });
      });
      await propagateExercisePatch(exercise.id, {
        load: newLoad,
        rpe: newRpe,
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
    }
  }


  async function deleteExercise(exerciseId: string) {
    try {
      await runSave(async () => {
        await offlineDeleteProgramExercise(offlineCtx, exerciseId);
      });
    } catch {
      return;
    }

    await loadDays();
  }


  async function deleteDay(dayId: string) {
    try {
      await runSave(async () => {
        const dayExerciseIds = (exercisesByDay[dayId] || []).map((item) => item.id);
        for (const exerciseId of dayExerciseIds) {
          await offlineDeleteProgramExercise(offlineCtx, exerciseId);
        }
        await offlineDeleteProgramDay(offlineCtx, dayId);
      });
    } catch {
      return;
    }

    await loadDays();
  }


  async function duplicateDay(dayToDuplicate: ProgramDay) {
    const newDayNumber = dayToDuplicate.day_number + 1;
    const daysToMove = days.filter(
      (item) =>
        item.day_number >= newDayNumber && item.id !== dayToDuplicate.id,
    );

    for (const item of daysToMove.reverse()) {
      const { error } = await supabase
        .from("program_days")
        .update({ day_number: item.day_number + 1 })
        .eq("id", item.id);

      if (error) {
        alert(error.message);
        return;
      }
    }

    const { data: createdDay, error: dayError } = await supabase
      .from("program_days")
      .insert({
        title: dayToDuplicate.title,
        day_number: newDayNumber,
        program_week_id: weekId,
        notes: dayToDuplicate.notes || "",
        warmup: dayToDuplicate.warmup || "",
      })
      .select("*")
      .single();

    if (dayError || !createdDay) {
      alert(dayError?.message || "Dag kon niet worden gedupliceerd");
      return;
    }

    const sourceExercises = [...(exercisesByDay[dayToDuplicate.id] || [])].sort(
      (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
    );

    if (sourceExercises.length > 0) {
      for (const [index, exercise] of sourceExercises.entries()) {
        const { error: exerciseError } = await insertProgramExerciseForDay({
          dayId: createdDay.id,
          name: normalizeExerciseName(exercise.name),
          sets: exercise.sets || "",
          reps: exercise.reps || "",
          load: exercise.load || "",
          rpe: exercise.rpe || "",
          notes: exercise.notes || "",
          exerciseNumber: index + 1,
          priority: exercise.priority ?? "",
          exerciseFormat: exercise.exercise_format ?? "normal",
          supersetGroup: exercise.superset_group ?? null,
          restSeconds: exercise.rest_seconds ?? null,
          exerciseLibraryId: exercise.exercise_library_id ?? null,
        });

        if (exerciseError) {
          alert(exerciseError);
          return;
        }
      }
    }

    await loadDays();
  }


  function handleDragStart(dayId: string) {
    setDraggedDayId(dayId);
    setDayDropIndicator(null);
    dayDropIndicatorRef.current = null;
    originalDayOrderRef.current = days.map((day) => day.id);
  }


  function handleDragOver(
    e: React.DragEvent<HTMLDivElement>,
    targetDayId: string,
  ) {
    e.preventDefault();

    if (!draggedDayId || draggedDayId === targetDayId) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const position =
      e.clientY < rect.top + rect.height / 2 ? ("before" as const) : ("after" as const);
    const indicator = { targetId: targetDayId, position };

    dayDropIndicatorRef.current = indicator;
    setDayDropIndicator(indicator);
  }


  function reorderDaysList(
    sourceDays: ProgramDay[],
    draggedId: string,
    indicator: { targetId: string; position: "before" | "after" },
  ) {
    const draggedIndex = sourceDays.findIndex((day) => day.id === draggedId);
    let targetIndex = sourceDays.findIndex((day) => day.id === indicator.targetId);

    if (draggedIndex === -1 || targetIndex === -1) return sourceDays;

    const reorderedDays = [...sourceDays];
    const [draggedDay] = reorderedDays.splice(draggedIndex, 1);

    if (draggedIndex < targetIndex) {
      targetIndex -= 1;
    }

    const insertIndex =
      indicator.position === "after" ? targetIndex + 1 : targetIndex;

    reorderedDays.splice(insertIndex, 0, draggedDay);

    return reorderedDays.map((day, index) => ({
      ...day,
      day_number: index + 1,
    }));
  }


  async function saveDayOrder() {
    if (!draggedDayId) return;

    const originalOrder = originalDayOrderRef.current;
    const indicator = dayDropIndicatorRef.current;
    let nextDays = days;

    if (indicator) {
      nextDays = reorderDaysList(days, draggedDayId, indicator);
      setDays(nextDays);
    }

    setDraggedDayId("");
    setDayDropIndicator(null);
    dayDropIndicatorRef.current = null;

    const nextOrder = nextDays.map((day) => day.id);
    const orderChanged =
      nextOrder.length !== originalOrder.length ||
      nextOrder.some((id, index) => id !== originalOrder[index]);

    if (!orderChanged) return;

    const dayDates = buildProgramWeekDayDates(
      currentBlock,
      week,
      nextDays,
      blockWeeks,
    );
    const nextDaysWithMeta = nextDays.map((day, index) => {
      const computedDate = dayDates.get(day.id);
      let scheduled_date = day.scheduled_date ?? null;

      if (computedDate) {
        const year = computedDate.getFullYear();
        const month = String(computedDate.getMonth() + 1).padStart(2, "0");
        const dayOfMonth = String(computedDate.getDate()).padStart(2, "0");
        scheduled_date = `${year}-${month}-${dayOfMonth}`;
      }

      return {
        ...day,
        day_number: index + 1,
        scheduled_date,
      };
    });

    setDays(nextDaysWithMeta);

    try {
      await runSave(async () => {
        await offlineBatchUpdateProgramDays(
          offlineCtx,
          nextDaysWithMeta.map((day) => ({
            id: day.id,
            patch: {
              day_number: day.day_number,
              scheduled_date: day.scheduled_date,
            },
          })),
        );
      });
    } catch {
      await loadDays();
    }
  }


  function clearExerciseDragState() {
    setDraggedExercise(null);
    setExerciseDropIndicator(null);
    exerciseDropIndicatorRef.current = null;
    draggedExerciseDataRef.current = null;
    dragExerciseSnapshotRef.current = null;
  }

  function setExerciseDropIndicatorState(indicator: ExerciseDropIndicator) {
    const previous = exerciseDropIndicatorRef.current;
    const indicatorChanged =
      !previous ||
      previous.dayId !== indicator.dayId ||
      previous.targetId !== indicator.targetId ||
      previous.position !== indicator.position;

    if (!indicatorChanged) return;

    exerciseDropIndicatorRef.current = indicator;
    setExerciseDropIndicator(indicator);
  }

  function handleExerciseDragStart(dayId: string, exerciseId: string) {
    const exercise = (exercisesByDay[dayId] || []).find(
      (item) => item.id === exerciseId,
    );
    draggedExerciseDataRef.current = exercise ?? null;
    dragExerciseSnapshotRef.current = Object.fromEntries(
      Object.entries(exercisesByDay).map(([id, items]) => [id, [...items]]),
    );
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
      e.clientY < rect.top + rect.height / 2 ? ("before" as const) : ("after" as const);

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

    const targetExercises = exercisesByDay[dayId] || [];
    if (targetExercises.length > 0) return;

    setExerciseDropIndicatorState({
      dayId,
      targetId: EXERCISE_DROP_EMPTY_DAY,
      position: "after",
    });
  }

  function handleExerciseDragOverDayTail(
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

  async function saveExerciseOrder(_sourceDayId?: string) {
    if (!draggedExercise) return;

    const dragged = draggedExercise;
    const indicator = exerciseDropIndicatorRef.current;
    const snapshot = dragExerciseSnapshotRef.current;
    const originalSourceOrder = [...originalExerciseOrderRef.current];
    const draggedExerciseObj = draggedExerciseDataRef.current;

    clearExerciseDragState();

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
    const nextExercisesByDay = applyExerciseMovePreview(
      baseState,
      dragged,
      indicator,
      draggedExerciseObj,
    );

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

    const batchUpdates: Array<{ id: string; patch: Record<string, unknown> }> =
      [];

    if (isCrossDay) {
      const movedIndex = targetExercises.findIndex(
        (exercise) => exercise.id === dragged.exerciseId,
      );

      if (movedIndex === -1) {
        if (snapshot) {
          setExercisesByDay(snapshot);
        }
        return;
      }

      batchUpdates.push({
        id: dragged.exerciseId,
        patch: {
          program_day_id: targetDayId,
          exercise_number: movedIndex + 1,
        },
      });

      sourceExercises.forEach((exercise, index) => {
        batchUpdates.push({
          id: exercise.id,
          patch: { exercise_number: index + 1 },
        });
      });

      targetExercises.forEach((exercise, index) => {
        if (exercise.id === dragged.exerciseId) return;
        batchUpdates.push({
          id: exercise.id,
          patch: { exercise_number: index + 1 },
        });
      });
    } else {
      targetExercises.forEach((exercise, index) => {
        batchUpdates.push({
          id: exercise.id,
          patch: { exercise_number: index + 1 },
        });
      });
    }

    try {
      await runSave(async () => {
        await offlineBatchUpdateProgramExercises(offlineCtx, batchUpdates);
      });

      if (isCrossDay) {
        showAppToast("Oefening verplaatst naar andere dag");
      }
    } catch {
      if (snapshot) {
        setExercisesByDay(snapshot);
      }
      await loadDays();
    }
  }


  function handleNewExerciseFormKeyDown(
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    dayId: string,
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      addExercise(dayId);
      return;
    }

    const arrowKeys = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];

    if (!arrowKeys.includes(e.key)) return;

    const wrapper = e.currentTarget.closest('[data-new-exercise-form="true"]');
    const fields = Array.from(
      wrapper?.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
        "input, select",
      ) || [],
    );

    const currentIndex = fields.indexOf(e.currentTarget);

    if (currentIndex === -1) return;

    e.preventDefault();

    const nextIndex =
      e.key === "ArrowRight" || e.key === "ArrowDown"
        ? currentIndex + 1
        : currentIndex - 1;

    const nextField = fields[nextIndex];

    if (!nextField) return;

    nextField.focus();

    if (nextField instanceof HTMLInputElement) {
      nextField.select();
    }
  }


  function getIntensityValue(exercise: ProgramExercise) {
    if (exercise.rpe) return exercise.rpe;

    if (exercise.load) {
      return exercise.load.replace("%", "").replace("kg", "").replace("KG", "");
    }

    return "";
  }


  function getIntensityType(exercise: ProgramExercise) {
    if (exercise.rpe) return "rpe";
    if (exercise.load?.includes("%")) return "%";
    if (exercise.load?.toLowerCase().includes("kg")) return "kg";

    return "rpe";
  }


  function getOrderedWeekDays() {
    return [...days].sort((a, b) => a.day_number - b.day_number);
  }


  function getDayDateObject(day: ProgramDay | number) {
    if (typeof day === "number") {
      return getProgramDayDateObject(currentBlock, week, day, blockWeeks);
    }

    return getDayDateForProgramDay(
      currentBlock,
      week,
      day,
      getOrderedWeekDays(),
      blockWeeks,
    );
  }


  function getDayDate(day: ProgramDay | number) {
    if (typeof day === "number") {
      return getDayDateLabel(currentBlock, week, day, blockWeeks);
    }

    return getDayDateLabelForProgramDay(
      currentBlock,
      week,
      day,
      getOrderedWeekDays(),
      blockWeeks,
    );
  }


  function getDayDateInputValue(day: ProgramDay) {
    return getProgramDayDateInputValue(
      currentBlock,
      week,
      day,
      getOrderedWeekDays(),
      blockWeeks,
    );
  }


  function formatDate(date: string | null) {
    if (!date) return "Geen startdatum";

    return formatDutchDateWithFullMonth(new Date(date));
  }


  const getBlockStartDateObject = getBlockStartDateObjectValue;
  const getBlockEndDateObject = getBlockEndDateObjectValue;
  function getWeekStartDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
    return getWeekStartDateObjectValue(block, programWeek, blockWeeks);
  }
  function getWeekEndDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
    return getWeekEndDateObjectValue(block, programWeek, blockWeeks);
  }
  const formatDateRangeLabel = formatDateRangeLabelValue;


  function hasExercises(dayId: string) {
    return (exercisesByDay[dayId] || []).length > 0;
  }


  function getExerciseColorClass(exerciseName: string | null | undefined) {
    const cleanName = (exerciseName || "").toLowerCase();

    if (cleanName.includes("squat")) {
      return "bg-[#6fa8dc] border-[#6fa8dc] hover:bg-[#669fd3]";
    }

    if (
      cleanName.includes("benchpress") ||
      cleanName.includes("bench press") ||
      cleanName.includes("bench")
    ) {
      return "bg-[#9fc5e8] border-[#9fc5e8] hover:bg-[#94badf]";
    }

    if (cleanName.includes("deadlift")) {
      return "bg-[#cfe2f3] border-[#cfe2f3] hover:bg-[#c4d7e8]";
    }

    return "bg-gray-50 border-gray-200 hover:border-black hover:bg-gray-100";
  }


  function getCoachExerciseColorClass(exerciseName: string | null | undefined) {
    const cleanName = (exerciseName || "").toLowerCase();

    if (cleanName.includes("squat")) {
      return "coach-exercise-tone coach-exercise-tone-squat";
    }

    if (
      cleanName.includes("benchpress") ||
      cleanName.includes("bench press") ||
      cleanName.includes("bench")
    ) {
      return "coach-exercise-tone coach-exercise-tone-bench";
    }

    if (cleanName.includes("deadlift")) {
      return "coach-exercise-tone coach-exercise-tone-deadlift";
    }

    return "coach-exercise-tone coach-exercise-tone-default";
  }


  function getExercisePriority(exercise: ProgramExercise) {
    return (exercise.priority || "").toString().trim().toLowerCase();
  }


  function getExercisePriorityLabel(exercise: ProgramExercise) {
    const priority = getExercisePriority(exercise);

    if (!priority) return "";
    if (priority === "primary") return "Primary";
    if (priority === "secondary") return "Secondary";
    if (priority === "tertiary") return "Tertiary";
    if (priority === "quaternary") return "Quaternary";
    if (priority === "quinary") return "Quinary";
    if (priority === "senary") return "Senary";
    if (priority === "septenary") return "Septenary";

    return "";
  }


  function getExercisePriorityShortLabel(exercise: ProgramExercise) {
    const label = getExercisePriorityLabel(exercise);
    if (!label) return "—";
    return label.slice(0, 3).toUpperCase();
  }


  function getExercisePriorityClass(exercise: ProgramExercise) {
    const priority = getExercisePriority(exercise);

    if (!priority) {
      return "bg-gray-50 text-gray-500 border-gray-200";
    }

    if (priority === "primary") {
      return "bg-red-100 text-red-700 border-red-200";
    }

    if (priority === "secondary") {
      return "bg-orange-100 text-orange-700 border-orange-200";
    }

    if (priority === "tertiary") {
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }

    if (priority === "quaternary") {
      return "bg-green-100 text-green-700 border-green-200";
    }

    if (priority === "quinary") {
      return "bg-blue-100 text-blue-700 border-blue-200";
    }

    if (priority === "senary") {
      return "bg-purple-100 text-purple-700 border-purple-200";
    }

    if (priority === "septenary") {
      return "bg-pink-100 text-pink-700 border-pink-200";
    }

    return "bg-gray-100 text-gray-700 border-gray-200";
  }


  function getDisplayIntensity(exercise: ProgramExercise) {
    return formatPrescriptionIntensity(exercise, athleteCurrentMaxes);
  }


  function getInlineE1rmLabel(
    exercise: ProgramExercise,
    row: AthleteExerciseSet,
  ) {
    if (!showE1rmInline) return null;
    const weight = parseSetNumber(row.weight);
    const reps = parseSetNumber(row.reps);
    const rpe = parseSetNumber(row.rpe);
    if (weight === null || reps === null) return null;
    const e1rm = estimateE1rmFromSet(weight, reps, rpe);
    if (e1rm === null) return null;
    return `e1RM ~${formatAverageValue(e1rm)} kg`;
  }


  function getWeightValue(exercise: ProgramExercise) {
    if (!exercise.load) return "";

    return exercise.load
      .replace("%", "")
      .replace("kg", "")
      .replace("KG", "")
      .trim();
  }


  function parseNumberValue(value: string | null | undefined) {
    if (!value) return null;

    const cleanValue = value.toString().replace(",", ".").trim();
    const match = cleanValue.match(/-?\d+(\.\d+)?/);

    if (!match) return null;

    const numberValue = Number(match[0]);
    return Number.isFinite(numberValue) ? numberValue : null;
  }


  function formatAverageValue(value: number) {
    const roundedValue = Math.round(value * 10) / 10;

    if (Number.isInteger(roundedValue)) {
      return String(roundedValue);
    }

    return roundedValue.toFixed(1).replace(".", ",");
  }


  function getSetCount(exercise: ProgramExercise) {
    const rawSets = (exercise.sets || "").trim();
    const match = rawSets.match(/\d+/);

    if (!match) return 1;

    const count = Number(match[0]);

    if (!Number.isFinite(count) || count < 1) return 1;
    if (count > 20) return 20;

    return count;
  }


  function getCoachSetRowsForExercise(exercise: ProgramExercise) {
    const existingRows = athleteSetInputs[exercise.id] || [];
    return mergeAthleteSetRowsWithDefaults(
      exercise,
      existingRows,
      getSetCount(exercise),
    );
  }


  function getAthleteSetAverage(
    exercise: ProgramExercise,
    field: "reps" | "weight" | "rpe",
  ) {
    const rows = getCoachSetRowsForExercise(exercise);
    const values = rows
      .map((row) => parseNumberValue(row[field]))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return "-";

    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    return formatAverageValue(average);
  }


  function getPlannedNumber(value: string | null | undefined) {
    if (!value) return 0;

    const match = value.toString().replace(",", ".").match(/\d+(\.\d+)?/);
    if (!match) return 0;

    const numberValue = Number(match[0]);
    return Number.isFinite(numberValue) ? numberValue : 0;
  }


  function getShortSbdWeekSummary() {
    const summary = {
      squat: { label: "SQ", sets: 0, reps: 0 },
      bench: { label: "BP", sets: 0, reps: 0 },
      deadlift: { label: "DL", sets: 0, reps: 0 },
    };

    Object.values(exercisesByDay)
      .flat()
      .forEach((exercise) => {
        const cleanName = (exercise.name || "").toLowerCase();
        const sets = getPlannedNumber(exercise.sets);
        const repsPerSet = getPlannedNumber(exercise.reps);
        const totalReps = sets * repsPerSet;

        if (cleanName.includes("squat")) {
          summary.squat.sets += sets;
          summary.squat.reps += totalReps;
        } else if (cleanName.includes("bench")) {
          summary.bench.sets += sets;
          summary.bench.reps += totalReps;
        } else if (cleanName.includes("deadlift")) {
          summary.deadlift.sets += sets;
          summary.deadlift.reps += totalReps;
        }
      });

    return [summary.squat, summary.bench, summary.deadlift];
  }


  return {
    openDayNoteId,
    setOpenDayNoteId,
    openDayWarmupId,
    setOpenDayWarmupId,
    openExerciseNoteId,
    setOpenExerciseNoteId,
    isCreatingDay,
    setIsCreatingDay,
    newDayTitle,
    setNewDayTitle,
    newDayInputRef,
    creatingExerciseDayId,
    setCreatingExerciseDayId,
    exerciseName,
    setExerciseName,
    exerciseSets,
    setExerciseSets,
    exerciseReps,
    setExerciseReps,
    exerciseIntensity,
    setExerciseIntensity,
    exerciseLoadKg,
    setExerciseLoadKg,
    exerciseNameInputRef,
    draggedExercise,
    exerciseDropIndicator,
    draggedDayId,
    dayDropIndicator,
    uitlegMode,
    setUitlegMode,
    createDay,
    updateDayLocal,
    saveDayMeta,
    saveDayField,
    deleteDayField,
    addExercise,
    insertExerciseFromRaw,
    applyRawClipboardPaste,
    duplicateExerciseRow,
    updateExerciseLocal,
    saveExerciseField,
    saveExerciseFields,
    saveExercisePriority,
    handleCoachExerciseEnter,
    deleteExerciseNote,
    updateIntensityType,
    deleteExercise,
    deleteDay,
    duplicateDay,
    handleDragStart,
    handleDragOver,
    saveDayOrder,
    handleExerciseDragStart,
    handleExerciseDragOver,
    handleExerciseDragOverDay,
    handleExerciseDragOverDayTail,
    saveExerciseOrder,
    handleNewExerciseFormKeyDown,
    getDayDate,
    getDayDateObject,
    getDayDateInputValue,
    hasExercises,
    getExercisePriority,
    getExercisePriorityLabel,
    getDisplayIntensity,
    getInlineE1rmLabel,
    getAthleteSetAverage,
    getShortSbdWeekSummary,
    getBlockStartDateObject,
    getBlockEndDateObject,
    getWeekStartDateObject,
    getWeekEndDateObject,
    formatDateRangeLabel,
  };
}
