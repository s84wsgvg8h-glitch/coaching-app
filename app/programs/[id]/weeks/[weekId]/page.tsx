// app/programs/[id]/weeks/[weekId]/page.tsx

"use client";

import { useEffect, useRef, useState, useTransition, useMemo } from "react";
import dynamic from "next/dynamic";
import { createPortal } from "react-dom";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ApplyTemplateModalLazy,
  BlockIntakeWizardModalLazy,
  ExerciseLibraryPickerModalLazy,
  ExerciseLibraryVideoModalLazy,
  ProgramPlanningCalendarLazy,
} from "@/components/programs/week/WeekPageLazyPanels";
import { useOfflineSetSync } from "@/hooks/useOfflineSetSync";
import {
  getOfflineSetQueueCount,
  persistAthleteSetRow,
} from "@/lib/offlineLogQueue";
import {
  ensureBlockIntakeWizard,
  loadBlockIntakeForAthlete,
  type BlockIntakeWizard,
} from "@/lib/blockIntakeWizard";
import {
  loadAthleteCurrentMaxes,
  type AthleteCurrentMaxes,
} from "@/lib/athleteCurrentMaxes";
import { loadAthleteCoachPreferences } from "@/lib/athletePreferences";
import {
  estimateE1rmFromSet,
  formatPrescriptionIntensity,
  parseSetNumber,
} from "@/lib/exercisePrescription";
import ProgramNavSidebarRail from "@/components/programs/ProgramNavSidebarRail";
import ProgramWeekSkeleton from "@/components/programs/ProgramWeekSkeleton";
import { useAuth } from "@/components/AuthProvider";

const CoachProgramWeekContent = dynamic(
  () => import("@/components/programs/coach/CoachProgramWeekContent"),
  { loading: () => <ProgramWeekSkeleton /> },
);

const AthleteProgramSidebar = dynamic(
  () => import("@/components/programs/athlete/AthleteProgramSidebar"),
  { ssr: false },
);

const AthleteProgramWeekContent = dynamic(
  () => import("@/components/programs/athlete/AthleteProgramWeekContent"),
  { loading: () => <ProgramWeekSkeleton /> },
);

const AthleteExerciseFillPanel = dynamic(
  () => import("@/components/programs/athlete/AthleteExerciseFillPanel"),
  { ssr: false },
);
import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import CoachMobileBottomNav from "@/components/coach/CoachMobileBottomNav";
import DemoModeBanner from "@/components/DemoModeBanner";
import { CreateTemplateButton } from "@/components/programs/ProgramTemplateActions";
import ProgramBlockDateField, {
  toDateInputValue,
} from "@/components/programs/ProgramBlockDateField";
import ProgramBlockEditModal, {
  persistBlockEditModalNote,
} from "@/components/programs/ProgramBlockEditModal";
import ProgramWeekEditModal, {
  persistWeekEditModalNote,
} from "@/components/programs/ProgramWeekEditModal";
import { supabase } from "@/lib/supabaseClient";
import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";
import {
  loadExerciseLibraryItems,
  type ExerciseLibraryItem,
} from "@/lib/exerciseLibrary";
import {
  createProgramMacrocycle,
  loadProgramMacrocycles,
  type ProgramMacrocycle,
} from "@/lib/programMacrocycles";
import {
  loadAthleteVideoSubmitTarget,
  routeAthleteExerciseVideo,
  saveAthleteVideoSubmitTarget,
  type AthleteVideoSubmitTarget,
} from "@/lib/athleteVideoSubmit";
import { captureVideoThumbnail } from "@/lib/videoThumbnail";
import {
  isDayPast,
  hasIncompleteSetField,
} from "@/lib/programDayValidation";
import { mergeAthleteSetRowsWithDefaults } from "@/lib/athleteSetDefaults";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  normalizeExerciseName,
  getPriorityClass,
  isPriorityExercise,
} from "@/lib/programWeek/exerciseUtils";
import {
  priorityOptions,
  type AthleteDayCheckin,
  type AthleteExerciseNote,
  type AthleteExerciseSet,
  type AthleteExerciseVideo,
  type PreviousWeekSetData,
  type ProgramBlock,
  type ProgramDay,
  type ProgramExercise,
  type ProgramWeek,
  type VideoRecorderTarget,
} from "@/lib/programWeek/types";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

import { DELETE_X_BTN, setEmptyDragImage } from "@/lib/programWeek/constants";
import {
  formatDate,
  formatDateRangeLabel,
  formatDutchDateWithFullMonth,
  getBlockEndDateObject,
  getBlockStartDateObject,
  getDayDateLabel,
  getDayDateLabelForProgramDay,
  getDayDateInputValue as getProgramDayDateInputValue,
  getDayDateObject as getProgramDayDateObject,
  getDayDateForProgramDay,
  getWeekEndDateObject,
  getWeekStartDateObject,
} from "@/lib/programWeek/dateFormatting";
import { buildWeekStatsReport } from "@/lib/programWeek/weekStats";
import {
  getCoachExerciseColorClass,
  getDisplayIntensity as getDisplayIntensityValue,
  getExerciseColorClass,
  getExercisePriority,
  getExercisePriorityClass,
  getExercisePriorityLabel,
  getExercisePriorityShortLabel,
  getIntensityType,
  getIntensityValue,
  getPlannedNumber,
} from "@/lib/programWeek/exerciseDisplay";

