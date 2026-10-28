"use client";

import { useCallback, useRef, useState, type Dispatch, type SetStateAction, type TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toDateInputValue } from "@/components/programs/ProgramBlockDateField";
import { persistBlockEditModalNote } from "@/components/programs/ProgramBlockEditModal";
import { persistWeekEditModalNote } from "@/components/programs/ProgramWeekEditModal";
import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";
import { duplicateProgramBlock } from "@/lib/programBlockDuplicate";
import { deleteProgramBlock } from "@/lib/programBlockDelete";
import { createProgramWeekForBlock } from "@/lib/programWeekCreate";
import { duplicateProgramWeekId } from "@/lib/programWeekDuplicate";
import { showAppToast } from "@/lib/appToast";
import {
  createProgramMacrocycle,
  loadProgramMacrocycles,
  type ProgramMacrocycle,
} from "@/lib/programMacrocycles";
import { isAthleteRole } from "@/lib/authRoles";
import {
  appendProgramWeekQueryParams,
  buildProgramWeekPath,
  resolveProgramEntryFromBlockId,
  withPreserveWeekParam,
} from "@/lib/programNavigation";
import type { EditorView } from "@/components/programs/coach/CoachProgramWeekHeader";
import { getDuplicatedBlockStartDateObject } from "@/lib/programWeek/dateFormatting";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import {
  getStoredProgramNavigation,
  saveStoredProgramNavigation,
} from "@/lib/programNavLocalStore";
import { cacheAllWeeksForBlock } from "@/lib/programWeekCoreClient";
import { isOfflineEnvironment } from "@/lib/offlineNetwork";
import { getUnknownErrorMessage } from "../_utils/programWeekProviderUtils";
import { supabase } from "@/lib/supabaseClient";
import {
  computeChainedBlockStartDates,
  moveProgramWeekBetweenBlocks,
  resolveWeekDropIndex,
  syncBlockDayScheduledDates,
  normalizeBlockWeekNumbersIfNeeded,
  type WeekDropIndicator,
} from "@/lib/programWeekMove";
import {
  setDragPreviewFromElement,
  setEmptyDragImage,
} from "@/lib/programWeek/constants";

export type UseProgramWeekNavigationOptions = {
  blockId: string;
  weekId: string;
  athleteId: string | null;
  week: ProgramWeek | null;
  currentBlock: ProgramBlock | null;
  userId: string;
  role: string;
  router: AppRouterInstance;
  startTransition: TransitionStartFunction;
  navigatingUrl: string;
  setNavigatingUrl: (url: string) => void;
  setCurrentBlock: Dispatch<SetStateAction<ProgramBlock | null>>;
  setWeek: Dispatch<SetStateAction<ProgramWeek | null>>;
  onReload: () => Promise<void>;
  planningAthleteId: string;
  editorView?: EditorView;
  embeddedInChat?: boolean;
};

