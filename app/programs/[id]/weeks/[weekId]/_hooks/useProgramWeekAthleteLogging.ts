"use client";

import { useState, type Dispatch, SetStateAction } from "react";
import { loadPreviousWeekExerciseSets as fetchPreviousWeekExerciseSets } from "../_utils/loadPreviousWeekExerciseSets";
import {
  getOfflineSetQueueCount,
  persistAthleteSetRow,
} from "@/lib/offlineLogQueue";
import {
  routeAthleteExerciseVideo,
  type AthleteVideoSubmitTarget,
} from "@/lib/athleteVideoSubmit";
import { captureVideoThumbnail } from "@/lib/videoThumbnail";
import { mergeAthleteSetRowsWithDefaults } from "@/lib/athleteSetDefaults";
import { estimateE1rmFromSet, formatPrescriptionIntensity, parseSetNumber } from "@/lib/exercisePrescription";
import { normalizeExerciseName } from "@/lib/programWeek/exerciseUtils";
import type {
  AthleteDayCheckin,
  AthleteExerciseNote,
  AthleteExerciseSet,
  AthleteExerciseVideo,
  PreviousWeekSetData,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import type { ProgramBlock } from "@/lib/programWeek/types";
import { supabase } from "@/lib/supabaseClient";
import { getUnknownErrorMessage } from "../_utils/programWeekProviderUtils";

export type UseProgramWeekAthleteLoggingOptions = {
  getOwnerAthleteId: () => string;
  runSave: (callback: () => Promise<void>) => Promise<void>;
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
  currentBlock: ProgramBlock | null;
  week: ProgramWeek | null;
  athleteCoachId: string;
  userId: string;
  role: string;
  onOfflineQueueCountChange: (count: number) => void;
  videoSubmitTarget: AthleteVideoSubmitTarget;
  showE1rmInline: boolean;
  athleteCurrentMaxes: import("@/lib/athleteCurrentMaxes").AthleteCurrentMaxes | null;
};

export function useProgramWeekAthleteLogging({
  getOwnerAthleteId,
  runSave,
  days,
  exercisesByDay,
  currentBlock,
  week,
  athleteCoachId,
  userId,
  role,
  onOfflineQueueCountChange,
  videoSubmitTarget,
  showE1rmInline,
  athleteCurrentMaxes,
}: UseProgramWeekAthleteLoggingOptions) {
  const [athleteExercisePanelOpen, setAthleteExercisePanelOpen] = useState(false);
  const [selectedAthleteExerciseId, setSelectedAthleteExerciseId] = useState("");
  const [athleteSetInputs, setAthleteSetInputs] = useState<Record<string, AthleteExerciseSet[]>>({});
  const [loadingAthleteSets, setLoadingAthleteSets] = useState(false);
  const [athleteNotesByExercise, setAthleteNotesByExercise] = useState<Record<string, AthleteExerciseNote>>({});
  const [athleteVideosBySet, setAthleteVideosBySet] = useState<Record<string, AthleteExerciseVideo>>({});
  const [uploadingVideoSetKey, setUploadingVideoSetKey] = useState("");
  const [athleteDayCheckins, setAthleteDayCheckins] = useState<Record<string, AthleteDayCheckin>>({});
  const [openAthleteDayNotesId, setOpenAthleteDayNotesId] = useState("");
  const [athleteNotePanelOpen, setAthleteNotePanelOpen] = useState(false);
  const [previousWeekOpen, setPreviousWeekOpen] = useState(false);
  const [loadingPreviousWeekSets, setLoadingPreviousWeekSets] = useState(false);
  const [previousWeekData, setPreviousWeekData] = useState<PreviousWeekSetData | null>(null);
  const [previousWeekMessage, setPreviousWeekMessage] = useState("");

  function resetPreviousWeekData() {
    setPreviousWeekOpen(false);
    setPreviousWeekData(null);
    setPreviousWeekMessage("");
    setLoadingPreviousWeekSets(false);
  }


  async function loadPreviousWeekExerciseSets(
    currentDay: ProgramDay,
    currentExercise: ProgramExercise,
  ) {
    await fetchPreviousWeekExerciseSets({
      ownerAthleteId: getOwnerAthleteId(),
      currentBlockId: currentBlock?.id,
      weekNumber: week?.week_number,
      currentDay,
      currentExercise,
      exercisesByDay,
      setPreviousWeekOpen,
      setLoadingPreviousWeekSets,
      setPreviousWeekData,
      setPreviousWeekMessage,
    });
  }


  async function loadVisibleAthleteDayCheckins() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId || days.length === 0) return;

    const dayIds = days
      .map((day) => day.id)
      .filter((dayId) => !athleteDayCheckins[dayId]);

    if (dayIds.length === 0) return;

    const { data, error } = await supabase
      .from("athlete_day_checkins")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_day_id", dayIds);

    if (error) {
      console.error("LOAD DAY CHECKIN ERROR:", error);
      console.error(
        "LOAD DAY CHECKIN ERROR JSON:",
        JSON.stringify(error, null, 2),
      );
      return;
    }

    const grouped: Record<string, AthleteDayCheckin> = {};

    dayIds.forEach((dayId) => {
      grouped[dayId] = {
        program_day_id: dayId,
        athlete_id: ownerAthleteId,
        bw: "",
        recovery: null,
        fatigue: null,
        notes: "",
      };
    });

    (data || []).forEach((row) => {
      grouped[row.program_day_id] = row;
    });

    setAthleteDayCheckins((current) => ({
      ...current,
      ...grouped,
    }));
  }


  function getAthleteDayCheckin(dayId: string) {
    const ownerAthleteId = getOwnerAthleteId();

    return (
      athleteDayCheckins[dayId] || {
        program_day_id: dayId,
        athlete_id: ownerAthleteId,
        bw: "",
        recovery: null,
        fatigue: null,
        notes: "",
      }
    );
  }


  function updateAthleteDayCheckinLocal(
    dayId: string,
    updates: Partial<AthleteDayCheckin>,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    setAthleteDayCheckins((current) => ({
      ...current,
      [dayId]: {
        ...(current[dayId] || {
          program_day_id: dayId,
          athlete_id: ownerAthleteId,
          bw: "",
          recovery: null,
          fatigue: null,
          notes: "",
        }),
        ...updates,
      },
    }));
  }


  async function saveAthleteDayCheckin(
    dayId: string,
    updates: Partial<AthleteDayCheckin>,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    const currentCheckin = getAthleteDayCheckin(dayId);
    const nextCheckin = {
      program_day_id: dayId,
      athlete_id: ownerAthleteId,
      bw: updates.bw !== undefined ? updates.bw : currentCheckin.bw || "",
      recovery:
        updates.recovery !== undefined
          ? updates.recovery
          : currentCheckin.recovery,
      fatigue:
        updates.fatigue !== undefined
          ? updates.fatigue
          : currentCheckin.fatigue,
      notes:
        updates.notes !== undefined
          ? updates.notes
          : currentCheckin.notes || "",
    };

    const previousCheckins = athleteDayCheckins;

    setAthleteDayCheckins((current) => ({
      ...current,
      [dayId]: nextCheckin,
    }));

    try {
      await runSave(async () => {
        const { data: existingCheckin, error: findError } = await supabase
          .from("athlete_day_checkins")
          .select("id")
          .eq("program_day_id", dayId)
          .eq("athlete_id", ownerAthleteId)
          .maybeSingle();

        if (findError) throw findError;

        if (existingCheckin?.id) {
          const { error: updateError } = await supabase
            .from("athlete_day_checkins")
            .update({
              bw: nextCheckin.bw,
              recovery: nextCheckin.recovery,
              fatigue: nextCheckin.fatigue,
              notes: nextCheckin.notes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingCheckin.id);

          if (updateError) throw updateError;
          return;
        }

        const { error: insertError } = await supabase
          .from("athlete_day_checkins")
          .insert(nextCheckin);

        if (insertError) throw insertError;
      });
    } catch {
      setAthleteDayCheckins(previousCheckins);
    }
  }


  async function loadVisibleAthleteSetInputs() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    const exerciseIds = Object.values(exercisesByDay)
      .flat()
      .map((exercise) => exercise.id)
      .filter((exerciseId) => !athleteSetInputs[exerciseId]);

    if (exerciseIds.length === 0) return;

    const { data, error } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_exercise_id", exerciseIds)
      .order("set_number", { ascending: true });

    if (error) {
      console.error("LOAD ERROR:", error);
      console.error("LOAD ERROR JSON:", JSON.stringify(error, null, 2));
      return;
    }

    const grouped: Record<string, AthleteExerciseSet[]> = {};

    exerciseIds.forEach((exerciseId) => {
      grouped[exerciseId] = [];
    });

    (data || []).forEach((row) => {
      if (!grouped[row.program_exercise_id])
        grouped[row.program_exercise_id] = [];
      grouped[row.program_exercise_id].push(row);
    });

    setAthleteSetInputs((current) => ({
      ...current,
      ...grouped,
    }));
  }


  async function loadVisibleAthleteExerciseNotes() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    const exerciseIds = Object.values(exercisesByDay)
      .flat()
      .map((exercise) => exercise.id)
      .filter((exerciseId) => !athleteNotesByExercise[exerciseId]);

    if (exerciseIds.length === 0) return;

    const { data, error } = await supabase
      .from("athlete_exercise_notes")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_exercise_id", exerciseIds);

    if (error) {
      console.error("LOAD ERROR:", error);
      console.error("LOAD ERROR JSON:", JSON.stringify(error, null, 2));
      return;
    }

    const grouped: Record<string, AthleteExerciseNote> = {};

    exerciseIds.forEach((exerciseId) => {
      grouped[exerciseId] = {
        program_exercise_id: exerciseId,
        athlete_id: ownerAthleteId,
        notes: "",
      };
    });

    (data || []).forEach((row) => {
      grouped[row.program_exercise_id] = row;
    });

    setAthleteNotesByExercise((current) => ({
      ...current,
      ...grouped,
    }));
  }


  function getAthleteSetVideoKey(exerciseId: string, setNumber: number) {
    return `${exerciseId}-${setNumber}`;
  }


  async function loadVisibleAthleteSetVideos() {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    const visiblePairs = Object.values(exercisesByDay)
      .flat()
      .flatMap((exercise) =>
        buildEmptySetRows(exercise).map((row) => ({
          exerciseId: exercise.id,
          setNumber: row.set_number,
          key: getAthleteSetVideoKey(exercise.id, row.set_number),
        })),
      )
      .filter((item) => !athleteVideosBySet[item.key]);

    if (visiblePairs.length === 0) return;

    const exerciseIds = Array.from(
      new Set(visiblePairs.map((item) => item.exerciseId)),
    );

    const { data, error } = await supabase
      .from("athlete_exercise_videos")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .in("program_exercise_id", exerciseIds);

    if (error) {
      console.error("LOAD VIDEO ERROR:", error);
      console.error("LOAD VIDEO ERROR JSON:", JSON.stringify(error, null, 2));
      return;
    }

    const grouped: Record<string, AthleteExerciseVideo> = {};

    visiblePairs.forEach((item) => {
      grouped[item.key] = {
        program_exercise_id: item.exerciseId,
        athlete_id: ownerAthleteId,
        set_number: item.setNumber,
        video_url: null,
        video_path: null,
        file_name: null,
        caption: null,
      };
    });

    (data || []).forEach((row) => {
      const setNumber = row.set_number || 1;
      grouped[getAthleteSetVideoKey(row.program_exercise_id, setNumber)] = {
        ...row,
        set_number: setNumber,
      };
    });

    setAthleteVideosBySet((current) => ({
      ...current,
      ...grouped,
    }));
  }


  function getAthleteSetVideo(exerciseId: string, setNumber: number) {
    return athleteVideosBySet[getAthleteSetVideoKey(exerciseId, setNumber)];
  }


  async function uploadAthleteSetVideo(
    exercise: ProgramExercise,
    setNumber: number,
    file: File | null,
    caption: string | null = null,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    if (!file) return;

    if (!file.type.startsWith("video/")) {
      alert("Kies een videobestand");
      return;
    }

    const maxSizeMb = 250;
    const maxSizeBytes = maxSizeMb * 1024 * 1024;

    if (file.size > maxSizeBytes) {
      alert(`Video is te groot. Maximaal ${maxSizeMb} MB.`);
      return;
    }

    const videoKey = getAthleteSetVideoKey(exercise.id, setNumber);
    const previousVideos = athleteVideosBySet;
    const currentVideo = athleteVideosBySet[videoKey];
    const localPreviewUrl = URL.createObjectURL(file);

    setAthleteVideosBySet((current) => ({
      ...current,
      [videoKey]: {
        program_exercise_id: exercise.id,
        athlete_id: ownerAthleteId,
        set_number: setNumber,
        video_url: localPreviewUrl,
        video_path: null,
        file_name: file.name,
        caption,
      },
    }));

    setUploadingVideoSetKey(videoKey);

    if (currentVideo?.video_path) {
      void supabase.storage
        .from("exercise-videos")
        .remove([currentVideo.video_path]);
    }

    const thumbnailPromise = captureVideoThumbnail(file).catch(() => null);

    try {
      const extension = file.name.split(".").pop() || "mp4";
      const safeFileName = `${Date.now()}-set-${setNumber}.${extension}`;
      const filePath = `${ownerAthleteId}/${exercise.id}/set-${setNumber}/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("exercise-videos")
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("exercise-videos")
        .getPublicUrl(filePath);

      const videoRow = {
        program_exercise_id: exercise.id,
        athlete_id: ownerAthleteId,
        set_number: setNumber,
        video_url: publicUrlData.publicUrl,
        video_path: filePath,
        file_name: file.name,
        caption,
      };

      const { data: existingVideo, error: findError } = await supabase
        .from("athlete_exercise_videos")
        .select("id")
        .eq("program_exercise_id", exercise.id)
        .eq("athlete_id", ownerAthleteId)
        .eq("set_number", setNumber)
        .maybeSingle();

      if (findError) throw findError;

      if (existingVideo?.id) {
        const { error: updateError } = await supabase
          .from("athlete_exercise_videos")
          .update(videoRow)
          .eq("id", existingVideo.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("athlete_exercise_videos")
          .insert(videoRow);

        if (insertError) throw insertError;
      }

      URL.revokeObjectURL(localPreviewUrl);

      setAthleteVideosBySet((current) => ({
        ...current,
        [videoKey]: videoRow,
      }));

      setUploadingVideoSetKey("");

      void finalizeAthleteSetVideoDelivery({
        exercise,
        setNumber,
        ownerAthleteId,
        publicVideoUrl: publicUrlData.publicUrl,
        caption,
        thumbnailPromise,
      });
    } catch (error: unknown) {
      console.error("VIDEO UPLOAD ERROR:", error);
      console.error("VIDEO UPLOAD ERROR JSON:", JSON.stringify(error, null, 2));
      URL.revokeObjectURL(localPreviewUrl);
      setAthleteVideosBySet(previousVideos);
      alert(getUnknownErrorMessage(error, "Video uploaden mislukt"));
      setUploadingVideoSetKey("");
    }
  }

  async function finalizeAthleteSetVideoDelivery(params: {
    exercise: ProgramExercise;
    setNumber: number;
    ownerAthleteId: string;
    publicVideoUrl: string;
    caption: string | null;
    thumbnailPromise: Promise<Blob | null>;
  }) {
    let thumbnailUrl: string | null = null;

    try {
      const thumbnailBlob = await params.thumbnailPromise;

      if (thumbnailBlob) {
        const thumbnailPath = `${params.ownerAthleteId}/${params.exercise.id}/set-${params.setNumber}/thumb-${Date.now()}.jpg`;

        const { error: thumbnailUploadError } = await supabase.storage
          .from("exercise-videos")
          .upload(thumbnailPath, thumbnailBlob, {
            upsert: true,
            contentType: "image/jpeg",
          });

        if (!thumbnailUploadError) {
          const { data: thumbnailPublicUrl } = supabase.storage
            .from("exercise-videos")
            .getPublicUrl(thumbnailPath);

          thumbnailUrl = thumbnailPublicUrl.publicUrl;
        }
      }
    } catch (thumbnailError) {
      console.error("VIDEO THUMBNAIL ERROR:", thumbnailError);
    }

    if (role !== "atleet" || !userId || !athleteCoachId) return;

    const setRow = getSetRowsForExercise(params.exercise).find(
      (row) => row.set_number === params.setNumber,
    );

    const { error: routeError } = await routeAthleteExerciseVideo({
      athleteId: userId,
      coachId: athleteCoachId,
      target: videoSubmitTarget,
      videoUrl: params.publicVideoUrl,
      thumbnailUrl,
      caption: params.caption,
      exerciseName: normalizeExerciseName(params.exercise.name),
      setNumber: params.setNumber,
      reps: setRow?.reps || null,
      coachReps: params.exercise.reps || null,
      weight: setRow?.weight || null,
      rpe: setRow?.rpe || null,
      priority: params.exercise.priority || null,
    });

    if (routeError) {
      console.error("VIDEO ROUTE ERROR:", routeError);
    }
  }


  async function deleteAthleteSetVideo(
    exercise: ProgramExercise,
    setNumber: number,
  ) {
    const ownerAthleteId = getOwnerAthleteId();
    const videoKey = getAthleteSetVideoKey(exercise.id, setNumber);
    const currentVideo = athleteVideosBySet[videoKey];

    if (!ownerAthleteId || !currentVideo?.video_url) return;

    const previousVideos = athleteVideosBySet;

    setAthleteVideosBySet((current) => ({
      ...current,
      [videoKey]: {
        ...currentVideo,
        video_url: null,
        video_path: null,
        file_name: null,
        caption: null,
      },
    }));

    try {
      if (currentVideo.video_path) {
        const { error: storageError } = await supabase.storage
          .from("exercise-videos")
          .remove([currentVideo.video_path]);

        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from("athlete_exercise_videos")
        .delete()
        .eq("program_exercise_id", exercise.id)
        .eq("athlete_id", ownerAthleteId)
        .eq("set_number", setNumber);

      if (error) throw error;
    } catch (error: unknown) {
      console.error("VIDEO DELETE ERROR:", error);
      setAthleteVideosBySet(previousVideos);
      alert(getUnknownErrorMessage(error, "Video verwijderen mislukt"));
    }
  }


  function getAthleteExerciseNote(exerciseId: string) {
    return athleteNotesByExercise[exerciseId]?.notes || "";
  }


  function updateAthleteExerciseNoteLocal(exercise: ProgramExercise, value: string) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    setAthleteNotesByExercise((current) => ({
      ...current,
      [exercise.id]: {
        ...(current[exercise.id] || {
          program_exercise_id: exercise.id,
          athlete_id: ownerAthleteId,
        }),
        notes: value,
      },
    }));
  }


  async function saveAthleteExerciseNote(
    exercise: ProgramExercise,
    value: string,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    const noteRow = {
      program_exercise_id: exercise.id,
      athlete_id: ownerAthleteId,
      notes: value.trim(),
    };

    const previousNotes = athleteNotesByExercise;

    setAthleteNotesByExercise((current) => ({
      ...current,
      [exercise.id]: noteRow,
    }));

    try {
      await runSave(async () => {
        const { data: existingNote, error: findError } = await supabase
          .from("athlete_exercise_notes")
          .select("id")
          .eq("program_exercise_id", exercise.id)
          .eq("athlete_id", ownerAthleteId)
          .maybeSingle();

        if (findError) throw findError;

        if (existingNote?.id) {
          const { error: updateError } = await supabase
            .from("athlete_exercise_notes")
            .update({
              notes: noteRow.notes,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingNote.id);

          if (updateError) throw updateError;
          return;
        }

        const { error: insertError } = await supabase
          .from("athlete_exercise_notes")
          .insert(noteRow);

        if (insertError) throw insertError;
      });
    } catch {
      setAthleteNotesByExercise(previousNotes);
    }
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


  function getSelectedAthleteExercise() {
    for (const day of days) {
      const exercise = (exercisesByDay[day.id] || []).find(
        (item) => item.id === selectedAthleteExerciseId,
      );

      if (exercise) {
        return { day, exercise };
      }
    }

    return null;
  }


  function buildEmptySetRows(exercise: ProgramExercise) {
    return Array.from({ length: getSetCount(exercise) }, (_, index) => ({
      program_exercise_id: exercise.id,
      athlete_id: getOwnerAthleteId(),
      set_number: index + 1,
      reps: "",
      weight: "",
      rpe: "",
    }));
  }


  function findExerciseById(exerciseId: string) {
    for (const dayExercises of Object.values(exercisesByDay)) {
      const found = dayExercises.find((item) => item.id === exerciseId);
      if (found) return found;
    }
    return null;
  }


  function getSetRowsForExercise(exercise: ProgramExercise) {
    const existingRows = athleteSetInputs[exercise.id] || [];
    const emptyRows = buildEmptySetRows(exercise);

    return emptyRows.map((emptyRow) => {
      const existingRow = existingRows.find(
        (item) => item.set_number === emptyRow.set_number,
      );

      return existingRow ? { ...emptyRow, ...existingRow } : emptyRow;
    });
  }


  async function openAthleteExercisePanel(exerciseId: string) {
    resetPreviousWeekData();
    setAthleteNotePanelOpen(false);
    setSelectedAthleteExerciseId(exerciseId);
    setAthleteExercisePanelOpen(true);
    await loadAthleteExerciseSets(exerciseId);
  }


  async function loadAthleteExerciseSets(exerciseId: string) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) return;

    setLoadingAthleteSets(true);

    const { data, error } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .eq("program_exercise_id", exerciseId)
      .eq("athlete_id", ownerAthleteId)
      .order("set_number", { ascending: true });

    setLoadingAthleteSets(false);

    if (error) {
      alert(error.message);
      return;
    }

    const exercise = findExerciseById(exerciseId);
    const mergedRows = exercise
      ? mergeAthleteSetRowsWithDefaults(
          exercise,
          data || [],
          getSetCount(exercise),
        )
      : data || [];

    setAthleteSetInputs((current) => ({
      ...current,
      [exerciseId]: mergedRows,
    }));
  }


  function updateAthleteSetLocal(
    exercise: ProgramExercise,
    setNumber: number,
    field: "reps" | "weight" | "rpe",
    value: string,
  ) {
    const currentRows = getSetRowsForExercise(exercise);

    setAthleteSetInputs((current) => ({
      ...current,
      [exercise.id]: currentRows.map((row) =>
        row.set_number === setNumber
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    }));
  }


  async function saveAthleteSetField(
    exercise: ProgramExercise,
    setNumber: number,
    field: "reps" | "weight" | "rpe",
    value: string,
  ) {
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden");
      return;
    }

    const currentRows = getSetRowsForExercise(exercise);
    const currentRow = currentRows.find((row) => row.set_number === setNumber);

    const nextRow = {
      program_exercise_id: exercise.id,
      athlete_id: ownerAthleteId,
      set_number: setNumber,
      reps: currentRow?.reps || "",
      weight: currentRow?.weight || "",
      rpe: currentRow?.rpe || "",
      [field]: value,
    };

    const previousInputs = athleteSetInputs;

    setAthleteSetInputs((current) => ({
      ...current,
      [exercise.id]: getSetRowsForExercise(exercise).map((row) =>
        row.set_number === setNumber
          ? {
              ...row,
              ...nextRow,
            }
          : row,
      ),
    }));

    try {
      await runSave(async () => {
        await persistAthleteSetRow(nextRow);
      });

      onOfflineQueueCountChange(getOfflineSetQueueCount());
    } catch {
      setAthleteSetInputs(previousInputs);
    }
  }


  async function copyAthleteSetToNextRow(
    exercise: ProgramExercise,
    row: AthleteExerciseSet,
  ) {
    const ownerAthleteId = getOwnerAthleteId();
    const nextSetNumber = row.set_number + 1;
    const rows = getSetRowsForExercise(exercise);
    const nextRowExists = rows.some(
      (item) => item.set_number === nextSetNumber,
    );

    if (!ownerAthleteId || !nextRowExists) return;

    const copiedRow = {
      program_exercise_id: exercise.id,
      athlete_id: ownerAthleteId,
      set_number: nextSetNumber,
      reps: row.reps || "",
      weight: row.weight || "",
      rpe: row.rpe || "",
    };

    const previousInputs = athleteSetInputs;

    setAthleteSetInputs((current) => ({
      ...current,
      [exercise.id]: rows.map((item) =>
        item.set_number === nextSetNumber
          ? {
              ...item,
              ...copiedRow,
            }
          : item,
      ),
    }));

    try {
      await runSave(async () => {
        await persistAthleteSetRow(copiedRow);
      });
      onOfflineQueueCountChange(getOfflineSetQueueCount());
    } catch {
      setAthleteSetInputs(previousInputs);
    }
  }


  async function handleAthleteSetArrowNavigation(
    e: React.KeyboardEvent<HTMLInputElement>,
  ) {
    const target = e.currentTarget;
    const panel = target.closest("[data-athlete-set-panel='true']");

    if (!panel) return;

    if (e.key === "Enter") {
      e.preventDefault();

      const selected = getSelectedAthleteExercise();
      const setNumber = Number(target.dataset.setNumber || "0");
      const field = target.dataset.athleteField as
        | "reps"
        | "weight"
        | "rpe"
        | undefined;

      if (selected && setNumber > 0 && field) {
        await saveAthleteSetField(
          selected.exercise,
          setNumber,
          field,
          target.value,
        );
      }

      setAthleteExercisePanelOpen(false);
      setSelectedAthleteExerciseId("");
      setAthleteNotePanelOpen(false);
      return;
    }

    const fields = Array.from(
      panel.querySelectorAll<HTMLInputElement>(
        "input[data-athlete-set-input='true']",
      ),
    );
    const currentIndex = fields.indexOf(target);

    if (currentIndex === -1) return;

    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      const nextField = fields[currentIndex + 1];

      if (nextField) {
        nextField.focus();
        nextField.select();
      }
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      const previousField = fields[currentIndex - 1];

      if (previousField) {
        previousField.focus();
        previousField.select();
      }
    }
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


  function getAverageFromRows(
    rows: AthleteExerciseSet[],
    field: "reps" | "weight" | "rpe",
  ) {
    const values = rows
      .map((row) => parseNumberValue(row[field]))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return "-";

    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    return formatAverageValue(average);
  }


  return {
    athleteExercisePanelOpen,
    setAthleteExercisePanelOpen,
    selectedAthleteExerciseId,
    setSelectedAthleteExerciseId,
    athleteSetInputs,
    loadingAthleteSets,
    athleteNotesByExercise,
    athleteVideosBySet,
    uploadingVideoSetKey,
    athleteDayCheckins,
    openAthleteDayNotesId,
    setOpenAthleteDayNotesId,
    athleteNotePanelOpen,
    setAthleteNotePanelOpen,
    previousWeekOpen,
    loadingPreviousWeekSets,
    previousWeekData,
    previousWeekMessage,
    resetPreviousWeekData,
    loadPreviousWeekExerciseSets,
    getAthleteDayCheckin,
    updateAthleteDayCheckinLocal,
    saveAthleteDayCheckin,
    getAthleteExerciseNote,
    updateAthleteExerciseNoteLocal,
    saveAthleteExerciseNote,
    getSelectedAthleteExercise,
    getSetRowsForExercise,
    openAthleteExercisePanel,
    updateAthleteSetLocal,
    saveAthleteSetField,
    copyAthleteSetToNextRow,
    handleAthleteSetArrowNavigation,
    getAthleteSetVideo,
    getAthleteSetVideoKey,
    uploadAthleteSetVideo,
    deleteAthleteSetVideo,
    getAverageFromRows,
    loadVisibleAthleteDayCheckins,
    loadVisibleAthleteSetInputs,
    loadVisibleAthleteExerciseNotes,
    loadVisibleAthleteSetVideos,
  };
}
