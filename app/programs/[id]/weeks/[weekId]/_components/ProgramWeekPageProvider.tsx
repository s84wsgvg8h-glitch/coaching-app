"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useOfflineSetSync } from "@/hooks/useOfflineSetSync";
import { useProgramVideoRecorder } from "@/hooks/useProgramVideoRecorder";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  loadBlockIntakeForAthlete,
  type BlockIntakeWizard,
} from "@/lib/blockIntakeWizard";
import {
  loadAthleteCurrentMaxes,
  type AthleteCurrentMaxes,
} from "@/lib/athleteCurrentMaxes";
import { loadAthleteCoachPreferences } from "@/lib/athletePreferences";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import type { ProgramBlock, ProgramExercise } from "@/lib/programWeek/types";
import { useProgramWeekCoreData } from "../_hooks/useProgramWeekCoreData";
import { useProgramWeekProgressionSnapshot } from "../_hooks/useProgramWeekProgressionSnapshot";
import { useProgramWeekNavigation } from "../_hooks/useProgramWeekNavigation";
import { useProgramWeekCoachMutations } from "../_hooks/useProgramWeekCoachMutations";
import { useProgramWeekAthleteLogging } from "../_hooks/useProgramWeekAthleteLogging";
import { buildProgramWeekPageViewProps } from "../_utils/buildProgramWeekPageViewProps";
import {
  buildAthleteSidebarBlocks,
  buildProgramSearchContext,
  buildProgramWeekStatsReport,
} from "../_utils/programWeekPageMemos";
import { createProgramWeekNavElements } from "../_utils/programWeekNavElements";
import ProgramWeekPageView from "./ProgramWeekPageView";