export default function ProgramWeekPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const blockId = params.id as string;
  const weekId = params.weekId as string;
  const athleteId = searchParams.get("athlete");
  const focusDayId = searchParams.get("focusDay");
  const embeddedInChat = searchParams.get("embedded") === "chat";
  const [blockIntakeWizard, setBlockIntakeWizard] =
    useState<BlockIntakeWizard | null>(null);

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");

  const [currentBlock, setCurrentBlock] = useState<ProgramBlock | null>(null);
  const [week, setWeek] = useState<ProgramWeek | null>(null);
  const [days, setDays] = useState<ProgramDay[]>([]);

  const [navBlocks, setNavBlocks] = useState<ProgramBlock[]>([]);
  const [navMacrocycles, setNavMacrocycles] = useState<ProgramMacrocycle[]>([]);
  const [weeksByBlock, setWeeksByBlock] = useState<
    Record<string, ProgramWeek[]>
  >({});
  const [openBlockIds, setOpenBlockIds] = useState<Record<string, boolean>>({});
  const [openMacrocycleIds, setOpenMacrocycleIds] = useState<
    Record<string, boolean>
  >({});

  const [creatingMacrocycle, setCreatingMacrocycle] = useState(false);
  const [newMacrocycleTitle, setNewMacrocycleTitle] = useState("");
  const [newBlockMacrocycleId, setNewBlockMacrocycleId] = useState("");
  const [editingBlockMacrocycleId, setEditingBlockMacrocycleId] = useState("");

  const [creatingBlock, setCreatingBlock] = useState(false);
  const [newBlockTitle, setNewBlockTitle] = useState("");
  const [newBlockDescription, setNewBlockDescription] = useState("");
  const [newBlockStartDate, setNewBlockStartDate] = useState("");

  const [editingBlockId, setEditingBlockId] = useState("");
  const [editingBlockTitle, setEditingBlockTitle] = useState("");
  const [editingBlockStartDate, setEditingBlockStartDate] = useState("");

  const [creatingWeekBlockId, setCreatingWeekBlockId] = useState("");
  const [newWeekTitle, setNewWeekTitle] = useState("");
  const [programAddMenuOpen, setProgramAddMenuOpen] = useState(false);

  const [editingWeekId, setEditingWeekId] = useState("");
  const [editingWeekTitle, setEditingWeekTitle] = useState("");

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

  const [openDayNoteId, setOpenDayNoteId] = useState("");
  const [openDayWarmupId, setOpenDayWarmupId] = useState("");
  const [openExerciseNoteId, setOpenExerciseNoteId] = useState("");

  const [exercisesByDay, setExercisesByDay] = useState<
    Record<string, ProgramExercise[]>
  >({});

  const [isCreatingDay, setIsCreatingDay] = useState(false);
  const [newDayTitle, setNewDayTitle] = useState("");
  const newDayInputRef = useRef<HTMLInputElement | null>(null);

  const [creatingExerciseDayId, setCreatingExerciseDayId] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [exerciseSets, setExerciseSets] = useState("");
  const [exerciseReps, setExerciseReps] = useState("");
  const [exerciseIntensity, setExerciseIntensity] = useState("");
  const [exerciseIntensityType, setExerciseIntensityType] = useState("rpe");

  const exerciseNameInputRef = useRef<HTMLInputElement | null>(null);
  const [draggedExercise, setDraggedExercise] = useState<{
    dayId: string;
    exerciseId: string;
  } | null>(null);
  const [exerciseDropIndicator, setExerciseDropIndicator] = useState<{
    dayId: string;
    targetId: string;
    position: "before" | "after";
  } | null>(null);
  const originalExerciseOrderRef = useRef<string[]>([]);
  const exerciseDropIndicatorRef = useRef<{
    dayId: string;
    targetId: string;
    position: "before" | "after";
  } | null>(null);
  const [templateApplyOpen, setTemplateApplyOpen] = useState(false);

  const [isPending, startTransition] = useTransition();
  const [navigatingUrl, setNavigatingUrl] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const saveStatusTimeoutRef = useRef<number | null>(null);

  const [athleteExercisePanelOpen, setAthleteExercisePanelOpen] =
    useState(false);
  const [selectedAthleteExerciseId, setSelectedAthleteExerciseId] =
    useState("");
  const [athleteSetInputs, setAthleteSetInputs] = useState<
    Record<string, AthleteExerciseSet[]>
  >({});
  const [loadingAthleteSets, setLoadingAthleteSets] = useState(false);
  const [athleteNotesByExercise, setAthleteNotesByExercise] = useState<
    Record<string, AthleteExerciseNote>
  >({});
  const [athleteVideosBySet, setAthleteVideosBySet] = useState<
    Record<string, AthleteExerciseVideo>
  >({});
  const [uploadingVideoSetKey, setUploadingVideoSetKey] = useState("");
  const [videoSubmitTarget, setVideoSubmitTarget] =
    useState<AthleteVideoSubmitTarget>("chat");
  const [athleteCoachId, setAthleteCoachId] = useState("");
  const [athleteCurrentMaxes, setAthleteCurrentMaxes] =
    useState<AthleteCurrentMaxes | null>(null);
  const [showE1rmInline, setShowE1rmInline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);

  useOfflineSetSync(setOfflineQueueCount);
  const [videoRecorderOpen, setVideoRecorderOpen] = useState(false);
  const [videoRecorderTarget, setVideoRecorderTarget] =
    useState<VideoRecorderTarget | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<
    "user" | "environment"
  >("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("");
  const [recordedVideoFile, setRecordedVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimmingVideo, setTrimmingVideo] = useState(false);
  const [videoCaption, setVideoCaption] = useState("");
  const [flashOn, setFlashOn] = useState(false);
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [activeTrimHandle, setActiveTrimHandle] = useState<"start" | "end" | null>(
    null,
  );
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const trimSliderRef = useRef<HTMLDivElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [athleteDayCheckins, setAthleteDayCheckins] = useState<
    Record<string, AthleteDayCheckin>
  >({});
  const [openAthleteDayNotesId, setOpenAthleteDayNotesId] = useState("");
  const [athleteNotePanelOpen, setAthleteNotePanelOpen] = useState(false);
  const [previousWeekOpen, setPreviousWeekOpen] = useState(false);
  const [loadingPreviousWeekSets, setLoadingPreviousWeekSets] = useState(false);
  const [previousWeekData, setPreviousWeekData] =
    useState<PreviousWeekSetData | null>(null);
  const [previousWeekMessage, setPreviousWeekMessage] = useState("");
  const [blockNavOpen, setBlockNavOpen] = useState(false);
  const [weekNavOpen, setWeekNavOpen] = useState(false);
  const blockNavRef = useRef<HTMLDivElement | null>(null);
  const weekNavRef = useRef<HTMLDivElement | null>(null);
  const [uitlegMode, setUitlegMode] = useState(false);
  const [libraryItems, setLibraryItems] = useState<ExerciseLibraryItem[]>([]);
  const [libraryItemsById, setLibraryItemsById] = useState<
    Record<string, ExerciseLibraryItem>
  >({});
  const [linkingExercise, setLinkingExercise] = useState<ProgramExercise | null>(
    null,
  );
  const [previewLibraryItem, setPreviewLibraryItem] =
    useState<ExerciseLibraryItem | null>(null);
  const [planningSplitOpen, setPlanningSplitOpen] = useState(false);
  const [planningPanelHeight, setPlanningPanelHeight] = useState(360);
  const planningResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const planningAthleteId = athleteId || currentBlock?.athlete_id || "";
  const [athleteDisplayName, setAthleteDisplayName] = useState("Atleet");
  const [programReady, setProgramReady] = useState(false);
  const { role: authRole, loading: authLoading } = useAuth();
  const effectiveRole = role || authRole;
  const isAthleteView = effectiveRole === "atleet";
  const isCoachView = isCoachLikeRole(effectiveRole);

  useEffect(() => {
    setNavigatingUrl("");
    loadData();
  }, [blockId, weekId]);

  useEffect(() => {
    if (!focusDayId || days.length === 0) return;
    const element = document.getElementById(`program-day-${focusDayId}`);
    element?.scrollIntoView({
      behavior: "smooth",
      block: "start",
      inline: "start",
    });
  }, [focusDayId, days]);

  useEffect(() => {
    if (role !== "atleet" || !userId) return;
    void loadBlockIntakeForAthlete(userId).then(({ data }) => {
      if (data && !data.completed_at) setBlockIntakeWizard(data);
    });
    void loadAthleteCurrentMaxes(userId).then(setAthleteCurrentMaxes);
    void loadAthleteCoachPreferences(userId).then((prefs) =>
      setShowE1rmInline(prefs.show_e1rm_inline),
    );
  }, [role, userId, blockId]);

  useEffect(() => {
    if (!creatingExerciseDayId) return;

    const timeout = window.setTimeout(() => {
      exerciseNameInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [creatingExerciseDayId]);

  useEffect(() => {
    if (!isCreatingDay) return;

    const timeout = window.setTimeout(() => {
      newDayInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [isCreatingDay]);

  useEffect(() => {
    loadVisibleAthleteSetInputs();
    loadVisibleAthleteExerciseNotes();
    loadVisibleAthleteSetVideos();
  }, [userId, athleteId, exercisesByDay]);

  useEffect(() => {
    loadVisibleAthleteDayCheckins();
  }, [userId, athleteId, days]);

  useEffect(() => {
    if (!videoRecorderOpen) {
      stopCameraStream();
      return;
    }

    if (recordedVideoUrl) {
      stopCameraStream();
    }
  }, [videoRecorderOpen, recordedVideoUrl]);

  useEffect(() => {
    if (!videoRecorderOpen || recordedVideoUrl) return;

    stopCameraStream();
    void startCameraStream();
  }, [cameraFacingMode]);

  useEffect(() => {
    void applyTorch(flashOn);
  }, [flashOn]);

  useEffect(() => {
    if (!videoRecorderOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;
    const previousTouchAction = document.body.style.touchAction;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    if (!recordedVideoUrl) {
      document.body.style.touchAction = "none";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [videoRecorderOpen, recordedVideoUrl]);

  useEffect(() => {
    if (!athleteExercisePanelOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [athleteExercisePanelOpen]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
      stopCameraStream();
      stopRecordingTimer();
    };
  }, [recordedVideoUrl]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (blockNavRef.current && !blockNavRef.current.contains(target)) {
        setBlockNavOpen(false);
      }

      if (weekNavRef.current && !weekNavRef.current.contains(target)) {
        setWeekNavOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function scrollMobileFieldIntoView(target: HTMLElement) {
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }

  function setSavedSoon() {
    setSaveState("saved");

    if (saveStatusTimeoutRef.current) {
      window.clearTimeout(saveStatusTimeoutRef.current);
    }

    saveStatusTimeoutRef.current = window.setTimeout(() => {
      setSaveState("saved");
    }, 1200);
  }

  async function runSave(callback: () => Promise<void>) {
    try {
      setSaveState("saving");
      await callback();
      setSavedSoon();
    } catch (error: any) {
      console.error("SAVE ERROR:", error);
      console.error("SAVE ERROR JSON:", JSON.stringify(error, null, 2));

      setSaveState("error");

      alert(
        error?.message ||
          error?.details ||
          error?.hint ||
          JSON.stringify(error, null, 2) ||
          "Opslaan mislukt",
      );

      throw error;
    }
  }

  function getOwnerAthleteId() {
    return (
      athleteId || currentBlock?.athlete_id || (role === "atleet" ? userId : "")
    );
  }

  async function loadData() {
    setProgramReady(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const [profileResult, blockResult, weekResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("program_blocks").select("*").eq("id", blockId).maybeSingle(),
      supabase.from("program_weeks").select("*").eq("id", weekId).maybeSingle(),
    ]);

    const profile = profileResult.data;
    if (profile) {
      setRole(profile.role || "");
    }

    const blockData = blockResult.data || null;
    const weekData = weekResult.data || null;
    setCurrentBlock(blockData);
    setWeek(weekData);

    await loadDays();
    setProgramReady(true);

    void (async () => {
      const items = await loadExerciseLibraryItems(false);
      setLibraryItems(items);
      setLibraryItemsById(
        Object.fromEntries(items.map((item) => [item.id, item])),
      );

      await loadProgramNavigation(
        blockData,
        profile?.role || "",
        user.id,
      );

      const ownerAthleteId =
        athleteId ||
        blockData?.athlete_id ||
        (profile?.role === "atleet" ? user.id : "");

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
          athleteProfile?.coach_id || profile?.coach_id || user.id,
        );
        setVideoSubmitTarget(submitTarget);
      }
    })();
  }

  async function loadProgramNavigation(
    blockData: ProgramBlock | null,
    loadedRole: string,
    loadedUserId: string,
  ) {
    const ownerAthleteId =
      athleteId ||
      blockData?.athlete_id ||
      (loadedRole === "atleet" ? loadedUserId : "");

    if (!ownerAthleteId) return;

    const { data: blocksData } = await supabase
      .from("program_blocks")
      .select("*")
      .eq("athlete_id", ownerAthleteId)
      .order("start_date", { ascending: true });

    const loadedBlocks = blocksData || [];
    setNavBlocks(loadedBlocks);

    const macrocycles = await loadProgramMacrocycles(ownerAthleteId);
    setNavMacrocycles(macrocycles);

    const activeBlock = loadedBlocks.find((block) => block.id === blockId);
    const openMacroState: Record<string, boolean> = {};
    macrocycles.forEach((macrocycle) => {
      openMacroState[macrocycle.id] =
        macrocycle.id === activeBlock?.macrocycle_id ||
        openMacrocycleIds[macrocycle.id] ||
        false;
    });
    setOpenMacrocycleIds(openMacroState);

    const blockIds = loadedBlocks.map((block) => block.id);

    if (blockIds.length === 0) {
      setWeeksByBlock({});
      return;
    }

    const { data: weeksData } = await supabase
      .from("program_weeks")
      .select("*")
      .in("program_block_id", blockIds)
      .order("week_number", { ascending: true });

    const grouped: Record<string, ProgramWeek[]> = {};

    loadedBlocks.forEach((block) => {
      grouped[block.id] = [];
    });

    (weeksData || []).forEach((item) => {
      if (!grouped[item.program_block_id]) grouped[item.program_block_id] = [];
      grouped[item.program_block_id].push(item);
    });

    setWeeksByBlock(grouped);

    const openState: Record<string, boolean> = {};
    loadedBlocks.forEach((block) => {
      openState[block.id] =
        block.id === blockId || openBlockIds[block.id] || false;
    });

    setOpenBlockIds(openState);
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

  function programUrl(targetBlockId: string, targetWeekId: string) {
    return athleteId
      ? `/programs/${targetBlockId}/weeks/${targetWeekId}?athlete=${athleteId}`
      : `/programs/${targetBlockId}/weeks/${targetWeekId}`;
  }

  function goToUrl(url: string) {
    if (!url || navigatingUrl === url) return;

    setNavigatingUrl(url);

    startTransition(() => {
      router.push(url);
    });
  }

  function goToProgram(targetBlockId: string, targetWeekId: string) {
    goToUrl(programUrl(targetBlockId, targetWeekId));
  }

  function goToBlock(targetBlockId: string) {
    if (targetBlockId === blockId) return;

    const blockWeeks = weeksByBlock[targetBlockId] || [];

    if (blockWeeks.length === 0) {
      goToUrl(programUrl(targetBlockId, weekId));
      return;
    }

    const preferredWeek =
      blockWeeks.find((item) => item.week_number === week?.week_number) ||
      blockWeeks[0];

    goToProgram(targetBlockId, preferredWeek.id);
  }

  function renderBlockWeekNav() {
    const darkNav = role === "atleet" || isCoachLikeRole(role);
    const blockWeeks = weeksByBlock[blockId] || [];
    const activeBlock = navBlocks.find((block) => block.id === blockId) || currentBlock;
    const activeWeek = blockWeeks.find((item) => item.id === weekId) || week;

    const activeBlockStart = activeBlock
      ? getBlockStartDateObject(activeBlock)
      : null;
    const activeBlockEnd = activeBlock
      ? getBlockEndDateObject(activeBlock, blockWeeks)
      : null;
    const activeWeekStart =
      activeBlock && activeWeek
        ? getWeekStartDateObject(activeBlock, activeWeek)
        : null;
    const activeWeekEnd =
      activeBlock && activeWeek
        ? getWeekEndDateObject(activeBlock, activeWeek)
        : null;

    return (
      <div
        className={`program-mobile-week-nav sticky top-0 z-20 -mx-3 mb-4 space-y-3 px-3 pb-3 pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur lg:hidden md:-mx-6 md:px-6 ${
          darkNav ? "program-mobile-week-nav--dark" : "border-b border-gray-200 bg-gray-100/95"
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          <div ref={blockNavRef} className="relative min-w-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Block
            </p>
            <button
              type="button"
              onClick={() => {
                setWeekNavOpen(false);
                setBlockNavOpen((current) => !current);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-left text-sm font-bold transition active:scale-95 ${
                blockId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeBlock?.title || "Block"}
                <span
                  className={`block text-[11px] font-semibold ${
                    blockId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeBlockStart, activeBlockEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  blockId ? "text-white/70" : "text-gray-400"
                }`}
              >
                ▼
              </span>
            </button>

            {blockNavOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                {navBlocks.map((block) => {
                  const weeksForBlock = weeksByBlock[block.id] || [];
                  const blockStart = getBlockStartDateObject(block);
                  const blockEnd = getBlockEndDateObject(block, weeksForBlock);
                  const isActive = block.id === blockId;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => {
                        setBlockNavOpen(false);
                        goToBlock(block.id);
                      }}
                      className={`flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                        isActive ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="truncate text-sm font-bold text-black">
                        {block.title}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {formatDateRangeLabel(blockStart, blockEnd)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={weekNavRef} className="relative min-w-0">
            <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
              Week
            </p>
            <button
              type="button"
              onClick={() => {
                setBlockNavOpen(false);
                setWeekNavOpen((current) => !current);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-left text-sm font-bold transition active:scale-95 ${
                weekId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeWeek?.title || "Week"}
                <span
                  className={`block text-[11px] font-semibold ${
                    weekId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeWeekStart, activeWeekEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  weekId ? "text-white/70" : "text-gray-400"
                }`}
              >
                ▼
              </span>
            </button>

            {weekNavOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                {blockWeeks.map((item) => {
                  const weekStart =
                    activeBlock ? getWeekStartDateObject(activeBlock, item) : null;
                  const weekEnd =
                    activeBlock ? getWeekEndDateObject(activeBlock, item) : null;
                  const isActive = item.id === weekId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setWeekNavOpen(false);
                        goToProgram(blockId, item.id);
                      }}
                      className={`flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                        isActive ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="truncate text-sm font-bold text-black">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {formatDateRangeLabel(weekStart, weekEnd)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {isCoachLikeRole(role) && (
          <div className="flex flex-wrap gap-2">
            {renderProgramAddMenu(
              "rounded-full border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 active:scale-95",
            )}
          </div>
        )}

        {isCoachLikeRole(role) && creatingMacrocycle && (
          <div className="rounded-2xl border border-purple-200 bg-white p-3 shadow-sm">
            <input
              value={newMacrocycleTitle}
              onChange={(e) => setNewMacrocycleTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createMacrocycle();
              }}
              placeholder="Naam macrocycle"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createMacrocycle}
                className="flex-1 rounded-xl bg-purple-700 px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingMacrocycle(false);
                  setNewMacrocycleTitle("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {isCoachLikeRole(role) && creatingBlock && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <input
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createBlock();
              }}
              placeholder="Naam block"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <ProgramBlockDateField
              value={newBlockStartDate}
              onChange={setNewBlockStartDate}
              className="mb-2"
            />
            <textarea
              value={newBlockDescription}
              onChange={(e) => setNewBlockDescription(e.target.value)}
              placeholder="Beschrijving"
              className="mb-2 min-h-[70px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            {navMacrocycles.length > 0 && (
              <select
                value={newBlockMacrocycleId}
                onChange={(e) => setNewBlockMacrocycleId(e.target.value)}
                className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
              >
                <option value="">Geen macrocycle</option>
                {navMacrocycles.map((macrocycle) => (
                  <option key={macrocycle.id} value={macrocycle.id}>
                    {macrocycle.title}
                  </option>
                ))}
              </select>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createBlock}
                className="flex-1 rounded-xl bg-black px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingBlock(false);
                  setNewBlockTitle("");
                  setNewBlockDescription("");
                  setNewBlockStartDate("");
                  setNewBlockMacrocycleId("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {isCoachLikeRole(role) && creatingWeekBlockId === blockId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <input
              value={newWeekTitle}
              onChange={(e) => setNewWeekTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createWeek(blockId);
              }}
              placeholder="Naam week"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => createWeek(blockId)}
                className="flex-1 rounded-xl bg-black px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingWeekBlockId("");
                  setNewWeekTitle("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderBlocksSidebar() {
    const coachProgramUi = isCoachLikeRole(role);
    const orderedSidebarBlocks = [
      ...navMacrocycles.flatMap((macrocycle) =>
        navBlocks.filter((block) => block.macrocycle_id === macrocycle.id),
      ),
      ...navBlocks.filter((block) => !block.macrocycle_id),
    ];
    const emptyMacrocycles = navMacrocycles.filter(
      (macrocycle) =>
        !navBlocks.some((block) => block.macrocycle_id === macrocycle.id),
    );
    const sidebarExpanded =
      programAddMenuOpen ||
      creatingMacrocycle ||
      creatingBlock ||
      Boolean(creatingWeekBlockId);

    const sidebarPinned =
      sidebarExpanded ||
      programAddMenuOpen ||
      Boolean(editingBlockId) ||
      Boolean(editingWeekId);

    const coachRailWeeks = (weeksByBlock[blockId] || []).map((item) => ({
      id: item.id,
      label: item.title,
      isActive: item.id === weekId,
    }));

    return (
              <aside
                className={
                  coachProgramUi
                    ? `program-nav-sidebar coach-program-sidebar sticky top-0 hidden h-screen self-start z-40 lg:flex ${
                        sidebarPinned ? "is-pinned" : ""
                      }`
                    : `group/blocks sticky top-0 hidden h-screen self-start overflow-y-auto border-r border-gray-200 bg-white p-3 z-20 transition-all duration-200 lg:block ${
                        sidebarExpanded
                          ? "w-[300px] min-w-[300px]"
                          : "w-[70px] min-w-[70px] [@media(hover:hover)]:hover:w-[300px] [@media(hover:hover)]:hover:min-w-[300px]"
                      }`
                }
              >
                {coachProgramUi ? (
                  <ProgramNavSidebarRail
                    weeks={coachRailWeeks}
                    onSelectWeek={(targetWeekId) =>
                      goToProgram(blockId, targetWeekId)
                    }
                    showAddButton
                    onAddClick={() => setProgramAddMenuOpen((open) => !open)}
                  />
                ) : null}

                <div
                  className={
                    coachProgramUi
                      ? "program-nav-sidebar-flyout coach-program-sidebar-flyout"
                      : undefined
                  }
                >
                <div
                  className={
                    coachProgramUi
                      ? "coach-program-sidebar-header flex items-center justify-between mb-4"
                      : "flex items-center justify-between mb-4"
                  }
                >
                  <div
                    className={
                      coachProgramUi
                        ? "min-w-0"
                        : `transition-all duration-150 overflow-hidden whitespace-nowrap ${
                            sidebarExpanded
                              ? "opacity-100"
                              : "opacity-0 group-hover/blocks:opacity-100"
                          }`
                    }
                  >
                    <h2 className="text-lg font-bold">Programma</h2>
                    <p className="text-xs text-gray-500">Macrocycles, blocks en weken</p>
                  </div>
      
                  {!coachProgramUi ? (
                  <div
                    className={`text-xl ${
                      sidebarExpanded
                        ? "hidden"
                        : "opacity-100 group-hover/blocks:opacity-0 absolute left-5 top-5"
                    }`}
                  >
                    📚
                  </div>
                  ) : null}
      
                  {isCoachLikeRole(role) &&
                    renderProgramAddMenu(
                      coachProgramUi
                        ? "coach-program-sidebar-add-btn flex h-9 w-9 min-w-9 items-center justify-center rounded-xl text-xl text-white"
                        : "flex h-9 w-9 min-w-9 items-center justify-center rounded-xl bg-black text-xl text-white",
                    )}
                </div>
      
                <div
                  className={
                    coachProgramUi
                      ? undefined
                      : `transition-all duration-150 ${
                          sidebarExpanded
                            ? "opacity-100"
                            : "opacity-0 group-hover/blocks:opacity-100"
                        }`
                  }
                >
                  {isCoachLikeRole(role) && creatingMacrocycle && (
                    <div className="bg-purple-50 rounded-2xl p-3 mb-4 border border-purple-100">
                      <input
                        value={newMacrocycleTitle}
                        onChange={(e) => setNewMacrocycleTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createMacrocycle();
                        }}
                        placeholder="Naam macrocycle"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={createMacrocycle}
                          className="flex-1 bg-purple-700 text-white rounded-xl px-3 py-2 text-sm"
                        >
                          Opslaan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingMacrocycle(false);
                            setNewMacrocycleTitle("");
                          }}
                          className="flex-1 bg-white text-black rounded-xl px-3 py-2 text-sm"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  )}

                  {isCoachLikeRole(role) && creatingBlock && (
                    <div className="bg-gray-100 rounded-2xl p-3 mb-4">
                      <input
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createBlock();
                        }}
                        placeholder="Naam block"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
                      />
      
                      <ProgramBlockDateField
                        value={newBlockStartDate}
                        onChange={setNewBlockStartDate}
                        className="mb-2"
                      />
      
                      <textarea
                        value={newBlockDescription}
                        onChange={(e) => setNewBlockDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            createBlock();
                          }
                        }}
                        placeholder="Beschrijving"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none resize-none min-h-[70px] text-black"
                      />

                      {navMacrocycles.length > 0 && (
                        <select
                          value={newBlockMacrocycleId}
                          onChange={(e) => setNewBlockMacrocycleId(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
                        >
                          <option value="">Geen macrocycle</option>
                          {navMacrocycles.map((macrocycle) => (
                            <option key={macrocycle.id} value={macrocycle.id}>
                              {macrocycle.title}
                            </option>
                          ))}
                        </select>
                      )}
      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={createBlock}
                          className="flex-1 bg-black text-white rounded-xl px-3 py-2 text-sm"
                        >
                          Opslaan
                        </button>
      
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingBlock(false);
                            setNewBlockTitle("");
                            setNewBlockDescription("");
                            setNewBlockStartDate("");
                            setNewBlockMacrocycleId("");
                          }}
                          className="flex-1 bg-white text-black rounded-xl px-3 py-2 text-sm"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {orderedSidebarBlocks.map((block, index) => {
                      const macrocycle = navMacrocycles.find(
                        (item) => item.id === block.macrocycle_id,
                      );
                      const previousBlock = orderedSidebarBlocks[index - 1];
                      const showMacrocycleHeader =
                        macrocycle &&
                        previousBlock?.macrocycle_id !== block.macrocycle_id;
                      const showUnassignedHeader =
                        !macrocycle &&
                        navMacrocycles.length > 0 &&
                        previousBlock?.macrocycle_id;

                      const isOpen = openBlockIds[block.id];
                      const activeBlock = block.id === blockId;
                      const blockWeeks = weeksByBlock[block.id] || [];
      
                      return (
                        <div key={block.id}>
                          {showMacrocycleHeader && (
                            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                              {macrocycle.title}
                            </p>
                          )}
                          {showUnassignedHeader && (
                            <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                              Losse blocks
                            </p>
                          )}
                        <div
                          className={`rounded-2xl border overflow-hidden ${
                            activeBlock ? "border-black" : "border-gray-200"
                          }`}
                        >
                          <div
                            className={`group/block p-3 ${
                              activeBlock
                                ? "bg-black text-white"
                                : "bg-gray-50 text-black"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenBlockIds((current) => ({
                                    ...current,
                                    [block.id]: !current[block.id],
                                  }))
                                }
                                className="flex-1 text-left"
                              >
                                <p
                                  className={`text-[10px] mb-1 ${
                                    activeBlock ? "text-gray-300" : "text-gray-400"
                                  }`}
                                >
                                  {formatDate(block.start_date)}
                                </p>
      
                                <h3 className="font-bold text-sm leading-tight">
                                  {isOpen ? "⌄" : "›"} {block.title}
                                </h3>
                              </button>
      
                              {isCoachLikeRole(role) && (
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setEditingBlockId(block.id);
                                      setEditingBlockTitle(block.title);
                                      setEditingBlockStartDate(
                                        block.start_date || "",
                                      );
                                      setEditingBlockMacrocycleId(
                                        block.macrocycle_id || "",
                                      );
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs ${
                                      activeBlock
                                        ? "bg-white/20 hover:bg-white/30 text-white"
                                        : "bg-white hover:bg-gray-100 text-black"
                                    }`}
                                    title="Aanpassen"
                                  >
                                    ✎
                                  </button>
      
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      duplicateBlock(block);
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs ${
                                      activeBlock
                                        ? "bg-white/20 hover:bg-white/30 text-white"
                                        : "bg-white hover:bg-gray-100 text-black"
                                    }`}
                                    title="Dupliceren"
                                  >
                                    ⧉
                                  </button>

                                  <CreateTemplateButton
                                    coachId={userId}
                                    blockId={block.id}
                                    actingUserId={userId}
                                    actingRole={role}
                                    compact
                                    activeTone={activeBlock ? "dark" : "light"}
                                  />
      
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      deleteBlock(block);
                                    }}
                                    className={`${DELETE_X_BTN} opacity-0 group-hover/block:opacity-100 ${
                                      activeBlock ? "opacity-100" : ""
                                    }`}
                                    title="Verwijderen"
                                  >
                                    ✕
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
      
                          {isOpen && (
                            <div className="p-2 bg-white space-y-2">
                              {blockWeeks.map((item) => {
                                const activeWeek = item.id === weekId;
      
                                return (
                                  <div
                                    key={item.id}
                                    className={`group/week rounded-xl ${
                                      coachProgramUi
                                        ? `coach-program-sidebar-week ${
                                            activeWeek ? "is-active" : ""
                                          }`
                                        : activeWeek
                                          ? "bg-black text-white"
                                          : "bg-gray-100 text-black"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 p-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            goToProgram(block.id, item.id)
                                          }
                                          className="flex-1 text-left text-sm font-semibold"
                                        >
                                          {item.title}
                                        </button>
      
                                        {isCoachLikeRole(role) && (
                                          <>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setEditingWeekId(item.id);
                                                setEditingWeekTitle(item.title);
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs ${
                                                activeWeek
                                                  ? "bg-white/20 text-white"
                                                  : "bg-white text-black"
                                              }`}
                                              title="Aanpassen"
                                            >
                                              ✎
                                            </button>
      
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                duplicateWeek(item);
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs ${
                                                activeWeek
                                                  ? "bg-white/20 text-white"
                                                  : "bg-white text-black"
                                              }`}
                                              title="Dupliceren"
                                            >
                                              ⧉
                                            </button>

                                            <CreateTemplateButton
                                              coachId={userId}
                                              weekId={item.id}
                                              actingUserId={userId}
                                              actingRole={role}
                                              compact
                                              activeTone={activeWeek ? "dark" : "light"}
                                            />
      
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                deleteWeek(item);
                                              }}
                                              className={`${DELETE_X_BTN} opacity-0 group-hover/week:opacity-100 ${
                                                activeWeek ? "opacity-100" : ""
                                              }`}
                                              title="Verwijderen"
                                            >
                                              ✕
                                            </button>
                                          </>
                                        )}
                                      </div>
                                  </div>
                                );
                              })}
      
                              {isCoachLikeRole(role) &&
                                creatingWeekBlockId !== block.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCreatingWeekBlockId(block.id);
                                      setNewWeekTitle(
                                        `Week ${blockWeeks.length + 1}`,
                                      );
                                    }}
                                    className={`w-full rounded-xl border-2 border-dashed py-2 text-sm ${
                                      coachProgramUi
                                        ? "coach-program-sidebar-add-week"
                                        : "border-gray-300 text-gray-500 hover:border-black hover:text-black"
                                    }`}
                                  >
                                    + Week toevoegen
                                  </button>
                                )}
      
                              {isCoachLikeRole(role) &&
                                creatingWeekBlockId === block.id && (
                                  <div className="bg-gray-100 rounded-xl p-2">
                                    <input
                                      value={newWeekTitle}
                                      onChange={(e) =>
                                        setNewWeekTitle(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") createWeek(block.id);
                                      }}
                                      placeholder="Naam week"
                                      className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-2 text-black bg-white border border-gray-300"
                                    />
      
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => createWeek(block.id)}
                                        className="flex-1 bg-black text-white rounded-xl px-2 py-1 text-xs"
                                      >
                                        Opslaan
                                      </button>
      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCreatingWeekBlockId("");
                                          setNewWeekTitle("");
                                        }}
                                        className="flex-1 bg-white text-black rounded-xl px-2 py-1 text-xs"
                                      >
                                        Annuleer
                                      </button>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                        </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                </div>
              </aside>
      
    );
  }

  async function createBlock() {
    if (!newBlockTitle.trim()) {
      alert("Vul een naam in voor het block");
      return;
    }

    if (!newBlockStartDate) {
      alert("Kies een startdatum");
      return;
    }

    const ownerAthleteId =
      athleteId ||
      currentBlock?.athlete_id ||
      (role === "atleet" ? userId : "");

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden voor dit block");
      return;
    }

    if (role === "atleet") {
      alert("Vraag je coach om je programma in te zetten.");
      return;
    }

    const { blockId, error } = await createProgramBlockForAthlete({
      athleteId: ownerAthleteId,
      title: newBlockTitle.trim(),
      description: newBlockDescription.trim(),
      startDate: newBlockStartDate,
      macrocycleId: newBlockMacrocycleId || null,
    });

    if (error || !blockId) {
      alert(error || "Block kon niet worden aangemaakt");
      return;
    }

    const { data: createdWeek, error: weekError } = await supabase
      .from("program_weeks")
      .select("*")
      .eq("program_block_id", blockId)
      .order("week_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (weekError || !createdWeek) {
      alert(weekError?.message || "Week kon niet worden aangemaakt");
      return;
    }

    goToProgram(blockId, createdWeek.id);
  }

  function startProgramAdd(type: "macrocycle" | "block" | "week") {
    setProgramAddMenuOpen(false);

    if (type === "macrocycle") {
      setCreatingMacrocycle(true);
      setCreatingBlock(false);
      setCreatingWeekBlockId("");
      return;
    }

    if (type === "block") {
      setCreatingBlock(true);
      setCreatingMacrocycle(false);
      setCreatingWeekBlockId("");
      setNewBlockStartDate(toDateInputValue(new Date()));
      return;
    }

    const currentBlockWeeks = weeksByBlock[blockId] || [];
    setCreatingWeekBlockId(blockId);
    setNewWeekTitle(`Week ${currentBlockWeeks.length + 1}`);
    setCreatingMacrocycle(false);
    setCreatingBlock(false);
  }

  function renderProgramAddMenu(buttonClassName: string) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setProgramAddMenuOpen((open) => !open)}
          className={buttonClassName}
          title="Toevoegen"
        >
          +
        </button>

        {programAddMenuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
            <button
              type="button"
              onClick={() => startProgramAdd("macrocycle")}
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Macrocyclus
            </button>
            <button
              type="button"
              onClick={() => {
                setProgramAddMenuOpen(false);
                setTemplateApplyOpen(true);
              }}
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-purple-700 hover:bg-purple-50"
            >
              Template
            </button>
            <button
              type="button"
              onClick={() => startProgramAdd("block")}
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-black hover:bg-gray-50"
            >
              Block
            </button>
            <button
              type="button"
              onClick={() => startProgramAdd("week")}
              className="block w-full px-3 py-2 text-left text-sm font-semibold text-black hover:bg-gray-50"
            >
              Week
            </button>
          </div>
        )}
      </div>
    );
  }

  async function createMacrocycle() {
    if (!newMacrocycleTitle.trim()) {
      alert("Vul een naam in voor de macrocycle");
      return;
    }

    const ownerAthleteId =
      athleteId ||
      currentBlock?.athlete_id ||
      (role === "atleet" ? userId : "");

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden voor deze macrocycle");
      return;
    }

    const { data, error } = await createProgramMacrocycle(
      ownerAthleteId,
      newMacrocycleTitle,
      userId,
      navMacrocycles.length,
    );

    if (error || !data) {
      alert(error?.message || "Macrocycle kon niet worden aangemaakt");
      return;
    }

    setCreatingMacrocycle(false);
    setNewMacrocycleTitle("");
    setOpenMacrocycleIds((current) => ({
      ...current,
      [data.id]: true,
    }));
    await loadProgramNavigation(currentBlock, role, userId);
  }

  async function renameBlock(
    blockIdToRename: string,
    overrides?: {
      title?: string;
      startDate?: string;
      macrocycleId?: string;
      note?: string;
    },
  ) {
    const cleanTitle = (overrides?.title ?? editingBlockTitle).trim();
    const startDate = overrides?.startDate ?? editingBlockStartDate;
    const macrocycleId = overrides?.macrocycleId ?? editingBlockMacrocycleId;

    if (!cleanTitle) {
      alert("Vul een naam in");
      return;
    }

    const { data, error } = await supabase
      .from("program_blocks")
      .update({
        title: cleanTitle,
        start_date: startDate || null,
        macrocycle_id: macrocycleId || null,
      })
      .eq("id", blockIdToRename)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (!data) {
      alert("Block kon niet worden aangepast");
      return;
    }

    setNavBlocks((current) =>
      current.map((block) => (block.id === blockIdToRename ? data : block)),
    );

    if (currentBlock?.id === blockIdToRename) {
      setCurrentBlock(data);
    }

    if (overrides?.note !== undefined && planningAthleteId && userId) {
      await persistBlockEditModalNote(
        blockIdToRename,
        planningAthleteId,
        userId,
        overrides.note,
      );
    }

    setEditingBlockId("");
    setEditingBlockTitle("");
    setEditingBlockStartDate("");
    setEditingBlockMacrocycleId("");
    await loadProgramNavigation(data, role, userId);
  }

  function getNextBlockDuplicateTitle(blockToDuplicate: ProgramBlock) {
    const blockNumbers = navBlocks
      .map((block) => {
        const match = (block.title || "").match(/block\s*(\d+)/i);
        return match ? Number(match[1]) : null;
      })
      .filter(
        (value): value is number => value !== null && Number.isFinite(value),
      );

    const currentNumberMatch = (blockToDuplicate.title || "").match(
      /block\s*(\d+)/i,
    );
    const nextNumber =
      blockNumbers.length > 0
        ? Math.max(...blockNumbers) + 1
        : navBlocks.length + 1;

    if (currentNumberMatch) return `Block ${nextNumber}`;

    return `${blockToDuplicate.title} ${nextNumber}`.trim();
  }

  async function duplicateBlock(blockToDuplicate: ProgramBlock) {
    const ownerAthleteId =
      athleteId ||
      blockToDuplicate.athlete_id ||
      (role === "atleet" ? userId : "");

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden voor dit block");
      return;
    }

    const { data: createdBlock, error: blockError } = await supabase
      .from("program_blocks")
      .insert({
        title: getNextBlockDuplicateTitle(blockToDuplicate),
        description: blockToDuplicate.description || "",
        start_date: blockToDuplicate.start_date,
        created_by: userId,
        athlete_id: ownerAthleteId,
      })
      .select("*")
      .single();

    if (blockError || !createdBlock) {
      alert(blockError?.message || "Block kon niet worden gekopieerd");
      return;
    }

    const sourceWeeks = [...(weeksByBlock[blockToDuplicate.id] || [])].sort(
      (a, b) => a.week_number - b.week_number,
    );

    let firstCreatedWeekId = "";

    for (const sourceWeek of sourceWeeks) {
      const createdWeek = await copyWeekWithContent(
        sourceWeek,
        createdBlock.id,
        sourceWeek.week_number,
        sourceWeek.title,
      );

      if (!createdWeek) return;
      if (!firstCreatedWeekId) firstCreatedWeekId = createdWeek.id;
    }

    if (!firstCreatedWeekId) {
      const { data: createdWeek, error: weekError } = await supabase
        .from("program_weeks")
        .insert({
          title: "Week 1",
          week_number: 1,
          program_block_id: createdBlock.id,
        })
        .select("*")
        .single();

      if (weekError || !createdWeek) {
        alert(weekError?.message || "Week kon niet worden aangemaakt");
        return;
      }

      firstCreatedWeekId = createdWeek.id;
    }

    window.location.href = programUrl(createdBlock.id, firstCreatedWeekId);
  }

  async function deleteBlock(blockToDelete: ProgramBlock) {
    const { data: blockWeeks } = await supabase
      .from("program_weeks")
      .select("id")
      .eq("program_block_id", blockToDelete.id);

    const weekIds = (blockWeeks || []).map((item) => item.id);

    if (weekIds.length > 0) {
      const { data: blockDays } = await supabase
        .from("program_days")
        .select("id")
        .in("program_week_id", weekIds);

      const dayIds = (blockDays || []).map((day) => day.id);

      if (dayIds.length > 0) {
        const { error: exerciseError } = await supabase
          .from("program_exercises")
          .delete()
          .in("program_day_id", dayIds);

        if (exerciseError) {
          alert(exerciseError.message);
          return;
        }

        const { error: daysError } = await supabase
          .from("program_days")
          .delete()
          .in("id", dayIds);

        if (daysError) {
          alert(daysError.message);
          return;
        }
      }

      const { error: weeksError } = await supabase
        .from("program_weeks")
        .delete()
        .in("id", weekIds);

      if (weeksError) {
        alert(weeksError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("program_blocks")
      .delete()
      .eq("id", blockToDelete.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (blockToDelete.id === blockId) {
      window.location.href = athleteId
        ? `/athletes/${athleteId}`
        : "/athletes";
      return;
    }

    await loadData();
  }

  async function copyWeekWithContent(
    sourceWeek: ProgramWeek,
    targetBlockId: string,
    targetWeekNumber: number,
    targetTitle: string,
  ) {
    const { data: createdWeek, error: weekError } = await supabase
      .from("program_weeks")
      .insert({
        title: targetTitle,
        week_number: targetWeekNumber,
        program_block_id: targetBlockId,
      })
      .select("*")
      .single();

    if (weekError || !createdWeek) {
      alert(weekError?.message || "Week kon niet worden gekopieerd");
      return null;
    }

    const { data: sourceDays, error: daysLoadError } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_week_id", sourceWeek.id)
      .order("day_number", { ascending: true });

    if (daysLoadError) {
      alert(daysLoadError.message);
      return null;
    }

    for (const sourceDay of sourceDays || []) {
      const { data: createdDay, error: dayError } = await supabase
        .from("program_days")
        .insert({
          title: sourceDay.title,
          day_number: sourceDay.day_number,
          program_week_id: createdWeek.id,
          notes: sourceDay.notes || "",
          warmup: sourceDay.warmup || "",
        })
        .select("*")
        .single();

      if (dayError || !createdDay) {
        alert(dayError?.message || "Dag kon niet worden gekopieerd");
        return null;
      }

      const { data: sourceExercises, error: exercisesLoadError } =
        await supabase
          .from("program_exercises")
          .select("*")
          .eq("program_day_id", sourceDay.id)
          .order("created_at", { ascending: true });

      if (exercisesLoadError) {
        alert(exercisesLoadError.message);
        return null;
      }

      if ((sourceExercises || []).length > 0) {
        const exercisesToInsert = (sourceExercises || []).map((exercise) => ({
          program_day_id: createdDay.id,
          name: normalizeExerciseName(exercise.name),
          sets: exercise.sets || "",
          reps: exercise.reps || "",
          load: exercise.load || "",
          rpe: exercise.rpe || "",
          notes: exercise.notes || "",
          priority: exercise.priority || "",
        }));

        const { error: insertExercisesError } = await supabase
          .from("program_exercises")
          .insert(exercisesToInsert);

        if (insertExercisesError) {
          alert(insertExercisesError.message);
          return null;
        }
      }
    }

    return createdWeek as ProgramWeek;
  }

  async function duplicateWeek(weekToDuplicate: ProgramWeek) {
    const blockWeeks = [
      ...(weeksByBlock[weekToDuplicate.program_block_id] || []),
    ].sort((a, b) => a.week_number - b.week_number);

    const newWeekNumber = weekToDuplicate.week_number + 1;
    const weeksToMove = blockWeeks.filter(
      (item) =>
        item.week_number >= newWeekNumber && item.id !== weekToDuplicate.id,
    );

    for (const item of weeksToMove.reverse()) {
      const { error } = await supabase
        .from("program_weeks")
        .update({ week_number: item.week_number + 1 })
        .eq("id", item.id);

      if (error) {
        alert(error.message);
        return;
      }
    }

    const createdWeek = await copyWeekWithContent(
      weekToDuplicate,
      weekToDuplicate.program_block_id,
      newWeekNumber,
      `Week ${newWeekNumber}`,
    );

    if (!createdWeek) return;

    window.location.href = programUrl(
      weekToDuplicate.program_block_id,
      createdWeek.id,
    );
  }

  async function createWeek(targetBlockId: string) {
    if (!newWeekTitle.trim()) {
      alert("Vul een naam in voor de week");
      return;
    }

    const currentWeeks = weeksByBlock[targetBlockId] || [];
    const nextWeekNumber =
      currentWeeks.length > 0
        ? Math.max(...currentWeeks.map((item) => item.week_number)) + 1
        : 1;

    const { data, error } = await supabase
      .from("program_weeks")
      .insert({
        title: newWeekTitle.trim(),
        week_number: nextWeekNumber,
        program_block_id: targetBlockId,
      })
      .select("*")
      .single();

    if (error || !data) {
      alert(error?.message || "Week kon niet worden aangemaakt");
      return;
    }

    setCreatingWeekBlockId("");
    setNewWeekTitle("");
    goToProgram(targetBlockId, data.id);
  }

  async function renameWeek(
    weekToRename: ProgramWeek,
    titleOverride?: string,
    note?: string,
  ) {
    const cleanTitle = (titleOverride ?? editingWeekTitle).trim();

    if (!cleanTitle) {
      alert("Vul een naam in");
      return;
    }

    const { data, error } = await supabase
      .from("program_weeks")
      .update({
        title: cleanTitle,
      })
      .eq("id", weekToRename.id)
      .select("*")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    if (!data) {
      alert("Week kon niet worden aangepast");
      return;
    }

    setWeeksByBlock((current) => ({
      ...current,
      [weekToRename.program_block_id]: (
        current[weekToRename.program_block_id] || []
      ).map((item) => (item.id === weekToRename.id ? data : item)),
    }));

    if (week?.id === weekToRename.id) {
      setWeek(data);
    }

    if (note !== undefined && planningAthleteId && userId) {
      await persistWeekEditModalNote(
        weekToRename.id,
        planningAthleteId,
        userId,
        note,
      );
    }

    setEditingWeekId("");
    setEditingWeekTitle("");
    await loadProgramNavigation(currentBlock, role, userId);
  }

  async function deleteWeek(weekToDelete: ProgramWeek) {
    const { data: weekDays } = await supabase
      .from("program_days")
      .select("id")
      .eq("program_week_id", weekToDelete.id);

    const dayIds = (weekDays || []).map((day) => day.id);

    if (dayIds.length > 0) {
      const { error: exerciseError } = await supabase
        .from("program_exercises")
        .delete()
        .in("program_day_id", dayIds);

      if (exerciseError) {
        alert(exerciseError.message);
        return;
      }

      const { error: daysError } = await supabase
        .from("program_days")
        .delete()
        .in("id", dayIds);

      if (daysError) {
        alert(daysError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("program_weeks")
      .delete()
      .eq("id", weekToDelete.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (weekToDelete.id === weekId) {
      const otherWeek = (
        weeksByBlock[weekToDelete.program_block_id] || []
      ).find((item) => item.id !== weekToDelete.id);

      if (otherWeek) {
        goToProgram(weekToDelete.program_block_id, otherWeek.id);
      } else {
        window.location.href = athleteId
          ? `/athletes/${athleteId}`
          : "/athletes";
      }

      return;
    }

    await loadData();
  }

  async function createDay(dayNumber: number) {
    if (!newDayTitle.trim()) {
      alert("Vul een naam in voor de dag");
      return;
    }

    const { error } = await supabase.from("program_days").insert({
      title: newDayTitle.trim(),
      day_number: dayNumber,
      program_week_id: weekId,
      notes: "",
      warmup: "",
    });

    if (error) {
      alert(error.message);
      return;
    }

    setNewDayTitle("");
    setIsCreatingDay(false);
    await loadDays();
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
    await runSave(async () => {
      const { error } = await supabase
        .from("program_days")
        .update(updates)
        .eq("id", dayId);

      if (error) throw error;
    });
  }

  async function saveDayField(
    dayId: string,
    field: "notes" | "warmup",
    value: string,
  ) {
    await runSave(async () => {
      const { error } = await supabase
        .from("program_days")
        .update({
          [field]: value,
        })
        .eq("id", dayId);

      if (error) throw error;
    });

    setOpenDayNoteId("");
    setOpenDayWarmupId("");
  }

  async function deleteDayField(dayId: string, field: "notes" | "warmup") {
    const previousDay = days.find((day) => day.id === dayId);
    updateDayLocal(dayId, field, "");

    try {
      await runSave(async () => {
        const { error } = await supabase
          .from("program_days")
          .update({
            [field]: "",
          })
          .eq("id", dayId);

        if (error) throw error;
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
    if (!exerciseName.trim()) {
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
        const { error } = await supabase.from("program_exercises").insert({
          program_day_id: dayId,
          name: normalizeExerciseName(exerciseName),
          sets: exerciseSets.trim(),
          reps: exerciseReps.trim(),
          load: loadValue,
          rpe: rpeValue,
          notes: "",
          exercise_number: (exercisesByDay[dayId] || []).length + 1,
          priority: "",
        });

        if (error) throw error;
      });
    } catch {
      return;
    }

    setExerciseName("");
    setExerciseSets("");
    setExerciseReps("");
    setExerciseIntensity("");
    setExerciseIntensityType("rpe");
    setCreatingExerciseDayId("");

    await loadDays();
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
        const { error } = await supabase
          .from("program_exercises")
          .update({
            [field]: cleanValue,
          })
          .eq("id", exerciseId);

        if (error) throw error;
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
  ) {
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
        const { error } = await supabase
          .from("program_exercises")
          .update(cleanUpdates)
          .eq("id", exerciseId);

        if (error) throw error;
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
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
        const { error } = await supabase
          .from("program_exercises")
          .update({ priority })
          .eq("id", exerciseId);

        if (error) throw error;
      });
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
        const { error } = await supabase
          .from("program_exercises")
          .update({
            notes: "",
          })
          .eq("id", exerciseId);

        if (error) throw error;
      });
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
        const { error } = await supabase
          .from("program_exercises")
          .update({
            load: newLoad,
            rpe: newRpe,
          })
          .eq("id", exercise.id);

        if (error) throw error;
      });
    } catch {
      setExercisesByDay(previousExercisesByDay);
      await loadDays();
    }
  }

  async function deleteExercise(exerciseId: string) {
    const { error } = await supabase
      .from("program_exercises")
      .delete()
      .eq("id", exerciseId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadDays();
  }

  async function deleteDay(dayId: string) {
    const { error: exerciseError } = await supabase
      .from("program_exercises")
      .delete()
      .eq("program_day_id", dayId);

    if (exerciseError) {
      alert(exerciseError.message);
      return;
    }

    const { error } = await supabase
      .from("program_days")
      .delete()
      .eq("id", dayId);

    if (error) {
      alert(error.message);
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
      const exercisesToInsert = sourceExercises.map((exercise, index) => ({
        program_day_id: createdDay.id,
        name: normalizeExerciseName(exercise.name),
        sets: exercise.sets || "",
        reps: exercise.reps || "",
        load: exercise.load || "",
        rpe: exercise.rpe || "",
        notes: exercise.notes || "",
        exercise_number: index + 1,
      }));

      const { error: exerciseError } = await supabase
        .from("program_exercises")
        .insert(exercisesToInsert);

      if (exerciseError) {
        alert(exerciseError.message);
        return;
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

    const updates = nextDays.map((day, index) =>
      supabase
        .from("program_days")
        .update({
          day_number: index + 1,
        })
        .eq("id", day.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      alert(failed.error.message);
      await loadDays();
    }
  }

  function handleExerciseDragStart(dayId: string, exerciseId: string) {
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

    if (
      !draggedExercise ||
      draggedExercise.dayId !== dayId ||
      draggedExercise.exerciseId === targetExerciseId
    ) {
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const position =
      e.clientY < rect.top + rect.height / 2 ? ("before" as const) : ("after" as const);
    const indicator = {
      dayId,
      targetId: targetExerciseId,
      position,
    };

    exerciseDropIndicatorRef.current = indicator;
    setExerciseDropIndicator(indicator);
  }

  function reorderExercisesList(
    sourceExercises: ProgramExercise[],
    draggedId: string,
    indicator: { targetId: string; position: "before" | "after" },
  ) {
    const draggedIndex = sourceExercises.findIndex(
      (exercise) => exercise.id === draggedId,
    );
    let targetIndex = sourceExercises.findIndex(
      (exercise) => exercise.id === indicator.targetId,
    );

    if (draggedIndex === -1 || targetIndex === -1) return sourceExercises;

    const reorderedExercises = [...sourceExercises];
    const [movedExercise] = reorderedExercises.splice(draggedIndex, 1);

    if (draggedIndex < targetIndex) {
      targetIndex -= 1;
    }

    const insertIndex =
      indicator.position === "after" ? targetIndex + 1 : targetIndex;

    reorderedExercises.splice(insertIndex, 0, movedExercise);

    return reorderedExercises.map((exercise, index) => ({
      ...exercise,
      exercise_number: index + 1,
    }));
  }

  async function saveExerciseOrder(dayId: string) {
    if (!draggedExercise || draggedExercise.dayId !== dayId) return;

    const originalOrder = originalExerciseOrderRef.current;
    const indicator =
      exerciseDropIndicatorRef.current?.dayId === dayId
        ? exerciseDropIndicatorRef.current
        : null;
    const currentExercises = exercisesByDay[dayId] || [];
    let nextExercises = currentExercises;

    if (indicator) {
      nextExercises = reorderExercisesList(
        currentExercises,
        draggedExercise.exerciseId,
        indicator,
      );
      setExercisesByDay((current) => ({
        ...current,
        [dayId]: nextExercises,
      }));
    }

    setDraggedExercise(null);
    setExerciseDropIndicator(null);
    exerciseDropIndicatorRef.current = null;

    const currentOrder = nextExercises.map((exercise) => exercise.id);
    const orderChanged =
      currentOrder.length !== originalOrder.length ||
      currentOrder.some((id, index) => id !== originalOrder[index]);

    if (!orderChanged) return;

    const updates = nextExercises.map((exercise, index) =>
      supabase
        .from("program_exercises")
        .update({
          exercise_number: index + 1,
        })
        .eq("id", exercise.id),
    );

    const results = await Promise.all(updates);
    const failed = results.find((result) => result.error);

    if (failed?.error) {
      alert(failed.error.message);
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

  function getDayDateObject(day: ProgramDay | number) {
    if (typeof day === "number") {
      return getProgramDayDateObject(currentBlock, week, day);
    }

    return getDayDateForProgramDay(currentBlock, week, day);
  }

  function getDayDate(day: ProgramDay | number) {
    if (typeof day === "number") {
      return getDayDateLabel(currentBlock, week, day);
    }

    return getDayDateLabelForProgramDay(currentBlock, week, day);
  }

  function getDayDateInputValue(day: ProgramDay) {
    return getProgramDayDateInputValue(currentBlock, week, day);
  }

  function formatDate(date: string | null) {
    if (!date) return "Geen startdatum";

    return formatDutchDateWithFullMonth(new Date(date));
  }

  function formatShortDutchDate(date: Date) {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${day}-${month}`;
  }

  function getBlockStartDateObject(block: ProgramBlock) {
    if (!block.start_date) return null;

    const date = new Date(block.start_date);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function getBlockEndDateObject(block: ProgramBlock, blockWeeks: ProgramWeek[]) {
    const start = getBlockStartDateObject(block);
    if (!start) return null;

    const weekCount = Math.max(blockWeeks.length, 1);
    const end = new Date(start);
    end.setDate(end.getDate() + weekCount * 7 - 1);
    return end;
  }

  function getWeekStartDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
    const start = getBlockStartDateObject(block);
    if (!start) return null;

    const weekStart = new Date(start);
    weekStart.setDate(weekStart.getDate() + (programWeek.week_number - 1) * 7);
    return weekStart;
  }

  function getWeekEndDateObject(block: ProgramBlock, programWeek: ProgramWeek) {
    const weekStart = getWeekStartDateObject(block, programWeek);
    if (!weekStart) return null;

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    return weekEnd;
  }

  function formatDateRangeLabel(
    start: Date | null,
    end: Date | null,
    fallback = "Geen datum",
  ) {
    if (!start || !end) return fallback;
    return `${formatShortDutchDate(start)} - ${formatShortDutchDate(end)}`;
  }

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

  function getAthleteSetAverage(
    exercise: ProgramExercise,
    field: "reps" | "weight" | "rpe",
  ) {
    const rows = getSetRowsForExercise(exercise);
    const values = rows
      .map((row) => parseNumberValue(row[field]))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return "-";

    const average =
      values.reduce((total, value) => total + value, 0) / values.length;
    return formatAverageValue(average);
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
    const ownerAthleteId = getOwnerAthleteId();

    if (!ownerAthleteId || !currentBlock?.id || !week?.week_number) {
      setPreviousWeekMessage("Vorige week kon niet worden geladen.");
      return;
    }

    if (week.week_number <= 1) {
      setPreviousWeekData(null);
      setPreviousWeekMessage("Er is geen vorige week in dit block.");
      setPreviousWeekOpen(true);
      return;
    }

    setPreviousWeekOpen(true);
    setLoadingPreviousWeekSets(true);
    setPreviousWeekData(null);
    setPreviousWeekMessage("");

    const { data: previousWeek, error: previousWeekError } = await supabase
      .from("program_weeks")
      .select("*")
      .eq("program_block_id", currentBlock.id)
      .eq("week_number", week.week_number - 1)
      .maybeSingle();

    if (previousWeekError) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage(previousWeekError.message);
      return;
    }

    if (!previousWeek) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage("Er is geen vorige week gevonden.");
      return;
    }

    const { data: previousDays, error: previousDaysError } = await supabase
      .from("program_days")
      .select("*")
      .eq("program_week_id", previousWeek.id)
      .order("day_number", { ascending: true });

    if (previousDaysError) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage(previousDaysError.message);
      return;
    }

    const sameDay = (previousDays || []).find(
      (item) => item.day_number === currentDay.day_number,
    );

    const dayIds = sameDay
      ? [sameDay.id]
      : (previousDays || []).map((item) => item.id);

    if (dayIds.length === 0) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage("Vorige week heeft nog geen dagen.");
      return;
    }

    const { data: previousExercises, error: previousExercisesError } =
      await supabase
        .from("program_exercises")
        .select("*")
        .in("program_day_id", dayIds)
        .order("exercise_number", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: true });

    if (previousExercisesError) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage(previousExercisesError.message);
      return;
    }

    const cleanName = (currentExercise.name || "").trim().toLowerCase();
    const previousExercise = (previousExercises || []).find(
      (item) => (item.name || "").trim().toLowerCase() === cleanName,
    );

    if (!previousExercise) {
      setLoadingPreviousWeekSets(false);
      setPreviousWeekMessage("Deze oefening is vorige week niet gevonden.");
      return;
    }

    const previousDay = (previousDays || []).find(
      (item) => item.id === previousExercise.program_day_id,
    );

    const { data: previousRows, error: previousRowsError } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .eq("program_exercise_id", previousExercise.id)
      .eq("athlete_id", ownerAthleteId)
      .order("set_number", { ascending: true });

    const { data: previousNote, error: previousNoteError } = await supabase
      .from("athlete_exercise_notes")
      .select("*")
      .eq("program_exercise_id", previousExercise.id)
      .eq("athlete_id", ownerAthleteId)
      .maybeSingle();

    setLoadingPreviousWeekSets(false);

    if (previousRowsError) {
      setPreviousWeekMessage(previousRowsError.message);
      return;
    }

    if (previousNoteError) {
      setPreviousWeekMessage(previousNoteError.message);
      return;
    }

    if (
      (!previousRows || previousRows.length === 0) &&
      !previousNote?.notes?.trim()
    ) {
      setPreviousWeekMessage(
        "Vorige week zijn er nog geen sets of athlete notes ingevuld voor deze oefening.",
      );
      return;
    }

    setPreviousWeekData({
      weekTitle: previousWeek.title || `Week ${previousWeek.week_number}`,
      dayTitle: previousDay?.title || "Vorige week",
      exerciseName: previousExercise.name || currentExercise.name || "Oefening",
      rows: previousRows || [],
      athleteNote: previousNote?.notes || "",
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

  function getSupportedVideoMimeType() {
    const types = [
      "video/mp4;codecs=h264,aac",
      "video/mp4",
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
    ];

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
  }

  function getRecordedFileExtension(type: string) {
    return type.includes("mp4") ? "mp4" : "webm";
  }

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function openVideoRecorder(exercise: ProgramExercise, setNumber: number) {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Je browser ondersteunt opnemen in de app niet.");
      return;
    }

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setVideoRecorderTarget({ exercise, setNumber });
    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setGalleryFiles([]);
    setMuteVideoAudio(false);
    setFlashOn(false);
    setActiveTrimHandle(null);
    setVideoCaption(
      getAthleteSetVideo(exercise.id, setNumber)?.caption?.trim() || "",
    );
    setCameraError("");
    setCameraReady(false);
    setVideoRecorderOpen(true);
    // iOS Safari requires getUserMedia inside the tap/click handler.
    void startCameraStream();
  }

  function closeVideoRecorder() {
    if (isRecordingVideo) {
      mediaRecorderRef.current?.stop();
    }

    stopCameraStream();
    setVideoRecorderOpen(false);
    setVideoRecorderTarget(null);
    setIsRecordingVideo(false);
    stopRecordingTimer();
    setRecordingSeconds(0);
    setCameraReady(false);
    setCameraError("");

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setGalleryFiles([]);
    setMuteVideoAudio(false);
    setFlashOn(false);
    setActiveTrimHandle(null);
    setVideoCaption("");
  }

  function isIgnorableCameraError(error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
          ? error
          : "";

    return /aborted|AbortError|interrupted by a new load request/i.test(message);
  }

  function getCameraErrorMessage(error: unknown) {
    if (isIgnorableCameraError(error)) return "";

    const message = error instanceof Error ? error.message : String(error);

    return (
      message ||
      "Camera kon niet worden geopend. Geef Safari/Chrome toestemming voor camera en microfoon."
    );
  }

  async function playCameraPreview() {
    if (!cameraVideoRef.current) return;

    try {
      await cameraVideoRef.current.play();
    } catch (error) {
      if (!isIgnorableCameraError(error)) {
        console.warn("CAMERA PREVIEW PLAY ERROR:", error);
      }
    }
  }

  async function startCameraStream() {
    setCameraError("");

    if (cameraStreamRef.current) {
      if (
        cameraVideoRef.current &&
        cameraVideoRef.current.srcObject !== cameraStreamRef.current
      ) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        await playCameraPreview();
      }
      setCameraReady(true);
      await applyTorch(flashOn);
      return;
    }

    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: true,
      });

      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await playCameraPreview();
      }

      setCameraReady(true);
      await applyTorch(flashOn);
    } catch (error: any) {
      console.error("CAMERA ERROR:", error);
      const message = getCameraErrorMessage(error);
      if (message) {
        setCameraError(message);
      }
      setCameraReady(false);
    }
  }

  function stopCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  async function applyTorch(nextFlashOn: boolean) {
    const videoTrack = cameraStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      if (!capabilities?.torch) return;

      await videoTrack.applyConstraints({
        advanced: [{ torch: nextFlashOn } as MediaTrackConstraintSet],
      });
    } catch (error) {
      console.warn("FLASH NOT SUPPORTED:", error);
      if (nextFlashOn) setFlashOn(false);
    }
  }

  function toggleFlash() {
    setFlashOn((current) => !current);
  }

  function switchCameraFacingMode() {
    if (isRecordingVideo) return;
    setFlashOn(false);
    setCameraFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  }

  function handleRecordButtonClick() {
    if (isRecordingVideo) {
      stopVideoRecording();
    } else {
      startVideoRecording();
    }
  }

  function handleGalleryFiles(files: FileList | null) {
    const videos = Array.from(files || []).filter((file) =>
      file.type.startsWith("video/"),
    );

    if (videos.length === 0) {
      alert("Kies minimaal één video uit je camerarol");
      return;
    }

    setGalleryFiles(videos);
    setGalleryOpen(true);
  }

  function chooseGalleryFile(file: File) {
    if (!file.type.startsWith("video/")) {
      alert("Kies een video uit je camerarol");
      return;
    }

    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    const url = URL.createObjectURL(file);
    setRecordedVideoFile(file);
    setRecordedVideoUrl(url);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    stopRecordingTimer();
    setIsRecordingVideo(false);
  }

  function startVideoRecording() {
    const stream = cameraStreamRef.current;

    if (!stream) {
      alert("Camera is nog niet klaar");
      return;
    }

    const mimeType = getSupportedVideoMimeType();

    try {
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordingType = recorder.mimeType || mimeType || "video/mp4";
        const extension = getRecordedFileExtension(recordingType);
        const blob = new Blob(recordedChunksRef.current, {
          type: recordingType,
        });
        const file = new File([blob], `recording-${Date.now()}.${extension}`, {
          type: recordingType,
        });
        const url = URL.createObjectURL(blob);

        if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

        setRecordedVideoFile(file);
        setRecordedVideoUrl(url);
        setTrimStart(0);
        setTrimEnd(0);
        stopRecordingTimer();
        setIsRecordingVideo(false);
      };

      recorder.start(250);
      setRecordingSeconds(0);
      stopRecordingTimer();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      setIsRecordingVideo(true);
    } catch (error: any) {
      console.error("RECORD ERROR:", error);
      alert(error?.message || "Opnemen mislukt");
      setIsRecordingVideo(false);
    }
  }

  function stopVideoRecording() {
    if (!mediaRecorderRef.current) return;

    stopRecordingTimer();

    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function resetRecordedVideo() {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);

    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setActiveTrimHandle(null);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    setCameraError("");
    setVideoCaption("");

    window.setTimeout(() => {
      if (!videoRecorderOpen) return;

      if (cameraStreamRef.current && cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        void playCameraPreview();
        setCameraReady(true);
        return;
      }

      void startCameraStream();
    }, 80);
  }

  function handlePreviewLoadedMetadata() {
    const duration = previewVideoRef.current?.duration || 0;

    if (!Number.isFinite(duration) || duration <= 0) return;

    setVideoDuration(duration);
    setTrimStart(0);
    setTrimEnd(duration);
  }

  function formatVideoTime(value: number) {
    const totalSeconds = Math.max(0, Math.floor(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }

  function togglePreviewMute() {
    setMuteVideoAudio((current) => {
      const nextValue = !current;
      if (previewVideoRef.current) {
        previewVideoRef.current.muted = nextValue;
        previewVideoRef.current.volume = nextValue ? 0 : 1;
      }
      return nextValue;
    });
  }

  function updateTrimFromClientX(clientX: number, handle?: "start" | "end") {
    if (!trimSliderRef.current || !videoDuration) return;

    const rect = trimSliderRef.current.getBoundingClientRect();
    const rawPercent = (clientX - rect.left) / rect.width;
    const nextTime = Math.min(
      videoDuration,
      Math.max(0, rawPercent * videoDuration),
    );
    const minGap = Math.min(0.4, Math.max(0.1, videoDuration / 30));
    const currentEnd = trimEnd || videoDuration;
    const chosenHandle =
      handle ||
      (Math.abs(nextTime - trimStart) <= Math.abs(nextTime - currentEnd)
        ? "start"
        : "end");

    if (chosenHandle === "start") {
      const nextStart = Math.min(nextTime, currentEnd - minGap);
      setTrimStart(nextStart);
      if (previewVideoRef.current) previewVideoRef.current.currentTime = nextStart;
      return;
    }

    const nextEnd = Math.max(nextTime, trimStart + minGap);
    setTrimEnd(nextEnd);
    if (previewVideoRef.current) previewVideoRef.current.currentTime = nextEnd;
  }

  async function getFFmpeg() {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    const ffmpeg = ffmpegRef.current || new FFmpeg();
    ffmpegRef.current = ffmpeg;

    if (!ffmpeg.loaded) {
      await ffmpeg.load();
    }

    return ffmpeg;
  }

  async function trimVideoFile(file: File, start: number, end: number) {
    const effectiveEnd = end > 0 ? end : videoDuration;

    if (
      !muteVideoAudio &&
      (!videoDuration ||
        (start <= 0.05 &&
          effectiveEnd >= Math.max(videoDuration - 0.05, 0)))
    ) {
      return file;
    }

    const safeStart = Math.max(0, start);
    const safeEnd = videoDuration
      ? Math.min(videoDuration, effectiveEnd || videoDuration)
      : Math.max(effectiveEnd || 0, safeStart + 0.5);

    if (safeEnd <= safeStart) {
      return file;
    }

    setTrimmingVideo(true);

    try {
      const ffmpeg = await getFFmpeg();
      const inputName = file.name.toLowerCase().endsWith(".webm")
        ? "input.webm"
        : "input.mp4";
      const outputName = "output.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const ffmpegArgs = [
        "-ss",
        String(safeStart),
        "-to",
        String(safeEnd),
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
      ];

      if (muteVideoAudio) {
        ffmpegArgs.push("-an");
      } else {
        ffmpegArgs.push("-c:a", "aac");
      }

      ffmpegArgs.push(outputName);
      await ffmpeg.exec(ffmpegArgs);

      const output = await ffmpeg.readFile(outputName);
      const outputData =
        output instanceof Uint8Array ? output : new TextEncoder().encode(output);
      const fixedOutputData = new Uint8Array(outputData as Uint8Array).buffer;

      const trimmedBlob = new Blob([fixedOutputData], {
        type: "video/mp4",
      });

      await ffmpeg.deleteFile(inputName).catch(() => undefined);
      await ffmpeg.deleteFile(outputName).catch(() => undefined);

      return new File([trimmedBlob], `trimmed-${Date.now()}.mp4`, {
        type: "video/mp4",
      });
    } finally {
      setTrimmingVideo(false);
    }
  }

  async function saveRecordedVideo() {
    if (!videoRecorderTarget || !recordedVideoFile) {
      alert("Neem eerst een video op");
      return;
    }

    const endTime = trimEnd || videoDuration || 0;
    let fileToUpload = recordedVideoFile;

    try {
      try {
        fileToUpload = await trimVideoFile(
          recordedVideoFile,
          trimStart,
          endTime,
        );
      } catch (trimError) {
        console.error("TRIM ERROR, uploading original video:", trimError);
        fileToUpload = recordedVideoFile;
      }

      await uploadAthleteSetVideo(
        videoRecorderTarget.exercise,
        videoRecorderTarget.setNumber,
        fileToUpload,
        videoCaption.trim() || null,
      );

      closeVideoRecorder();
    } catch (error: any) {
      console.error("SAVE VIDEO ERROR:", error);
      alert(error?.message || "Video opslaan mislukt");
    }
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

    setUploadingVideoSetKey(videoKey);

    try {
      const currentVideo = athleteVideosBySet[videoKey];

      if (currentVideo?.video_path) {
        await supabase.storage
          .from("exercise-videos")
          .remove([currentVideo.video_path]);
      }

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

      setAthleteVideosBySet((current) => ({
        ...current,
        [videoKey]: videoRow,
      }));

      let thumbnailUrl: string | null = null;

      try {
        const thumbnailBlob = await captureVideoThumbnail(file);
        const thumbnailPath = `${ownerAthleteId}/${exercise.id}/set-${setNumber}/thumb-${Date.now()}.jpg`;

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
      } catch (thumbnailError) {
        console.error("VIDEO THUMBNAIL ERROR:", thumbnailError);
      }

      if (role === "atleet" && userId && athleteCoachId) {
        const setRow = getSetRowsForExercise(exercise).find(
          (row) => row.set_number === setNumber,
        );

        const { error: routeError } = await routeAthleteExerciseVideo({
          athleteId: userId,
          coachId: athleteCoachId,
          target: videoSubmitTarget,
          videoUrl: publicUrlData.publicUrl,
          thumbnailUrl,
          caption,
          exerciseName: normalizeExerciseName(exercise.name),
          setNumber,
          reps: setRow?.reps || null,
          coachReps: exercise.reps || null,
          weight: setRow?.weight || null,
          rpe: setRow?.rpe || null,
          priority: exercise.priority || null,
        });

        if (routeError) {
          console.error("VIDEO ROUTE ERROR:", routeError);
        }
      }
    } catch (error: any) {
      console.error("VIDEO UPLOAD ERROR:", error);
      console.error("VIDEO UPLOAD ERROR JSON:", JSON.stringify(error, null, 2));
      setAthleteVideosBySet(previousVideos);
      alert(
        error?.message ||
          error?.details ||
          error?.hint ||
          "Video uploaden mislukt",
      );
    } finally {
      setUploadingVideoSetKey("");
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
    } catch (error: any) {
      console.error("VIDEO DELETE ERROR:", error);
      setAthleteVideosBySet(previousVideos);
      alert(error?.message || "Video verwijderen mislukt");
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

      setOfflineQueueCount(getOfflineSetQueueCount());
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
      setOfflineQueueCount(getOfflineSetQueueCount());
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

  const weekStatsReport = useMemo(
    () =>
      buildWeekStatsReport(days, exercisesByDay, (day) => getDayDate(day)),
    [days, exercisesByDay, currentBlock, week],
  );

  const programSearchContext = useMemo(() => {
    const blockWeeks = currentBlock ? weeksByBlock[currentBlock.id] || [] : [];

    const exercises = days.flatMap((day) =>
      (exercisesByDay[day.id] || []).map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        dayTitle: day.title,
        weekTitle: week?.title || "Week",
      })),
    );

    const athleteProfileId =
      athleteId || currentBlock?.athlete_id || undefined;

    return {
      athleteId: athleteProfileId,
      block: currentBlock
        ? { id: currentBlock.id, title: currentBlock.title }
        : undefined,
      week: week
        ? {
            id: week.id,
            title: week.title,
            weekNumber: week.week_number,
          }
        : undefined,
      weeks: blockWeeks.map((item) => ({
        id: item.id,
        title: item.title,
        weekNumber: item.week_number,
      })),
      exercises,
    };
  }, [
    athleteId,
    currentBlock,
    days,
    exercisesByDay,
    week,
    weeksByBlock,
  ]);

  const athleteSidebarBlocks = useMemo(() => {
    if (role !== "atleet") return [];

    const orderedSidebarBlocks = [
      ...navMacrocycles.flatMap((macrocycle) =>
        navBlocks.filter((block) => block.macrocycle_id === macrocycle.id),
      ),
      ...navBlocks.filter((block) => !block.macrocycle_id),
    ];

    return orderedSidebarBlocks.map((block) => {
      const blockWeeks = weeksByBlock[block.id] || [];
      const blockStart = getBlockStartDateObject(block);
      const blockEnd = getBlockEndDateObject(block, blockWeeks);

      return {
        id: block.id,
        title: block.title,
        dateRange: formatDateRangeLabel(blockStart, blockEnd),
        isActive: block.id === blockId,
        isOpen: openBlockIds[block.id] ?? block.id === blockId,
        weeks: blockWeeks.map((item) => ({
          id: item.id,
          title: item.title,
          dateRange: formatDateRangeLabel(
            getWeekStartDateObject(block, item),
            getWeekEndDateObject(block, item),
          ),
          isActive: item.id === weekId,
        })),
      };
    });
  }, [
    role,
    navMacrocycles,
    navBlocks,
    weeksByBlock,
    blockId,
    weekId,
    openBlockIds,
  ]);

  return (
    <div
      className={
        embeddedInChat
          ? "h-full min-h-0 bg-gray-100"
            : isAthleteView
              ? "athlete-program-shell relative flex min-h-[100dvh] flex-col lg:h-[100dvh] lg:min-h-0 lg:flex-row lg:overflow-hidden supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]"
              : isCoachView
                ? "coach-program-shell relative min-h-[100dvh] lg:flex lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)]"
                : "relative min-h-[100dvh] bg-gray-100 program-week-shell supports-[padding:env(safe-area-inset-top)]:pt-[env(safe-area-inset-top)] lg:flex lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden"
      }
    >
      {!embeddedInChat && !isAthleteView && !isCoachView ? (
        <AppSidebar />
      ) : null}
      {!embeddedInChat && isAthleteView ? (
        <AthleteProgramSidebar
          blocks={athleteSidebarBlocks}
          onToggleBlock={(targetBlockId) =>
            setOpenBlockIds((current) => ({
              ...current,
              [targetBlockId]: !current[targetBlockId],
            }))
          }
          onSelectWeek={(targetBlockId, targetWeekId) =>
            goToProgram(targetBlockId, targetWeekId)
          }
        />
      ) : null}
      {!embeddedInChat && !isAthleteView ? renderBlocksSidebar() : null}
      {!embeddedInChat && isAthleteView ? <MobileBottomNav /> : null}
      {!embeddedInChat && isCoachView ? <CoachMobileBottomNav /> : null}
      {!embeddedInChat && isAthleteView ? (
        <Link
          href="/dashboard"
          className="athlete-program-dashboard-btn athlete-program-dashboard-btn--fixed app-focus-ring"
        >
          <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
      ) : null}

      <main
        className={
          embeddedInChat
            ? "h-full min-h-0 min-w-0 overflow-y-auto"
            : `relative min-h-0 min-w-0 flex-1 mobile-scroll ${
                planningSplitOpen && isCoachLikeRole(role)
                  ? "lg:flex lg:h-[100dvh] lg:flex-col lg:overflow-hidden"
                  : "overflow-y-auto"
              }`
        }
      >
      {!embeddedInChat ? <DemoModeBanner /> : null}
      <div
        className={
          planningSplitOpen && isCoachLikeRole(role) && !embeddedInChat
            ? "lg:min-h-0 lg:flex-1 lg:overflow-y-auto"
            : ""
        }
      >
      {(isPending || navigatingUrl) && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 overflow-hidden">
          <div className="h-full w-1/3 bg-black animate-[loadingbar_0.9s_ease-in-out_infinite]" />
        </div>
      )}
      <section
        className={`min-w-0 transition-opacity duration-200 ${
          embeddedInChat
            ? "p-2 pb-4"
            : isAthleteView || isCoachView
              ? isAthleteView
                ? "athlete-program-content p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6"
                : "coach-program-content p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6"
              : "p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-8 lg:pb-8"
        } ${navigatingUrl ? "pointer-events-none opacity-60" : "opacity-100"}`}
      >
          {!programReady || authLoading ? (
            <ProgramWeekSkeleton />
          ) : isAthleteView ? (
            <AthleteProgramWeekContent
              mobileWeekNav={!embeddedInChat ? renderBlockWeekNav() : null}
              blockTitle={currentBlock?.title || "Block"}
              weekTitle={week?.title || "Week"}
              days={days}
              exercisesByDay={exercisesByDay}
              userId={userId}
              athleteCoachId={athleteCoachId}
              openAthleteDayNotesId={openAthleteDayNotesId}
              selectedAthleteExerciseId={selectedAthleteExerciseId}
              athleteExercisePanelOpen={athleteExercisePanelOpen}
              getAthleteDayCheckin={getAthleteDayCheckin}
              getDayDate={getDayDate}
              isDayPast={isDayPast}
              getDayDateObject={getDayDateObject}
              updateAthleteDayCheckinLocal={updateAthleteDayCheckinLocal}
              saveAthleteDayCheckin={saveAthleteDayCheckin}
              setOpenAthleteDayNotesId={setOpenAthleteDayNotesId}
              getSetRowsForExercise={getSetRowsForExercise}
              hasIncompleteSetField={hasIncompleteSetField}
              getExerciseLibraryItem={getExerciseLibraryItem}
              getAthleteSetAverage={getAthleteSetAverage}
              getDisplayIntensity={getDisplayIntensity}
              getExercisePriority={getExercisePriority}
              getExercisePriorityLabel={getExercisePriorityLabel}
              capitalizeExerciseName={normalizeExerciseName}
              openAthleteExercisePanel={openAthleteExercisePanel}
              setPreviewLibraryItem={setPreviewLibraryItem}
            />
          ) : (
            <CoachProgramWeekContent
              embeddedInChat={embeddedInChat}
              isCoach={isCoachLikeRole(role)}
              mobileWeekNav={!embeddedInChat ? renderBlockWeekNav() : null}
              blockTitle={currentBlock?.title || "Block"}
              weekTitle={week?.title || "Week"}
              programSearchContext={programSearchContext}
              planningSplitOpen={planningSplitOpen}
              onTogglePlanning={() => setPlanningSplitOpen((value) => !value)}
              backHref={athleteId ? `/athletes/${athleteId}` : "/athletes"}
              days={days}
              exercisesByDay={exercisesByDay}
              creatingExerciseDayId={creatingExerciseDayId}
              openDayNoteId={openDayNoteId}
              openDayWarmupId={openDayWarmupId}
              openExerciseNoteId={openExerciseNoteId}
              draggedDayId={draggedDayId}
              dayDropIndicator={dayDropIndicator}
              draggedExercise={draggedExercise}
              exerciseDropIndicator={exerciseDropIndicator}
              isCreatingDay={isCreatingDay}
              newDayTitle={newDayTitle}
              newDayInputRef={newDayInputRef}
              exerciseNameInputRef={exerciseNameInputRef}
              uitlegMode={uitlegMode}
              userId={userId}
              role={role}
              exerciseName={exerciseName}
              exerciseSets={exerciseSets}
              exerciseReps={exerciseReps}
              exerciseIntensity={exerciseIntensity}
              exerciseIntensityType={exerciseIntensityType}
              setOpenDayWarmupId={setOpenDayWarmupId}
              setOpenDayNoteId={setOpenDayNoteId}
              setUitlegMode={setUitlegMode}
              setPreviewLibraryItem={setPreviewLibraryItem}
              setCreatingExerciseDayId={setCreatingExerciseDayId}
              setExerciseName={setExerciseName}
              setExerciseSets={setExerciseSets}
              setExerciseReps={setExerciseReps}
              setExerciseIntensity={setExerciseIntensity}
              setExerciseIntensityType={setExerciseIntensityType}
              setIsCreatingDay={setIsCreatingDay}
              setNewDayTitle={setNewDayTitle}
              setOpenExerciseNoteId={setOpenExerciseNoteId}
              getDayDate={getDayDate}
              getDayDateInputValue={getDayDateInputValue}
              hasExercises={hasExercises}
              duplicateDay={duplicateDay}
              deleteDay={deleteDay}
              updateDayLocal={updateDayLocal}
              saveDayMeta={saveDayMeta}
              saveDayField={saveDayField}
              deleteDayField={deleteDayField}
              handleDragStart={handleDragStart}
              handleDragOver={handleDragOver}
              saveDayOrder={saveDayOrder}
              getExerciseLibraryItem={getExerciseLibraryItem}
              saveExerciseLibraryLink={saveExerciseLibraryLink}
              handleExerciseDragStart={handleExerciseDragStart}
              handleExerciseDragOver={handleExerciseDragOver}
              saveExerciseOrder={saveExerciseOrder}
              updateExerciseLocal={updateExerciseLocal}
              saveExerciseField={saveExerciseField}
              deleteExercise={deleteExercise}
              handleCoachExerciseEnter={handleCoachExerciseEnter}
              handleNewExerciseFormKeyDown={handleNewExerciseFormKeyDown}
              addExercise={addExercise}
              updateIntensityType={updateIntensityType}
              deleteExerciseNote={deleteExerciseNote}
              saveExercisePriority={saveExercisePriority}
              saveExerciseFields={saveExerciseFields}
              getAthleteExerciseNote={getAthleteExerciseNote}
              createDay={createDay}
              onLinkExerciseForLibrary={setLinkingExercise}
              sbdWeekSummary={getShortSbdWeekSummary()}
              weekStatsReport={weekStatsReport}
            />
          )}
      </section>

      {role === "atleet" &&
        athleteExercisePanelOpen &&
        (() => {
          const selected = getSelectedAthleteExercise();
          if (!selected) return null;

          const { day, exercise } = selected;
          const setRows = getSetRowsForExercise(exercise);
          const dayIsPast = isDayPast(getDayDateObject(day));

          const closePanel = () => {
            setAthleteExercisePanelOpen(false);
            setSelectedAthleteExerciseId("");
            setAthleteNotePanelOpen(false);
            resetPreviousWeekData();
          };

          return (
            <AthleteExerciseFillPanel
              day={day}
              exercise={exercise}
              setRows={setRows}
              dayIsPast={dayIsPast}
              dayDateLabel={getDayDate(day)}
              exerciseTitle={
                normalizeExerciseName(exercise.name) || "Oefening invullen"
              }
              prescribedLabel={`${exercise.sets || "-"} sets · ${exercise.reps || "-"} reps · ${getDisplayIntensity(exercise)}`}
              loadingSets={loadingAthleteSets}
              notePanelOpen={athleteNotePanelOpen}
              exerciseNote={getAthleteExerciseNote(exercise.id)}
              previousWeekOpen={previousWeekOpen}
              loadingPreviousWeek={loadingPreviousWeekSets}
              previousWeekMessage={previousWeekMessage}
              previousWeekData={previousWeekData}
              uploadingVideoSetKey={uploadingVideoSetKey}
              onClose={closePanel}
              onToggleNotePanel={() =>
                setAthleteNotePanelOpen((open) => !open)
              }
              onExerciseNoteChange={(value) =>
                updateAthleteExerciseNoteLocal(exercise, value)
              }
              onExerciseNoteBlur={(value) =>
                saveAthleteExerciseNote(exercise, value)
              }
              onTogglePreviousWeek={() =>
                previousWeekOpen
                  ? resetPreviousWeekData()
                  : void loadPreviousWeekExerciseSets(day, exercise)
              }
              onOpenVideoRecorder={(setNumber) =>
                openVideoRecorder(exercise, setNumber)
              }
              onUpdateSet={(setNumber, field, value) =>
                updateAthleteSetLocal(exercise, setNumber, field, value)
              }
              onSaveSet={(setNumber, field, value) =>
                void saveAthleteSetField(exercise, setNumber, field, value)
              }
              onSetKeyDown={handleAthleteSetArrowNavigation}
              onCopySetDown={(row) => copyAthleteSetToNextRow(exercise, row)}
              onDeleteSetVideo={(setNumber) =>
                deleteAthleteSetVideo(exercise, setNumber)
              }
              getSetVideo={(setNumber) =>
                getAthleteSetVideo(exercise.id, setNumber)
              }
              getSetVideoKey={(setNumber) =>
                getAthleteSetVideoKey(exercise.id, setNumber)
              }
              getE1rmLabel={(row) => getInlineE1rmLabel(exercise, row)}
              getAverageFromRows={getAverageFromRows}
            />
          );
        })()}

      {videoRecorderOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999] overscroll-none bg-black text-white">
            {!recordedVideoUrl && (
              <div
                className="relative h-[100dvh] w-full touch-none overflow-hidden bg-black"
                onTouchMove={(e) => e.preventDefault()}
              >
                <video
                  ref={cameraVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 h-full w-full bg-black object-cover"
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 to-transparent" />

                <div className="absolute left-4 right-4 top-[max(16px,env(safe-area-inset-top))] flex items-center justify-between">
                  <button
                    type="button"
                    onClick={closeVideoRecorder}
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-3xl font-light text-white backdrop-blur active:scale-95"
                    aria-label="Sluiten"
                  >
                    ×
                  </button>

                  <div className="rounded-full bg-black/45 px-4 py-2 text-center backdrop-blur">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                      Video
                    </p>
                    <p className="max-w-[190px] truncate text-xs font-bold text-white">
                      {videoRecorderTarget
                        ? `${normalizeExerciseName(videoRecorderTarget.exercise.name)} · set ${videoRecorderTarget.setNumber}`
                        : "Video opnemen"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={toggleFlash}
                    disabled={isRecordingVideo}
                    className={`flex h-11 w-11 items-center justify-center rounded-full text-lg backdrop-blur active:scale-95 disabled:opacity-30 ${
                      flashOn ? "bg-white text-black" : "bg-black/45 text-white"
                    }`}
                    aria-label="Flits"
                  >
                    ⚡
                  </button>
                </div>

                {cameraError && (
                  <div className="absolute left-5 right-5 top-28 rounded-3xl bg-red-500/90 p-4 text-center text-sm font-bold text-white shadow-2xl">
                    {cameraError}
                  </div>
                )}

                {isRecordingVideo && (
                  <div className="absolute left-1/2 top-[max(86px,calc(env(safe-area-inset-top)+70px))] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-black text-white backdrop-blur">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                    {formatVideoTime(recordingSeconds)}
                  </div>
                )}

                <div className="absolute bottom-[max(26px,env(safe-area-inset-bottom))] left-0 right-0 px-6">
                  {galleryOpen && galleryFiles.length > 0 && (
                    <div className="mb-5 max-h-44 overflow-y-auto rounded-3xl border border-white/15 bg-black/60 p-3 shadow-2xl backdrop-blur">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">
                          Camerarol
                        </p>
                        <button
                          type="button"
                          onClick={() => setGalleryOpen(false)}
                          className="text-xs font-bold text-white/60"
                        >
                          Sluit
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {galleryFiles.map((file, index) => (
                          <button
                            key={`${file.name}-${file.lastModified}-${index}`}
                            type="button"
                            onClick={() => chooseGalleryFile(file)}
                            className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-white/10"
                          >
                            <video
                              src={URL.createObjectURL(file)}
                              muted
                              playsInline
                              preload="metadata"
                              className="h-full w-full object-cover"
                            />
                            <span className="absolute bottom-1 left-1 right-1 truncate rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">
                              Video {index + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    onChange={(e) => handleGalleryFiles(e.target.files)}
                    className="hidden"
                  />

                  <div className="grid grid-cols-3 items-center">
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      disabled={isRecordingVideo}
                      className="flex h-12 w-12 items-center justify-center justify-self-start rounded-2xl bg-black/45 text-xl text-white backdrop-blur active:scale-95 disabled:opacity-30"
                      aria-label="Camerarol"
                    >
                      ▣
                    </button>

                    <button
                      type="button"
                      onClick={handleRecordButtonClick}
                      disabled={!cameraReady && !isRecordingVideo}
                      className={`relative flex h-20 w-20 items-center justify-center justify-self-center rounded-full border-[5px] border-white bg-white/15 shadow-2xl active:scale-95 disabled:opacity-50 ${
                        isRecordingVideo ? "border-red-500" : ""
                      }`}
                      aria-label={isRecordingVideo ? "Stop opname" : "Start opname"}
                    >
                      <span
                        className={`block transition-all ${
                          isRecordingVideo
                            ? "h-8 w-8 rounded-lg bg-red-500"
                            : "h-14 w-14 rounded-full bg-red-500"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={switchCameraFacingMode}
                      disabled={isRecordingVideo}
                      className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full bg-black/45 text-xl text-white backdrop-blur active:scale-95 disabled:opacity-30"
                      aria-label="Draai camera"
                    >
                      ↻
                    </button>
                  </div>

                  <p className="mt-4 text-center text-xs font-black uppercase tracking-[0.22em] text-red-400">
                    Video
                  </p>
                </div>
              </div>
            )}

            {recordedVideoUrl && (
              <div className="relative flex min-h-[100dvh] w-full flex-col overflow-y-auto overscroll-contain bg-black pb-52">
                <video
                  ref={previewVideoRef}
                  src={recordedVideoUrl}
                  playsInline
                  muted={muteVideoAudio}
                  onLoadedMetadata={handlePreviewLoadedMetadata}
                  className="absolute inset-0 h-full w-full bg-black object-contain"
                />

                <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 to-transparent" />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-96 bg-gradient-to-t from-black/95 to-transparent" />

                <div className="absolute left-4 right-4 top-[max(10px,env(safe-area-inset-top))]">
                  <div className="rounded-3xl border border-white/15 bg-black/40 p-3 shadow-2xl backdrop-blur">
                    <div
                      ref={trimSliderRef}
                      onPointerDown={(e) => {
                        const currentEnd = trimEnd || videoDuration;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const nextTime =
                          ((e.clientX - rect.left) / rect.width) * (videoDuration || 0);
                        const handle =
                          Math.abs(nextTime - trimStart) <= Math.abs(nextTime - currentEnd)
                            ? "start"
                            : "end";
                        setActiveTrimHandle(handle);
                        e.currentTarget.setPointerCapture(e.pointerId);
                        updateTrimFromClientX(e.clientX, handle);
                      }}
                      onPointerMove={(e) => {
                        if (!activeTrimHandle) return;
                        updateTrimFromClientX(e.clientX, activeTrimHandle);
                      }}
                      onPointerUp={(e) => {
                        setActiveTrimHandle(null);
                        e.currentTarget.releasePointerCapture(e.pointerId);
                      }}
                      onPointerCancel={() => setActiveTrimHandle(null)}
                      className="relative h-14 touch-none overflow-hidden rounded-2xl border border-white/20 bg-white/10"
                    >
                      <div className="absolute inset-0 flex">
                        {Array.from({ length: 28 }).map((_, index) => (
                          <div
                            key={index}
                            className="mx-[1px] flex-1 rounded-sm bg-white/30"
                            style={{ opacity: index % 2 === 0 ? 0.9 : 0.45 }}
                          />
                        ))}
                      </div>

                      <div
                        className="absolute top-0 h-full bg-black/55"
                        style={{
                          left: 0,
                          width: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                        }}
                      />

                      <div
                        className="absolute top-0 h-full bg-black/55"
                        style={{
                          right: 0,
                          width: `${
                            videoDuration
                              ? ((videoDuration - (trimEnd || videoDuration)) / videoDuration) *
                                100
                              : 0
                          }%`,
                        }}
                      />

                      <div
                        className="absolute top-0 h-full rounded-2xl border-2 border-white shadow-[0_0_18px_rgba(255,255,255,0.22)]"
                        style={{
                          left: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                          right: `${
                            videoDuration
                              ? ((videoDuration - (trimEnd || videoDuration)) / videoDuration) *
                                100
                              : 0
                          }%`,
                        }}
                      />

                      <div
                        className="absolute top-1/2 z-10 h-12 w-4 -translate-y-1/2 rounded-full bg-white shadow-xl"
                        style={{
                          left: `calc(${videoDuration ? (trimStart / videoDuration) * 100 : 0}% - 8px)`,
                        }}
                      />

                      <div
                        className="absolute top-1/2 z-10 h-12 w-4 -translate-y-1/2 rounded-full bg-white shadow-xl"
                        style={{
                          left: `calc(${videoDuration ? ((trimEnd || videoDuration) / videoDuration) * 100 : 100}% - 8px)`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-center text-[11px] font-bold text-white/65">
                      {formatVideoTime(trimStart)} - {formatVideoTime(trimEnd || videoDuration)}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={togglePreviewMute}
                  className="absolute right-4 top-[max(92px,calc(env(safe-area-inset-top)+84px))] flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg text-white backdrop-blur active:scale-95"
                  aria-label="Geluid aan of uit"
                >
                  {muteVideoAudio ? "🔇" : "🔊"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!previewVideoRef.current) return;
                    if (previewVideoRef.current.paused) {
                      previewVideoRef.current.play();
                    } else {
                      previewVideoRef.current.pause();
                    }
                  }}
                  className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow-2xl backdrop-blur active:scale-95"
                  aria-label="Video afspelen of pauzeren"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="ml-0.5 h-5 w-5"
                    aria-hidden="true"
                  >
                    <path d="M8 5.5v13l10-6.5-10-6.5Z" />
                  </svg>
                </button>

                <div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-10 px-4">
                  <div className="mx-auto mb-3 w-full max-w-sm">
                    <textarea
                      value={videoCaption}
                      onChange={(e) => setVideoCaption(e.target.value)}
                      onFocus={(e) => scrollMobileFieldIntoView(e.currentTarget)}
                      placeholder="Voeg een bijschrift toe..."
                      rows={2}
                      maxLength={500}
                      className="max-h-24 w-full resize-none rounded-3xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white placeholder:text-white/45 outline-none backdrop-blur focus:border-white/30"
                    />
                  </div>

                  <div className="mx-auto grid w-full max-w-sm grid-cols-3 items-center">
                    <button
                      type="button"
                      onClick={resetRecordedVideo}
                      disabled={trimmingVideo || !!uploadingVideoSetKey}
                      className="flex h-12 w-12 items-center justify-center justify-self-start rounded-full bg-white/10 text-2xl font-light text-white backdrop-blur active:scale-95 disabled:opacity-40"
                      aria-label="Opnieuw"
                    >
                      ×
                    </button>

                    <div />

                    <button
                      type="button"
                      onClick={saveRecordedVideo}
                      disabled={trimmingVideo || !!uploadingVideoSetKey}
                      className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full bg-white text-2xl font-black text-black shadow-xl active:scale-95 disabled:opacity-40"
                      aria-label="Gebruik video"
                    >
                      {trimmingVideo || uploadingVideoSetKey ? "…" : "✓"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>,
          document.body,
        )}

      <ExerciseLibraryPickerModalLazy
        open={Boolean(linkingExercise)}
        items={libraryItems}
        exerciseName={linkingExercise?.name}
        onClose={() => setLinkingExercise(null)}
        onSelect={(item) => {
          if (linkingExercise) {
            void saveExerciseLibraryLink(linkingExercise.id, item.id);
          }
          setLinkingExercise(null);
        }}
      />

      <ExerciseLibraryVideoModalLazy
        item={previewLibraryItem}
        onClose={() => setPreviewLibraryItem(null)}
      />

      {blockIntakeWizard ? (
        <BlockIntakeWizardModalLazy
          wizard={blockIntakeWizard}
          onClose={() => setBlockIntakeWizard(null)}
          onCompleted={() => setBlockIntakeWizard(null)}
        />
      ) : null}

      </div>

      {planningSplitOpen &&
      isCoachLikeRole(role) &&
      !embeddedInChat &&
      planningAthleteId ? (
        <div
          className="hidden shrink-0 flex-col overflow-hidden border-t border-gray-200 bg-gray-50 lg:flex"
          style={{ height: planningPanelHeight }}
        >
          <div
            role="separator"
            aria-label="Planninghoogte aanpassen"
            className="flex h-3 shrink-0 cursor-row-resize items-center justify-center border-b border-gray-200 bg-white touch-none"
            onPointerDown={(event) => {
              planningResizeRef.current = {
                startY: event.clientY,
                startHeight: planningPanelHeight,
              };
              event.currentTarget.setPointerCapture(event.pointerId);

              function onMove(moveEvent: PointerEvent) {
                if (!planningResizeRef.current) return;
                const delta =
                  moveEvent.clientY - planningResizeRef.current.startY;
                const nextHeight = Math.min(
                  Math.max(180, planningResizeRef.current.startHeight - delta),
                  window.innerHeight * 0.75,
                );
                setPlanningPanelHeight(nextHeight);
              }

              function onUp() {
                planningResizeRef.current = null;
                window.removeEventListener("pointermove", onMove);
                window.removeEventListener("pointerup", onUp);
              }

              window.addEventListener("pointermove", onMove);
              window.addEventListener("pointerup", onUp);
            }}
          >
            <div className="h-1 w-12 rounded-full bg-gray-300" />
          </div>
          <div className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
            <div>
              <h2 className="text-sm font-bold text-black">Block & week planning</h2>
              <p className="text-xs text-gray-500">
                Sleep de rand omhoog of omlaag om de hoogte aan te passen.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPlanningSplitOpen(false)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold text-black hover:bg-gray-50"
            >
              Sluiten
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ProgramPlanningCalendarLazy
              athleteId={planningAthleteId}
              athleteName={athleteDisplayName}
              canEditNotes={isCoachLikeRole(role)}
              coachId={isCoachLikeRole(role) ? userId : undefined}
            />
          </div>
        </div>
      ) : null}

      {offlineQueueCount > 0 ? (
        <div className="fixed left-4 right-4 top-[max(1rem,env(safe-area-inset-top))] z-[899] rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 lg:left-auto lg:right-4 lg:max-w-sm">
          {offlineQueueCount} set(s) wachten op sync — wordt automatisch opgeslagen zodra je
          weer online bent.
        </div>
      ) : null}

      <ApplyTemplateModalLazy
        open={templateApplyOpen}
        onClose={() => setTemplateApplyOpen(false)}
        coachId={userId}
        athleteId={planningAthleteId}
        actingUserId={userId}
        targetBlockId={blockId}
        onApplied={({ blockId: nextBlockId, weekId: nextWeekId }) => {
          if (nextWeekId) {
            goToProgram(nextBlockId, nextWeekId);
          }
        }}
      />

      <ProgramBlockEditModal
        open={Boolean(editingBlockId)}
        title={editingBlockTitle}
        startDate={editingBlockStartDate}
        macrocycleId={editingBlockMacrocycleId}
        macrocycles={navMacrocycles}
        blockId={editingBlockId}
        athleteId={planningAthleteId}
        coachId={userId}
        onClose={() => {
          setEditingBlockId("");
          setEditingBlockTitle("");
          setEditingBlockStartDate("");
          setEditingBlockMacrocycleId("");
        }}
        onSave={(payload) => {
          void renameBlock(editingBlockId, payload);
        }}
      />

      <ProgramWeekEditModal
        open={Boolean(editingWeekId)}
        title={editingWeekTitle}
        weekId={editingWeekId}
        athleteId={planningAthleteId}
        coachId={userId}
        onClose={() => {
          setEditingWeekId("");
          setEditingWeekTitle("");
        }}
        onSave={async (payload) => {
          const weekToEdit = Object.values(weeksByBlock)
            .flat()
            .find((item) => item.id === editingWeekId);

          if (!weekToEdit) return;

          await renameWeek(weekToEdit, payload.title, payload.note);
        }}
      />

    </main>
    </div>
  );
}
