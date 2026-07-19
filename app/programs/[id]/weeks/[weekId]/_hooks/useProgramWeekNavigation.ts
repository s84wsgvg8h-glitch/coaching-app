"use client";

import { useRef, useState, type Dispatch, type SetStateAction, type TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { toDateInputValue } from "@/components/programs/ProgramBlockDateField";
import { persistBlockEditModalNote } from "@/components/programs/ProgramBlockEditModal";
import { persistWeekEditModalNote } from "@/components/programs/ProgramWeekEditModal";
import { createProgramBlockForAthlete } from "@/lib/programBlockCreate";
import { createProgramWeekForBlock } from "@/lib/programWeekCreate";
import { duplicateProgramWeek } from "@/lib/programWeekDuplicate";
import {
  createProgramMacrocycle,
  loadProgramMacrocycles,
  type ProgramMacrocycle,
} from "@/lib/programMacrocycles";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import { supabase } from "@/lib/supabaseClient";
import { getUnknownErrorMessage } from "../_utils/programWeekProviderUtils";

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

  const [blockNavOpen, setBlockNavOpen] = useState(false);
  const [weekNavOpen, setWeekNavOpen] = useState(false);
  const blockNavRef = useRef<HTMLDivElement | null>(null);
  const weekNavRef = useRef<HTMLDivElement | null>(null);

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
      const { week: createdWeek, error: weekError } = await createProgramWeekForBlock({
        blockId: createdBlock.id,
        title: "Week 1",
        weekNumber: 1,
      });

      if (weekError || !createdWeek) {
        alert(weekError || "Week kon niet worden aangemaakt");
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

    await onReload();
  }


  async function copyWeekWithContent(
    sourceWeek: ProgramWeek,
    targetBlockId: string,
    targetWeekNumber: number,
    targetTitle: string,
  ) {
    const { week: createdWeek, error } = await duplicateProgramWeek({
      sourceWeekId: sourceWeek.id,
      targetBlockId,
      targetWeekNumber,
      targetTitle,
    });

    if (error || !createdWeek) {
      alert(error || "Week kon niet worden gekopieerd");
      return null;
    }

    return createdWeek;
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
    duplicateBlock,
    deleteBlock,
    duplicateWeek,
    createWeek,
    renameWeek,
    deleteWeek,
  };
}