export default function ProgramWeekPageProvider() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const blockId = params.id as string;
  const weekId = params.weekId as string;
  const athleteId = searchParams.get("athlete");
  const focusDayId = searchParams.get("focusDay");
  const embeddedInChat = searchParams.get("embedded") === "chat";
  const viewParam = searchParams.get("view");

  const [blockIntakeWizard, setBlockIntakeWizard] =
    useState<BlockIntakeWizard | null>(null);
  const [templateApplyOpen, setTemplateApplyOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [navigatingUrl, setNavigatingUrl] = useState("");
  const [athleteCurrentMaxes, setAthleteCurrentMaxes] =
    useState<AthleteCurrentMaxes | null>(null);
  const [showE1rmInline, setShowE1rmInline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [linkingExercise, setLinkingExercise] = useState<ProgramExercise | null>(
    null,
  );
  const [previewLibraryItem, setPreviewLibraryItem] =
    useState<ExerciseLibraryItem | null>(null);
  const [planningSplitOpen, setPlanningSplitOpen] = useState(false);
  const [editorView, setEditorView] = useState<
    "card" | "raw" | "athlete" | "progression"
  >(() => {
    if (
      viewParam === "raw" ||
      viewParam === "card" ||
      viewParam === "athlete" ||
      viewParam === "progression"
    ) {
      return viewParam;
    }
    return "card";
  });
  const [planningPanelHeight, setPlanningPanelHeight] = useState(360);

  useOfflineSetSync(setOfflineQueueCount);

  const { userId: authUserId, role: authRole, loading: authLoading } = useAuth();

  const loadProgramNavigationRef = useRef<
    (
      blockData: ProgramBlock | null,
      loadedRole: string,
      loadedUserId: string,
    ) => Promise<void>
  >(() => Promise.resolve());

  const core = useProgramWeekCoreData({
    blockId,
    weekId,
    athleteId,
    router,
    loadProgramNavigationRef,
    authUserId,
    authRole,
  });

  const {
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
    athleteCoachId,
    athleteDisplayName,
    videoSubmitTarget,
    runSave,
    getOwnerAthleteId,
    loadData,
    loadDays,
    getExerciseLibraryItem,
    saveExerciseLibraryLink,
  } = core;

  const planningAthleteId = athleteId || currentBlock?.athlete_id || "";
  const effectiveRole = role || authRole;
  const isAthleteView = effectiveRole === "atleet";
  const isCoachView = isCoachLikeRole(effectiveRole);

  const scrollMobileFieldIntoView = useCallback((target: HTMLElement) => {
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }, []);

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

  const athleteLogging = useProgramWeekAthleteLogging({
    getOwnerAthleteId,
    runSave,
    days,
    exercisesByDay,
    currentBlock,
    week,
    athleteCoachId,
    userId,
    role,
    onOfflineQueueCountChange: setOfflineQueueCount,
    videoSubmitTarget,
    showE1rmInline,
    athleteCurrentMaxes,
  });

  const coachMutations = useProgramWeekCoachMutations({
    weekId,
    days,
    setDays,
    exercisesByDay,
    setExercisesByDay,
    currentBlock,
    week,
    athleteCurrentMaxes,
    showE1rmInline,
    athleteSetInputs: athleteLogging.athleteSetInputs,
    runSave,
    loadDays,
  });

  const navigation = useProgramWeekNavigation({
    blockId,
    weekId,
    athleteId,
    week,
    currentBlock,
    userId,
    role,
    router,
    startTransition,
    navigatingUrl,
    setNavigatingUrl,
    setCurrentBlock,
    setWeek,
    onReload: loadData,
    planningAthleteId,
  });

  useEffect(() => {
    loadProgramNavigationRef.current = navigation.loadProgramNavigation;
  }, [navigation.loadProgramNavigation]);

  useLayoutEffect(() => {
    setNavigatingUrl("");
    void loadData();
  }, [blockId, weekId]);

  useEffect(() => {
    if (
      viewParam === "raw" ||
      viewParam === "card" ||
      viewParam === "athlete" ||
      viewParam === "progression"
    ) {
      setEditorView(viewParam);
    }
  }, [viewParam]);

  const videoRecorder = useProgramVideoRecorder({
    onUpload: (exercise, setNumber, file, caption) =>
      athleteLogging.uploadAthleteSetVideo(exercise, setNumber, file, caption),
    getExistingCaption: (exerciseId, setNumber) =>
      athleteLogging.athleteVideosBySet[`${exerciseId}-${setNumber}`]?.caption?.trim() ||
      "",
    uploadingVideoSetKey: athleteLogging.uploadingVideoSetKey,
    scrollMobileFieldIntoView,
  });

  const { openVideoRecorder } = videoRecorder;

  useEffect(() => {
    if (!coachMutations.creatingExerciseDayId) return;

    const timeout = window.setTimeout(() => {
      coachMutations.exerciseNameInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [coachMutations.creatingExerciseDayId]);

  useEffect(() => {
    if (!coachMutations.isCreatingDay) return;

    const timeout = window.setTimeout(() => {
      coachMutations.newDayInputRef.current?.focus();
    }, 50);

    return () => window.clearTimeout(timeout);
  }, [coachMutations.isCreatingDay]);

  useEffect(() => {
    athleteLogging.loadVisibleAthleteSetInputs();
    athleteLogging.loadVisibleAthleteExerciseNotes();
    athleteLogging.loadVisibleAthleteSetVideos();
  }, [userId, athleteId, exercisesByDay]);

  useEffect(() => {
    athleteLogging.loadVisibleAthleteDayCheckins();
  }, [userId, athleteId, days]);

  useEffect(() => {
    if (!athleteLogging.athleteExercisePanelOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousOverscroll = document.body.style.overscrollBehavior;

    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.overscrollBehavior = previousOverscroll;
    };
  }, [athleteLogging.athleteExercisePanelOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        navigation.blockNavRef.current &&
        !navigation.blockNavRef.current.contains(target)
      ) {
        navigation.setBlockNavOpen(false);
      }

      if (
        navigation.weekNavRef.current &&
        !navigation.weekNavRef.current.contains(target)
      ) {
        navigation.setWeekNavOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [navigation.blockNavRef, navigation.weekNavRef]);

  const {
    navBlocks,
    navMacrocycles,
    weeksByBlock,
    openBlockIds,
    setOpenBlockIds,
    programAddMenuOpen,
    setProgramAddMenuOpen,
    startProgramAdd,
    blockNavRef,
    weekNavRef,
    blockNavOpen,
    weekNavOpen,
    setBlockNavOpen,
    setWeekNavOpen,
    goToBlock,
    goToProgram,
    creatingMacrocycle,
    creatingBlock,
    creatingWeekBlockId,
    newMacrocycleTitle,
    newBlockTitle,
    newBlockStartDate,
    newBlockDescription,
    newBlockMacrocycleId,
    newWeekTitle,
    setNewMacrocycleTitle,
    setNewBlockTitle,
    setNewBlockStartDate,
    setNewBlockDescription,
    setNewBlockMacrocycleId,
    setNewWeekTitle,
    setCreatingMacrocycle,
    setCreatingBlock,
    setCreatingWeekBlockId,
    createMacrocycle,
    createBlock,
    createWeek,
    editingBlockId,
    editingBlockTitle,
    editingBlockStartDate,
    editingBlockMacrocycleId,
    setEditingBlockId,
    setEditingBlockTitle,
    setEditingBlockStartDate,
    setEditingBlockMacrocycleId,
    editingWeekId,
    editingWeekTitle,
    setEditingWeekId,
    setEditingWeekTitle,
    renameBlock,
    renameWeek,
    duplicateBlock,
    deleteBlock,
    duplicateWeek,
    deleteWeek,
  } = navigation;

  const programSearchContext = useMemo(
    () =>
      buildProgramSearchContext({
        athleteId,
        currentBlock,
        week,
        days,
        exercisesByDay,
        weeksByBlock,
      }),
    [athleteId, currentBlock, week, days, exercisesByDay, weeksByBlock],
  );

  const athleteSidebarBlocks = useMemo(
    () =>
      buildAthleteSidebarBlocks({
        role,
        blockId,
        weekId,
        navMacrocycles,
        navBlocks,
        weeksByBlock,
        openBlockIds,
        dateHelpers: coachMutations,
      }),
    [
      role,
      blockId,
      weekId,
      navMacrocycles,
      navBlocks,
      weeksByBlock,
      openBlockIds,
      coachMutations,
    ],
  );

  const { blockWeekNav, blocksSidebar } = createProgramWeekNavElements({
    role,
    userId,
    blockId,
    weekId,
    navBlocks,
    navMacrocycles,
    weeksByBlock,
    openBlockIds,
    setOpenBlockIds,
    currentBlock,
    week,
    blockNavRef,
    weekNavRef,
    blockNavOpen,
    weekNavOpen,
    setBlockNavOpen,
    setWeekNavOpen,
    goToBlock,
    goToProgram,
    creatingMacrocycle,
    creatingBlock,
    creatingWeekBlockId,
    editingBlockId,
    editingWeekId,
    newMacrocycleTitle,
    newBlockTitle,
    newBlockStartDate,
    newBlockDescription,
    newBlockMacrocycleId,
    newWeekTitle,
    setNewMacrocycleTitle,
    setNewBlockTitle,
    setNewBlockStartDate,
    setNewBlockDescription,
    setNewBlockMacrocycleId,
    setNewWeekTitle,
    setCreatingMacrocycle,
    setCreatingBlock,
    setCreatingWeekBlockId,
    setEditingBlockId,
    setEditingBlockTitle,
    setEditingBlockStartDate,
    setEditingBlockMacrocycleId,
    setEditingWeekId,
    setEditingWeekTitle,
    createMacrocycle,
    createBlock,
    createWeek,
    duplicateBlock,
    deleteBlock,
    duplicateWeek,
    deleteWeek,
    programAddMenuOpen,
    setProgramAddMenuOpen,
    startProgramAdd,
    onOpenTemplateApply: () => setTemplateApplyOpen(true),
  });

  const weekStatsReport = useMemo(
    () =>
      buildProgramWeekStatsReport(
        days,
        exercisesByDay,
        coachMutations.getDayDate,
      ),
    [days, exercisesByDay, currentBlock, week],
  );

  const blockWeeks = weeksByBlock[blockId] || [];
  const progression = useProgramWeekProgressionSnapshot(
    isCoachView && editorView === "progression",
    blockWeeks,
  );

  const handleProgressionSaveCell = useCallback(
    async (
      exerciseId: string,
      updates: { load: string; reps: string; rpe: string },
    ) => {
      await coachMutations.saveExerciseFields(exerciseId, updates);
      await progression.refreshProgressionSnapshot();
    },
    [coachMutations.saveExerciseFields, progression.refreshProgressionSnapshot],
  );

  const programWeekPageViewProps = buildProgramWeekPageViewProps({
    embeddedInChat,
    isAthleteView,
    isCoachView,
    athleteSidebarBlocks,
    setOpenBlockIds,
    goToProgram,
    blocksSidebar,
    role,
    planningSplitOpen,
    isPending,
    navigatingUrl,
    programReady,
    authLoading,
    currentBlock,
    week,
    days,
    exercisesByDay,
    userId,
    athleteCoachId,
    athleteId,
    programSearchContext,
    blockWeekNav,
    editorView,
    setEditorView,
    setPlanningSplitOpen,
    getExerciseLibraryItem,
    saveExerciseLibraryLink,
    setLinkingExercise,
    setPreviewLibraryItem,
    weeksByBlock,
    blockId,
    weekId,
    openVideoRecorder,
    videoRecorder,
    offlineQueueCount,
    templateApplyOpen,
    setTemplateApplyOpen,
    planningAthleteId,
    editingBlockId,
    editingBlockTitle,
    editingBlockStartDate,
    editingBlockMacrocycleId,
    setEditingBlockId,
    setEditingBlockTitle,
    setEditingBlockStartDate,
    setEditingBlockMacrocycleId,
    navMacrocycles,
    renameBlock,
    editingWeekId,
    editingWeekTitle,
    setEditingWeekId,
    setEditingWeekTitle,
    renameWeek,
    linkingExercise,
    libraryItems,
    previewLibraryItem,
    blockIntakeWizard,
    setBlockIntakeWizard,
    planningPanelHeight,
    setPlanningPanelHeight,
    athleteDisplayName,
    weekStatsReport,
    progressionSnapshot: progression.snapshot,
    progressionLoading: progression.loading,
    onProgressionSaveCell: handleProgressionSaveCell,
    athleteLogging,
    coachMutations,
  });

  return <ProgramWeekPageView {...programWeekPageViewProps} />;
}
