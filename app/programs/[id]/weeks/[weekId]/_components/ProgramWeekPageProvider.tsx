"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition, type SetStateAction } from "react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useOfflineSetSync } from "@/hooks/useOfflineSetSync";
import { useOfflineProgramSync } from "@/hooks/useOfflineProgramSync";
import { PROGRAM_OFFLINE_SYNC_COMPLETE_EVENT } from "@/lib/offlineProgramEditQueue";
import { PROGRAM_BLOCK_EXERCISES_UPDATED_EVENT } from "@/lib/programWeek/applyExerciseAcrossBlock";
import { useProgramVideoRecorder } from "@/hooks/useProgramVideoRecorder";
import { useAuth } from "@/components/AuthProvider";
import { insertAthleteExtraExerciseForDay, deleteAthleteExtraExercise, updateAthleteExtraExerciseName, type AthleteExtraExerciseInput } from "@/lib/athleteExtraExercise";
import {
  setAthleteExerciseVariationChoice,
  setCoachExerciseAthleteVariationMode,
} from "@/lib/athleteExerciseVariation";
import { showAppToast } from "@/lib/appToast";
import { isCoachLikeRole } from "@/lib/authRoles";
import { setCoachLastAthleteId } from "@/lib/coachLastAthlete";
import {
  loadBlockIntakeForAthlete,
  type BlockIntakeWizard,
} from "@/lib/blockIntakeWizard";
import {
  loadAthleteCurrentMaxes,
  type AthleteCurrentMaxes,
} from "@/lib/athleteCurrentMaxes";
import { loadAthleteCoachPreferences } from "@/lib/athletePreferences";
import { loadAthleteUpcomingCompetitions } from "@/lib/competitions";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import { queryKeys } from "@/lib/queryKeys";
import type { ProgramBlock, ProgramExercise } from "@/lib/programWeek/types";
import {
  buildProgramSidebarCompetitionEntries,
  type ProgramSidebarCompetitionSource,
} from "@/lib/programWeek/competitionSidebar";
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
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import {
  appendProgramWeekQueryParams,
  buildProgramWeekPath,
  pickClosestProgramDayId,
  PRESERVE_WEEK_PARAM,
  resolveProgramEntryForAthlete,
  resolveProgramEntryFromBlockId,
} from "@/lib/programNavigation";
import { supabase } from "@/lib/supabaseClient";
import type { CoachProgramAthleteOption } from "@/components/programs/coach/CoachProgramWeekHeader";
import {
  resetProgramWeekScrollContainers,
  scrollAthleteDayIntoCenterOnOpen,
} from "@/lib/programWeek/scrollDayIntoCenter";
import ProgramWeekPageView from "./ProgramWeekPageView";

type ProgramEditorView = "card" | "raw" | "athlete" | "progression";

function getProgramEditorView(view: string | null): ProgramEditorView | null {
  if (
    view === "raw" ||
    view === "card" ||
    view === "athlete" ||
    view === "progression"
  ) {
    return view;
  }

  return null;
}