export function useProgramWeekNavigation({
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
  onReload,
  planningAthleteId,
  editorView = "card",
  embeddedInChat = false,
}: UseProgramWeekNavigationOptions) {
  const [navBlocks, setNavBlocks] = useState<ProgramBlock[]>([]);
  const [navMacrocycles, setNavMacrocycles] = useState<ProgramMacrocycle[]>([]);
  const [weeksByBlock, setWeeksByBlock] = useState<Record<string, ProgramWeek[]>>({});
  const [openBlockIds, setOpenBlockIds] = useState<Record<string, boolean>>({});
  const [openMacrocycleIds, setOpenMacrocycleIds] = useState<Record<string, boolean>>({});

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
  const [pendingBlockAction, setPendingBlockAction] = useState<{
    blockId: string;
    type: "duplicate" | "delete";
  } | null>(null);

  const [blockNavOpen, setBlockNavOpen] = useState(false);
  const [weekNavOpen, setWeekNavOpen] = useState(false);
  const blockNavRef = useRef<HTMLDivElement | null>(null);
  const weekNavRef = useRef<HTMLDivElement | null>(null);

  const [draggedWeekId, setDraggedWeekId] = useState("");
  const [weekDropIndicator, setWeekDropIndicator] =
    useState<WeekDropIndicator | null>(null);
  const [movingWeek, setMovingWeek] = useState(false);
  const weekDropIndicatorRef = useRef<WeekDropIndicator | null>(null);
  const draggedWeekSourceBlockRef = useRef("");

  function isWeekDragBlockedTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return true;
    return Boolean(
      target.closest(
        "input, textarea, select, button, a, label, [contenteditable='true']",
      ),
    );
  }

  const handleWeekDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>, week: ProgramWeek) => {
      if (isWeekDragBlockedTarget(event.target)) {
        event.preventDefault();
        return;
      }

      draggedWeekSourceBlockRef.current = week.program_block_id;
      setDraggedWeekId(week.id);
      setWeekDropIndicator(null);
      weekDropIndicatorRef.current = null;

      if (event.currentTarget instanceof HTMLElement) {
        setDragPreviewFromElement(event, event.currentTarget);
      } else {
        setEmptyDragImage(event);
      }
    },
    [],
  );

  const handleWeekDragOver = useCallback(
    (
      event: React.DragEvent<HTMLElement>,
      blockId: string,
      targetWeekId: string | null,
      position: WeekDropIndicator["position"],
    ) => {
      event.preventDefault();
      event.stopPropagation();
      if (!draggedWeekId) return;

      const next: WeekDropIndicator = { blockId, targetWeekId, position };
      weekDropIndicatorRef.current = next;
      setWeekDropIndicator(next);
    },
    [draggedWeekId],
  );

  const handleWeekListDragOver = useCallback(
    (event: React.DragEvent<HTMLElement>, blockId: string) => {
      event.preventDefault();
      if (!draggedWeekId) return;

      const next: WeekDropIndicator = {
        blockId,
        targetWeekId: null,
        position: "after",
      };
      weekDropIndicatorRef.current = next;
      setWeekDropIndicator(next);
    },
    [draggedWeekId],
  );

  const handleWeekDragEnd = useCallback(() => {
    void (async () => {
      const indicator = weekDropIndicatorRef.current;
      const weekId = draggedWeekId;
      const sourceBlockId = draggedWeekSourceBlockRef.current;

      setDraggedWeekId("");
      setWeekDropIndicator(null);
      weekDropIndicatorRef.current = null;
      draggedWeekSourceBlockRef.current = "";

      if (!indicator || !weekId || !sourceBlockId) return;

      const sourceWeeks = (weeksByBlock[sourceBlockId] || []).filter(
        (week) => week.id !== weekId,
      );
      const targetWeeks =
        indicator.blockId === sourceBlockId
          ? sourceWeeks
          : [...(weeksByBlock[indicator.blockId] || [])];

      const targetWeekIndex = resolveWeekDropIndex(targetWeeks, indicator);
      const sourceIndex = (weeksByBlock[sourceBlockId] || []).findIndex(
        (week) => week.id === weekId,
      );

      if (
        indicator.blockId === sourceBlockId &&
        (targetWeekIndex === sourceIndex || targetWeekIndex === sourceIndex + 1)
      ) {
        return;
      }

      setMovingWeek(true);

      const { weeksByBlock: nextWeeksByBlock, error } =
        await moveProgramWeekBetweenBlocks({
          weekId,
          sourceBlockId,
          targetBlockId: indicator.blockId,
          targetWeekIndex,
          navBlocks,
          weeksByBlock,
        });

      if (error || !nextWeeksByBlock) {
        showAppToast(error || "Week verplaatsen mislukt.");
        setMovingWeek(false);
        return;
      }

      setWeeksByBlock(nextWeeksByBlock);

      const startDateUpdates = computeChainedBlockStartDates(
        navBlocks,
        nextWeeksByBlock,
      );

      if (startDateUpdates.size > 0) {
        setNavBlocks((current) =>
          current.map((block) =>
            startDateUpdates.has(block.id)
              ? { ...block, start_date: startDateUpdates.get(block.id)! }
              : block,
          ),
        );
      }

      if (currentBlock && startDateUpdates.has(currentBlock.id)) {
        setCurrentBlock({
          ...currentBlock,
          start_date: startDateUpdates.get(currentBlock.id)!,
        });
      }

      showAppToast("Week verplaatst.");

      await loadProgramNavigation(currentBlock, role, userId);

      if (indicator.blockId !== blockId) {
        goToProgram(indicator.blockId, weekId);
      } else {
        await onReload();
      }

      setMovingWeek(false);
    })();
  }, [
    blockId,
    currentBlock,
    draggedWeekId,
    navBlocks,
    onReload,
    role,
    userId,
    weekId,
    weeksByBlock,
  ]);

  async function loadProgramNavigation(
    blockData: ProgramBlock | null,
    loadedRole: string,
    loadedUserId: string,
  ) {
    let ownerAthleteId =
      athleteId ||
      blockData?.athlete_id ||
      planningAthleteId ||
      (isAthleteRole(loadedRole) ? loadedUserId : "");

    if (!ownerAthleteId && blockData?.id) {
      const { data: blockRow } = await supabase
        .from("program_blocks")
        .select("athlete_id")
        .eq("id", blockData.id)
        .maybeSingle();

      if (blockRow?.athlete_id) {
        ownerAthleteId = blockRow.athlete_id;
      }
    }

    if (ownerAthleteId) {
      const storedNav = await getStoredProgramNavigation(ownerAthleteId);
      if (storedNav) {
        setNavBlocks(storedNav.navBlocks);
        setWeeksByBlock(storedNav.weeksByBlock);
        setNavMacrocycles(storedNav.navMacrocycles);
      }
    }

    if (isOfflineEnvironment()) {
      return;
    }

    async function loadWeeksForBlocks(
      loadedBlocks: ProgramBlock[],
    ): Promise<Record<string, ProgramWeek[]>> {
      const blockIds = loadedBlocks.map((block) => block.id);
      const grouped: Record<string, ProgramWeek[]> = {};

      loadedBlocks.forEach((block) => {
        grouped[block.id] = [];
      });

      if (blockIds.length === 0) {
        return grouped;
      }

      const { data: weeksData, error: weeksError } = await supabase
        .from("program_weeks")
        .select("*")
        .in("program_block_id", blockIds)
        .order("week_number", { ascending: true });

      if (weeksError) {
        console.error("[program-nav] weken laden mislukt:", weeksError.message);
      }

      (weeksData || []).forEach((item) => {
        if (!grouped[item.program_block_id]) {
          grouped[item.program_block_id] = [];
        }
        grouped[item.program_block_id].push(item as ProgramWeek);
      });

      if (blockId && (grouped[blockId]?.length ?? 0) === 0) {
        const { data: blockWeeks, error: blockWeeksError } = await supabase
          .from("program_weeks")
          .select("*")
          .eq("program_block_id", blockId)
          .order("week_number", { ascending: true });

        if (blockWeeksError) {
          console.error(
            "[program-nav] weken voor huidig block laden mislukt:",
            blockWeeksError.message,
          );
        }

        if (blockWeeks?.length) {
          grouped[blockId] = blockWeeks as ProgramWeek[];
        } else if (week?.program_block_id === blockId) {
          grouped[blockId] = [week];
        }
      }

      return grouped;
    }

    async function applyFallbackNavigation() {
      if (!blockData) return;

      setNavBlocks([blockData]);
      setNavMacrocycles([]);

      const grouped = await loadWeeksForBlocks([blockData]);
      setWeeksByBlock(grouped);
      setOpenBlockIds({ [blockData.id]: true });
    }

    if (!ownerAthleteId) {
      console.warn("[program-nav] ownerAthleteId ontbreekt — fallback nav", {
        blockId: blockData?.id,
        loadedRole,
        loadedUserId,
      });
      await applyFallbackNavigation();
      return;
    }

    const [{ data: blocksData, error: blocksError }, macrocycles] =
      await Promise.all([
        supabase
          .from("program_blocks")
          .select("*")
          .eq("athlete_id", ownerAthleteId)
          .order("start_date", { ascending: true }),
        loadProgramMacrocycles(ownerAthleteId),
      ]);

    if (blocksError) {
      console.error("[program-nav] blocks laden mislukt:", blocksError.message);
    }

    let loadedBlocks = (blocksData || []) as ProgramBlock[];

    if (
      loadedBlocks.length === 0 &&
      blockData?.id &&
      !loadedBlocks.some((block) => block.id === blockData.id)
    ) {
      const { data: fallbackBlock } = await supabase
        .from("program_blocks")
        .select("*")
        .eq("id", blockData.id)
        .maybeSingle();

      if (fallbackBlock) {
        loadedBlocks = [fallbackBlock as ProgramBlock];
      }
    }

    if (loadedBlocks.length === 0) {
      await applyFallbackNavigation();
      return;
    }

    setNavBlocks(loadedBlocks);
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

    const grouped = await loadWeeksForBlocks(loadedBlocks);

    let normalizedGrouped = grouped;
    try {
      const nextGrouped = { ...grouped };
      for (const block of loadedBlocks) {
        const blockWeeks = grouped[block.id] || [];
        if (blockWeeks.length === 0) continue;

        const normalized = await normalizeBlockWeekNumbersIfNeeded(blockWeeks);
        if (normalized) {
          nextGrouped[block.id] = normalized;
          if (block.start_date) {
            try {
              await syncBlockDayScheduledDates(block, normalized);
            } catch (syncError) {
              console.error(
                "[program-nav] dagdatums sync na week-renumber mislukt:",
                syncError,
              );
            }
          }
        }
      }
      normalizedGrouped = nextGrouped;
    } catch (normalizeError) {
      console.error(
        "[program-nav] weeknummers normaliseren mislukt:",
        normalizeError,
      );
    }

    setWeeksByBlock(normalizedGrouped);

    const openState: Record<string, boolean> = {};
    loadedBlocks.forEach((block) => {
      openState[block.id] =
        block.id === blockId || openBlockIds[block.id] || false;
    });

    setOpenBlockIds(openState);

    if (ownerAthleteId) {
      await saveStoredProgramNavigation(ownerAthleteId, {
        navBlocks: loadedBlocks,
        weeksByBlock: normalizedGrouped,
        navMacrocycles: macrocycles,
      });

      for (const block of loadedBlocks) {
        void cacheAllWeeksForBlock(block.id, {
          userId: loadedUserId,
          role: loadedRole,
        });
      }
    }
  }


  function withProgramNavigationParams(href: string) {
    let url = withPreserveWeekParam(href);
    if (editorView !== "card") {
      url = appendProgramWeekQueryParams(url, { view: editorView });
    }
    if (embeddedInChat) {
      url = appendProgramWeekQueryParams(url, { embedded: "chat" });
    }
    return url;
  }

  function programUrl(targetBlockId: string, targetWeekId: string) {
    const base = athleteId
      ? `/programs/${targetBlockId}/weeks/${targetWeekId}?athlete=${athleteId}`
      : `/programs/${targetBlockId}/weeks/${targetWeekId}`;
    return withProgramNavigationParams(base);
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


  async function goToBlock(targetBlockId: string) {
    if (targetBlockId === blockId) return;

    const { data: entry } = await resolveProgramEntryFromBlockId(
      targetBlockId,
      athleteId,
    );

    if (entry) {
      goToUrl(
        withProgramNavigationParams(
          buildProgramWeekPath(entry, {
            coachViewingAthlete: Boolean(athleteId),
          }),
        ),
      );
      return;
    }

    const blockWeeks = weeksByBlock[targetBlockId] || [];

    if (blockWeeks.length === 0) {
      goToUrl(programUrl(targetBlockId, weekId));
      return;
    }

    goToProgram(targetBlockId, blockWeeks[0].id);
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
      alert(getUnknownErrorMessage(error, "Macrocycle kon niet worden aangemaakt"));
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

    const previousBlock = navBlocks.find((block) => block.id === blockIdToRename);
    const startDateChanged =
      startDate !== undefined &&
      (startDate || null) !== (previousBlock?.start_date || null);

    if (startDateChanged && data.start_date) {
      const blockWeeks = weeksByBlock[blockIdToRename] || [];
      try {
        await syncBlockDayScheduledDates(data, blockWeeks);
      } catch (syncError) {
        alert(
          syncError instanceof Error
            ? syncError.message
            : "Dagdatums konden niet worden bijgewerkt.",
        );
      }
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
    if (startDateChanged) {
      await onReload();
    }
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
    if (pendingBlockAction) return;

    const ownerAthleteId =
      athleteId ||
      blockToDuplicate.athlete_id ||
      (role === "atleet" ? userId : "");

    if (!ownerAthleteId) {
      alert("Geen atleet gevonden voor dit block");
      return;
    }

    if (role === "atleet") {
      alert("Vraag je coach om je programma in te zetten.");
      return;
    }

    const sourceWeeks = weeksByBlock[blockToDuplicate.id] || [];
    const duplicatedStart = getDuplicatedBlockStartDateObject(
      blockToDuplicate,
      sourceWeeks,
    );
    const startDate = duplicatedStart
      ? toDateInputValue(duplicatedStart)
      : toDateInputValue(new Date());

    setPendingBlockAction({ blockId: blockToDuplicate.id, type: "duplicate" });
    showAppToast("Block wordt gekopieerd…");

    try {
      const { blockId: createdBlockId, firstWeekId, error } = await duplicateProgramBlock({
        sourceBlockId: blockToDuplicate.id,
        athleteId: ownerAthleteId,
        title: getNextBlockDuplicateTitle(blockToDuplicate),
        description: blockToDuplicate.description || "",
        startDate,
        macrocycleId: blockToDuplicate.macrocycle_id ?? null,
        sourceWeeks: sourceWeeks.map((week) => ({
          id: week.id,
          week_number: week.week_number,
          title: week.title,
        })),
      });

      if (error || !createdBlockId || !firstWeekId) {
        alert(error || "Block kon niet worden gekopieerd");
        return;
      }

      goToProgram(createdBlockId, firstWeekId);
    } finally {
      setPendingBlockAction(null);
    }
  }


  async function deleteBlock(blockToDelete: ProgramBlock) {
    if (pendingBlockAction) return;

    setPendingBlockAction({ blockId: blockToDelete.id, type: "delete" });
    showAppToast("Block wordt verwijderd…");

    const previousBlocks = navBlocks;
    const previousWeeksByBlock = weeksByBlock;

    setNavBlocks((current) => current.filter((block) => block.id !== blockToDelete.id));
    setWeeksByBlock((current) => {
      const next = { ...current };
      delete next[blockToDelete.id];
      return next;
    });

    try {
      const { error } = await deleteProgramBlock(blockToDelete.id);

      if (error) {
        setNavBlocks(previousBlocks);
        setWeeksByBlock(previousWeeksByBlock);
        alert(error);
        return;
      }

      if (blockToDelete.id === blockId) {
        const remainingBlocks = previousBlocks.filter(
          (block) => block.id !== blockToDelete.id,
        );
        const fallbackBlock = remainingBlocks[0];

        if (fallbackBlock) {
          const fallbackWeek = (previousWeeksByBlock[fallbackBlock.id] || [])[0];

          if (fallbackWeek) {
            goToProgram(fallbackBlock.id, fallbackWeek.id);
            return;
          }

          goToProgram(fallbackBlock.id, weekId);
          return;
        }

        goToUrl(athleteId ? `/athletes/${athleteId}` : "/athletes");
      }
    } finally {
      setPendingBlockAction(null);
    }
  }


  async function copyWeekWithContent(
    sourceWeek: ProgramWeek,
    targetBlockId: string,
    targetWeekNumber: number,
    targetTitle: string,
  ) {
    const { weekId: createdWeekId, error } = await duplicateProgramWeekId({
      sourceWeekId: sourceWeek.id,
      targetBlockId,
      targetWeekNumber,
      targetTitle,
    });

    if (error || !createdWeekId) {
      alert(error || "Week kon niet worden gekopieerd");
      return null;
    }

    return { id: createdWeekId } as ProgramWeek;
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

    const { week: data, error } = await createProgramWeekForBlock({
      blockId: targetBlockId,
      title: newWeekTitle.trim(),
      weekNumber: nextWeekNumber,
    });

    if (error || !data) {
      alert(getUnknownErrorMessage(error, "Week kon niet worden aangemaakt"));
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

    await onReload();
  }


  return {
    navBlocks,
    navMacrocycles,
    weeksByBlock,
    openBlockIds,
    setOpenBlockIds,
    openMacrocycleIds,
    creatingMacrocycle,
    setCreatingMacrocycle,
    newMacrocycleTitle,
    setNewMacrocycleTitle,
    newBlockMacrocycleId,
    setNewBlockMacrocycleId,
    editingBlockMacrocycleId,
    setEditingBlockMacrocycleId,
    creatingBlock,
    setCreatingBlock,
    newBlockTitle,
    setNewBlockTitle,
    newBlockDescription,
    setNewBlockDescription,
    newBlockStartDate,
    setNewBlockStartDate,
    editingBlockId,
    setEditingBlockId,
    editingBlockTitle,
    setEditingBlockTitle,
    editingBlockStartDate,
    setEditingBlockStartDate,
    creatingWeekBlockId,
    setCreatingWeekBlockId,
    newWeekTitle,
    setNewWeekTitle,
    programAddMenuOpen,
    setProgramAddMenuOpen,
    editingWeekId,
    setEditingWeekId,
    editingWeekTitle,
    setEditingWeekTitle,
    blockNavOpen,
    setBlockNavOpen,
    weekNavOpen,
    setWeekNavOpen,
    blockNavRef,
    weekNavRef,
    loadProgramNavigation,
    programUrl,
    goToUrl,
    goToProgram,
    goToBlock,
    createBlock,
    startProgramAdd,
    createMacrocycle,
    renameBlock,
    pendingBlockAction,
    duplicateBlock,
    deleteBlock,
    duplicateWeek,
    createWeek,
    renameWeek,
    deleteWeek,
    draggedWeekId,
    weekDropIndicator,
    movingWeek,
    handleWeekDragStart,
    handleWeekDragEnd,
    handleWeekDragOver,
    handleWeekListDragOver,
  };
}