export default function ProgramWeekPageProvider() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const blockId = params.id as string;
  const weekId = params.weekId as string;
  const athleteId = searchParams.get("athlete");
  const focusDayId = searchParams.get("focusDay");
  const preserveWeek = searchParams.get(PRESERVE_WEEK_PARAM) === "1";
  const embeddedInChat = searchParams.get("embedded") === "chat";
  const viewParam = searchParams.get("view");
  const routeKey = `${blockId}:${weekId}`;

  const [blockIntakeWizard, setBlockIntakeWizard] =
    useState<BlockIntakeWizard | null>(null);
  const [templateApplyOpen, setTemplateApplyOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [navigationState, setNavigationState] = useState({
    routeKey,
    url: "",
  });
  const navigatingUrl =
    navigationState.routeKey === routeKey ? navigationState.url : "";
  const setNavigatingUrl = useCallback(
    (url: string) => setNavigationState({ routeKey, url }),
    [routeKey],
  );
  const [athleteCurrentMaxes, setAthleteCurrentMaxes] =
    useState<AthleteCurrentMaxes | null>(null);
  const [showE1rmInline, setShowE1rmInline] = useState(true);
  const offlineSetSync = useOfflineSetSync();
  const offlineProgramSync = useOfflineProgramSync();
  const offlineSync = {
    count: offlineSetSync.count + offlineProgramSync.count,
    syncing: offlineSetSync.syncing || offlineProgramSync.syncing,
    isOnline: offlineSetSync.isOnline && offlineProgramSync.isOnline,
    retry: async () => {
      await offlineSetSync.retry();
      await offlineProgramSync.retry();
    },
    dismiss: () => {
      offlineSetSync.dismiss();
      offlineProgramSync.dismiss();
    },
    refreshCount: () => {
      offlineSetSync.refreshCount();
      offlineProgramSync.refreshCount();
    },
  };
  const [linkingExercise, setLinkingExercise] = useState<ProgramExercise | null>(
    null,
  );
  const [previewLibraryItem, setPreviewLibraryItem] =
    useState<ExerciseLibraryItem | null>(null);
  const [planningSplitOpen, setPlanningSplitOpen] = useState(false);
  const [coachAthleteOptions, setCoachAthleteOptions] = useState<
    CoachProgramAthleteOption[]
  >([]);
  const [coachAthleteSwitching, setCoachAthleteSwitching] = useState(false);
  const [editorView, setEditorView] = useState<ProgramEditorView>(
    () => getProgramEditorView(viewParam) ?? "card",
  );
  const [syncedViewParam, setSyncedViewParam] = useState(viewParam);
  const [planningPanelHeight, setPlanningPanelHeight] = useState(360);
  const [addingExtraExercise, setAddingExtraExercise] = useState(false);
  const [deletingExtraExerciseId, setDeletingExtraExerciseId] = useState("");
  const [renamingExtraExerciseId, setRenamingExtraExerciseId] = useState("");
  const [choosingVariationExerciseId, setChoosingVariationExerciseId] = useState("");

  if (viewParam !== syncedViewParam) {
    setSyncedViewParam(viewParam);
    const nextEditorView = getProgramEditorView(viewParam);
    if (nextEditorView && nextEditorView !== editorView) {
      setEditorView(nextEditorView);
    }
  }

  const { userId: authUserId, role: authRole, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();

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
    awaitPendingSaves,
    getOwnerAthleteId,
    loadData,
    loadDays,
    getExerciseLibraryItem,
    saveExerciseLibraryLink,
  } = core;

  const handlePullToRefresh = useCallback(async () => {
    queryClient.removeQueries({
      queryKey: queryKeys.programWeekCore(blockId, weekId),
    });
    await loadData();
    if (currentBlock) {
      await loadProgramNavigationRef.current(
        currentBlock,
        role || authRole,
        userId || authUserId,
      );
    }
  }, [
    authRole,
    authUserId,
    blockId,
    currentBlock,
    loadData,
    queryClient,
    role,
    userId,
    weekId,
  ]);

  useEffect(() => {
    function handleProgramOfflineSyncComplete(event: Event) {
      const detail = (event as CustomEvent<Array<{ blockId: string; weekId: string }>>)
        .detail;
      if (!Array.isArray(detail)) return;
      if (detail.some((item) => item.blockId === blockId && item.weekId === weekId)) {
        void loadDays();
        void loadData();
      }
    }

    window.addEventListener(
      PROGRAM_OFFLINE_SYNC_COMPLETE_EVENT,
      handleProgramOfflineSyncComplete as EventListener,
    );
    return () => {
      window.removeEventListener(
        PROGRAM_OFFLINE_SYNC_COMPLETE_EVENT,
        handleProgramOfflineSyncComplete as EventListener,
      );
    };
  }, [blockId, loadData, loadDays, weekId]);

  const planningAthleteId = athleteId || currentBlock?.athlete_id || "";
  const effectiveRole = authRole || role;
  const isAthleteView = authRole === "atleet";
  const isCoachView = isCoachLikeRole(authRole);

  useEffect(() => {
    if (authLoading || authRole !== "atleet") return;

    const params = new URLSearchParams(searchParams.toString());
    let changed = false;

    if (
      viewParam === "card" ||
      viewParam === "raw" ||
      viewParam === "progression"
    ) {
      params.delete("view");
      changed = true;
    }

    if (athleteId) {
      params.delete("athlete");
      changed = true;
    }

    if (!changed) return;

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [
    athleteId,
    authLoading,
    authRole,
    pathname,
    router,
    searchParams,
    viewParam,
  ]);

  useEffect(() => {
    if (!isCoachView || !userId) {
      setCoachAthleteOptions([]);
      return;
    }

    let cancelled = false;

    async function loadCoachAthletes() {
      const ctx = await loadCoachOrgContext(userId);
      if (!ctx || cancelled) return;

      let query = supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      query = applyAthleteScope(query, ctx);
      const { data } = await query;

      if (cancelled) return;

      setCoachAthleteOptions(
        (data || []).map((row) => ({
          id: row.id,
          name: row.full_name?.trim() || "Atleet",
        })),
      );
    }

    void loadCoachAthletes();

    return () => {
      cancelled = true;
    };
  }, [isCoachView, userId]);

  const coachAthleteOptionsWithCurrent = useMemo(() => {
    if (
      !planningAthleteId ||
      coachAthleteOptions.some((option) => option.id === planningAthleteId)
    ) {
      return coachAthleteOptions;
    }

    return [
      ...coachAthleteOptions,
      {
        id: planningAthleteId,
        name: athleteDisplayName?.trim() || "Atleet",
      },
    ].sort((left, right) => left.name.localeCompare(right.name, "nl"));
  }, [athleteDisplayName, coachAthleteOptions, planningAthleteId]);

  const handleCoachAthleteChange = useCallback(
    async (targetAthleteId: string) => {
      if (!userId || !targetAthleteId || targetAthleteId === planningAthleteId) {
        return;
      }

      setCoachAthleteSwitching(true);

      try {
        setCoachLastAthleteId(targetAthleteId);

        const { data: entry, error } = await resolveProgramEntryForAthlete(
          targetAthleteId,
          userId,
        );

        if (error || !entry) {
          showAppToast(error || "Geen programma gevonden voor deze atleet.");
          return;
        }

        let href = buildProgramWeekPath(entry, { coachViewingAthlete: true });
        if (editorView !== "card") {
          href += `${href.includes("?") ? "&" : "?"}view=${editorView}`;
        }

        router.push(href);
      } finally {
        setCoachAthleteSwitching(false);
      }
    },
    [
      editorView,
      planningAthleteId,
      router,
      userId,
    ],
  );

  useEffect(() => {
    if (!programReady || preserveWeek || !userId || !blockId || !weekId) {
      return;
    }

    let cancelled = false;

    async function ensureCurrentWeek() {
      const athleteIdForResolve =
        athleteId || currentBlock?.athlete_id || (role === "atleet" ? userId : null);

      if (!athleteIdForResolve) return;

      const { data: entry, error } = await resolveProgramEntryFromBlockId(
        blockId,
        isCoachView ? athleteIdForResolve : null,
      );

      if (cancelled || error || !entry || entry.weekId === weekId) {
        return;
      }

      let href = buildProgramWeekPath(entry, {
        coachViewingAthlete: isCoachView,
      });

      if (viewParam && viewParam !== "card") {
        href = appendProgramWeekQueryParams(href, { view: viewParam });
      }

      if (embeddedInChat) {
        href = appendProgramWeekQueryParams(href, { embedded: "chat" });
      }

      router.replace(href);
    }

    void ensureCurrentWeek();

    return () => {
      cancelled = true;
    };
  }, [
    athleteId,
    blockId,
    currentBlock?.athlete_id,
    embeddedInChat,
    isCoachView,
    preserveWeek,
    programReady,
    role,
    router,
    userId,
    viewParam,
    weekId,
  ]);

  const scrollMobileFieldIntoView = useCallback((target: HTMLElement) => {
    window.setTimeout(() => {
      target.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 300);
  }, []);

  useLayoutEffect(() => {
    if (!programReady) return;

    resetProgramWeekScrollContainers();
  }, [blockId, weekId, programReady]);

  useLayoutEffect(() => {
    if (!programReady || !isAthleteView || days.length === 0) return;

    const targetDayId =
      focusDayId ??
      (currentBlock && week
        ? pickClosestProgramDayId(days, currentBlock, week)
        : null);

    if (!targetDayId) return;

    resetProgramWeekScrollContainers();

    const dayElement = document.getElementById(`program-day-${targetDayId}`);
    const gridElement = dayElement?.closest(
      ".athlete-program-days-grid",
    ) as HTMLElement | null;

    if (dayElement && gridElement) {
      scrollAthleteDayIntoCenterOnOpen(dayElement, gridElement);
    }
  }, [
    focusDayId,
    days,
    programReady,
    blockId,
    weekId,
    isAthleteView,
    currentBlock,
    week,
  ]);

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
    onOfflineQueueCountChange: offlineSync.refreshCount,
    videoSubmitTarget,
    showE1rmInline,
    athleteCurrentMaxes,
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
    editorView,
    embeddedInChat,
  });

  const blockWeeksForDates =
    (navigation.weeksByBlock[blockId]?.length ?? 0) > 0
      ? navigation.weeksByBlock[blockId]
      : week
        ? [week]
        : [];

  const coachMutations = useProgramWeekCoachMutations({
    blockId,
    weekId,
    days,
    setDays,
    exercisesByDay,
    setExercisesByDay,
    currentBlock,
    week,
    blockWeeks: blockWeeksForDates,
    athleteCurrentMaxes,
    showE1rmInline,
    athleteSetInputs: athleteLogging.athleteSetInputs,
    runSave,
    loadDays,
  });

  loadProgramNavigationRef.current = navigation.loadProgramNavigation;

  useEffect(() => {
    if (!programReady || !currentBlock || authLoading) return;

    void loadProgramNavigationRef.current(
      currentBlock,
      role || authRole,
      userId || authUserId,
    );
  }, [
    programReady,
    currentBlock,
    blockId,
    weekId,
    week,
    athleteId,
    userId,
    role,
    authRole,
    authUserId,
    authLoading,
  ]);

  useLayoutEffect(() => {
    void loadData();
  }, [blockId, weekId]);

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

    const html = document.documentElement;
    const body = document.body;
    const scrollContainers = Array.from(
      document.querySelectorAll(
        ".mobile-page-shell__body--scroll, .athlete-program-main-scroll, .athlete-program-days-grid",
      ),
    ).filter((node): node is HTMLElement => node instanceof HTMLElement);

    const previousHtmlOverflow = html.style.overflow;
    const previousHtmlOverscroll = html.style.overscrollBehavior;
    const previousHtmlTouchAction = html.style.touchAction;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;
    const previousBodyTouchAction = body.style.touchAction;
    const previousContainerStyles = scrollContainers.map((node) => ({
      overflow: node.style.overflow,
      overscrollBehavior: node.style.overscrollBehavior,
      touchAction: node.style.touchAction,
    }));

    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    html.style.touchAction = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";

    scrollContainers.forEach((node) => {
      node.style.overflow = "hidden";
      node.style.overscrollBehavior = "none";
      node.style.touchAction = "none";
    });

    return () => {
      html.style.overflow = previousHtmlOverflow;
      html.style.overscrollBehavior = previousHtmlOverscroll;
      html.style.touchAction = previousHtmlTouchAction;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
      body.style.touchAction = previousBodyTouchAction;

      scrollContainers.forEach((node, index) => {
        const previous = previousContainerStyles[index];
        node.style.overflow = previous.overflow;
        node.style.overscrollBehavior = previous.overscrollBehavior;
        node.style.touchAction = previous.touchAction;
      });
    };
  }, [athleteLogging.athleteExercisePanelOpen]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        target instanceof Element &&
        target.closest(
          ".program-mobile-week-nav-menu, .program-mobile-week-nav-backdrop, .program-week-add-menu-dropdown",
        )
      ) {
        return;
      }

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
    goToBlock: goToBlockBase,
    goToProgram: goToProgramBase,
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
    pendingBlockAction,
    duplicateWeek,
    deleteWeek,
    draggedWeekId,
    weekDropIndicator,
    movingWeek,
    handleWeekDragStart,
    handleWeekDragEnd,
    handleWeekDragOver,
    handleWeekListDragOver,
  } = navigation;

  const [athleteCompetitionSources, setAthleteCompetitionSources] = useState<
    ProgramSidebarCompetitionSource[]
  >([]);

  useEffect(() => {
    if (!planningAthleteId) {
      setAthleteCompetitionSources([]);
      return;
    }

    let cancelled = false;

    void loadAthleteUpcomingCompetitions(planningAthleteId).then((rows) => {
      if (cancelled) return;
      setAthleteCompetitionSources(
        rows.map((row) => ({
          id: row.id,
          naam: row.naam,
          start_date: row.start_date,
          end_date: row.end_date,
        })),
      );
    });

    return () => {
      cancelled = true;
    };
  }, [planningAthleteId]);

  const programEditFlushRef = useRef<(() => Promise<void>) | null>(null);

  const registerProgramEditFlush = useCallback(
    (flush: (() => Promise<void>) | null) => {
      programEditFlushRef.current = flush;
    },
    [],
  );

  const flushBeforeProgramNavigation = useCallback(async () => {
    await programEditFlushRef.current?.();

    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }

    await awaitPendingSaves();
  }, [awaitPendingSaves]);

  const goToProgram = useCallback(
    async (targetBlockId: string, targetWeekId: string) => {
      if (targetBlockId === blockId && targetWeekId === weekId) return;
      await flushBeforeProgramNavigation();
      goToProgramBase(targetBlockId, targetWeekId);
    },
    [blockId, weekId, flushBeforeProgramNavigation, goToProgramBase],
  );

  const goToBlock = useCallback(
    async (targetBlockId: string) => {
      if (targetBlockId === blockId) return;
      await flushBeforeProgramNavigation();
      goToBlockBase(targetBlockId);
    },
    [blockId, flushBeforeProgramNavigation, goToBlockBase],
  );

  const handleEditorViewChange = useCallback(
    (view: SetStateAction<"card" | "raw" | "athlete" | "progression">) => {
      const nextView = typeof view === "function" ? view(editorView) : view;
      if (nextView === editorView) return;

      void (async () => {
        await flushBeforeProgramNavigation();
        setEditorView(nextView);

        const params = new URLSearchParams(searchParams.toString());
        if (nextView === "card") {
          params.delete("view");
        } else {
          params.set("view", nextView);
        }

        const query = params.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      })();
    },
    [
      editorView,
      flushBeforeProgramNavigation,
      pathname,
      router,
      searchParams,
    ],
  );

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

  const sidebarCompetitions = useMemo(
    () =>
      buildProgramSidebarCompetitionEntries(
        navBlocks,
        weeksByBlock,
        athleteCompetitionSources,
      ),
    [navBlocks, weeksByBlock, athleteCompetitionSources],
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
    pendingBlockAction,
    duplicateWeek,
    deleteWeek,
    draggedWeekId,
    weekDropIndicator,
    movingWeek,
    onWeekDragStart: handleWeekDragStart,
    onWeekDragEnd: handleWeekDragEnd,
    onWeekDragOver: handleWeekDragOver,
    onWeekListDragOver: handleWeekListDragOver,
    programAddMenuOpen,
    setProgramAddMenuOpen,
    startProgramAdd,
    onOpenTemplateApply: () => setTemplateApplyOpen(true),
    editorView,
    onEditorViewChange: handleEditorViewChange,
    showEditorViewToggle: isCoachLikeRole(role),
    athleteId: planningAthleteId,
    sidebarCompetitions,
    showCompareView: isCoachView,
    compareCurrentDays: days,
    compareCurrentExercisesByDay: exercisesByDay,
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

  const blockWeeks = useMemo(
    () => weeksByBlock[blockId] || [],
    [blockId, weeksByBlock],
  );
  const progressionAthleteId =
    planningAthleteId || currentBlock?.athlete_id || null;
  const progression = useProgramWeekProgressionSnapshot(
    isCoachView && editorView === "progression",
    blockWeeks,
    progressionAthleteId,
  );

  useEffect(() => {
    function handleBlockExercisesUpdated(event: Event) {
      const detail = (event as CustomEvent<{ blockId?: string }>).detail;
      if (detail?.blockId !== blockId) return;
      void progression.refreshProgressionSnapshot({ silent: true });
    }

    window.addEventListener(
      PROGRAM_BLOCK_EXERCISES_UPDATED_EVENT,
      handleBlockExercisesUpdated,
    );
    return () => {
      window.removeEventListener(
        PROGRAM_BLOCK_EXERCISES_UPDATED_EVENT,
        handleBlockExercisesUpdated,
      );
    };
  }, [blockId, progression.refreshProgressionSnapshot]);

  const addAthleteExtraExercise = useCallback(
    async (
      dayId: string,
      payload: Pick<AthleteExtraExerciseInput, "name" | "sets" | "reps" | "rpe">,
    ) => {
      if (!isAthleteView) return;

      setAddingExtraExercise(true);
      try {
        const { exercise, error } = await insertAthleteExtraExerciseForDay({
          dayId,
          name: payload.name,
          sets: payload.sets,
          reps: payload.reps,
          rpe: payload.rpe,
        });

        if (error || !exercise) {
          showAppToast(error || "Extra oefening toevoegen mislukt");
          throw new Error(error || "Extra oefening toevoegen mislukt");
        }

        await loadDays();
        showAppToast(`"${payload.name.trim()}" toegevoegd als extra oefening`);
        athleteLogging.openAthleteExercisePanel(exercise.id);
      } finally {
        setAddingExtraExercise(false);
      }
    },
    [isAthleteView, loadDays, athleteLogging.openAthleteExercisePanel],
  );

  const deleteAthleteExtraExerciseById = useCallback(
    async (exerciseId: string) => {
      if (!isAthleteView) return;

      const exercise = Object.values(exercisesByDay)
        .flat()
        .find((item) => item.id === exerciseId);
      const exerciseName = exercise?.name?.trim() || "deze extra oefening";

      if (
        !window.confirm(
          `"${exerciseName}" verwijderen? Dit kan niet ongedaan worden gemaakt.`,
        )
      ) {
        return;
      }

      setDeletingExtraExerciseId(exerciseId);
      try {
        const { error } = await deleteAthleteExtraExercise(exerciseId);

        if (error) {
          showAppToast(error);
          throw new Error(error);
        }

        if (athleteLogging.selectedAthleteExerciseId === exerciseId) {
          athleteLogging.setAthleteExercisePanelOpen(false);
          athleteLogging.setSelectedAthleteExerciseId("");
          athleteLogging.setAthleteNotePanelOpen(false);
          athleteLogging.resetPreviousWeekData();
        }

        await loadDays();
        showAppToast(`"${exerciseName}" verwijderd`);
      } finally {
        setDeletingExtraExerciseId("");
      }
    },
    [
      isAthleteView,
      exercisesByDay,
      athleteLogging.selectedAthleteExerciseId,
      athleteLogging.setAthleteExercisePanelOpen,
      athleteLogging.setSelectedAthleteExerciseId,
      athleteLogging.setAthleteNotePanelOpen,
      athleteLogging.resetPreviousWeekData,
      loadDays,
    ],
  );

  const renameAthleteExtraExerciseById = useCallback(
    async (exerciseId: string, name: string) => {
      if (!isAthleteView) return;

      const trimmedName = name.trim();
      if (!trimmedName) {
        showAppToast("Vul een oefeningnaam in");
        return;
      }

      setRenamingExtraExerciseId(exerciseId);
      try {
        const { error } = await updateAthleteExtraExerciseName(
          exerciseId,
          trimmedName,
        );

        if (error) {
          showAppToast(error);
          throw new Error(error);
        }

        await loadDays();
        showAppToast(`Naam gewijzigd naar "${trimmedName}"`);
      } finally {
        setRenamingExtraExerciseId("");
      }
    },
    [isAthleteView, loadDays],
  );

  const chooseAthleteExerciseVariationById = useCallback(
    async (exerciseId: string, variationName: string) => {
      if (!isAthleteView) return;

      const trimmedName = variationName.trim();
      if (!trimmedName) {
        showAppToast("Vul een variatie in");
        return;
      }

      setChoosingVariationExerciseId(exerciseId);
      try {
        const { error } = await setAthleteExerciseVariationChoice(
          exerciseId,
          trimmedName,
        );

        if (error) {
          showAppToast(error);
          throw new Error(error);
        }

        await loadDays();
        showAppToast(`Variatie opgeslagen: ${trimmedName}`);
      } finally {
        setChoosingVariationExerciseId("");
      }
    },
    [isAthleteView, loadDays],
  );

  const toggleAthleteVariationModeById = useCallback(
    async (exerciseId: string, enabled: boolean, baseName?: string) => {
      if (!isCoachView) return;

      const { error } = await setCoachExerciseAthleteVariationMode(
        exerciseId,
        enabled,
        baseName,
      );

      if (error) {
        showAppToast(error);
        return;
      }

      await loadDays();
      await progression.refreshProgressionSnapshot({ silent: true });
      showAppToast(
        enabled
          ? "Atleet kiest variatie — geldt voor alle weken in dit block"
          : "Variatie-modus uitgeschakeld",
      );
    },
    [isCoachView, loadDays, progression.refreshProgressionSnapshot],
  );

  const handleProgressionSaveCell = useCallback(
    async (
      exerciseId: string,
      updates: { load: string; reps: string; rpe: string },
    ) => {
      const cleaned = {
        load: updates.load.trim(),
        reps: updates.reps.trim(),
        rpe: updates.rpe.trim(),
      };
      const revert = progression.patchProgressionExercise(exerciseId, cleaned);
      const saved = await coachMutations.saveExerciseFields(exerciseId, cleaned, {
        reloadOnError: false,
      });

      if (!saved) {
        revert();
      }
    },
    [coachMutations.saveExerciseFields, progression.patchProgressionExercise],
  );

  const programWeekPageViewProps = buildProgramWeekPageViewProps({
    embeddedInChat,
    isAthleteView,
    isCoachView,
    athleteSidebarBlocks,
    sidebarCompetitions,
    sidebarAthleteId: planningAthleteId || userId,
    setOpenBlockIds,
    goToProgram,
    blocksSidebar,
    role: authRole || role,
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
    coachAthleteOptions: coachAthleteOptionsWithCurrent,
    currentCoachAthleteId: planningAthleteId,
    onCoachAthleteChange: isCoachView ? handleCoachAthleteChange : undefined,
    coachAthleteSwitching,
    programSearchContext,
    blockWeekNav,
    editorView,
    setEditorView: handleEditorViewChange,
    registerProgramEditFlush,
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
    offlineQueueCount: offlineSync.count,
    offlineSyncSyncing: offlineSync.syncing,
    offlineSyncOnline: offlineSync.isOnline,
    onRetryOfflineSync: offlineSync.retry,
    onDismissOfflineSync: offlineSync.dismiss,
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
    progressionBlocks: navBlocks,
    progressionWeeksByBlock: weeksByBlock,
    onProgressionSaveCell: handleProgressionSaveCell,
    athleteLogging,
    coachMutations,
    onAddExtraExercise: isAthleteView ? addAthleteExtraExercise : undefined,
    onDeleteExtraExercise: isAthleteView ? deleteAthleteExtraExerciseById : undefined,
    onRenameExtraExercise: isAthleteView ? renameAthleteExtraExerciseById : undefined,
    onChooseExerciseVariation: isAthleteView
      ? chooseAthleteExerciseVariationById
      : undefined,
    onToggleAthleteVariationMode: isCoachView
      ? toggleAthleteVariationModeById
      : undefined,
    addingExtraExercise,
    deletingExtraExerciseId,
    renamingExtraExerciseId,
    choosingVariationExerciseId,
    onPullToRefresh: handlePullToRefresh,
  });

  return <ProgramWeekPageView {...programWeekPageViewProps} />;
}
