import type { Dispatch, SetStateAction } from "react";
import ProgramWeekBlockWeekNav from "../_components/ProgramWeekBlockWeekNav";
import ProgramWeekBlocksSidebar from "../_components/ProgramWeekBlocksSidebar";
import type { EditorView } from "@/components/programs/coach/CoachProgramWeekHeader";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type { ProgramSidebarCompetitionEntry } from "@/lib/programWeek/competitionSidebar";
import type { WeekDropIndicator } from "@/lib/programWeekMove";

export type ProgramWeekAddMenuProps = {
  programAddMenuOpen: boolean;
  setProgramAddMenuOpen: Dispatch<SetStateAction<boolean>>;
  onAddMacrocycle: () => void;
  onAddTemplate: () => void;
  onAddBlock: () => void;
  onAddWeek: () => void;
};

export type ProgramWeekNavElementsInput = {
  role: string;
  userId: string;
  blockId: string;
  weekId: string;
  navBlocks: ProgramBlock[];
  navMacrocycles: ProgramMacrocycle[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  openBlockIds: Record<string, boolean>;
  setOpenBlockIds: Dispatch<SetStateAction<Record<string, boolean>>>;
  currentBlock: ProgramBlock | null;
  week: ProgramWeek | null;
  blockNavRef: React.RefObject<HTMLDivElement | null>;
  weekNavRef: React.RefObject<HTMLDivElement | null>;
  blockNavOpen: boolean;
  weekNavOpen: boolean;
  setBlockNavOpen: Dispatch<SetStateAction<boolean>>;
  setWeekNavOpen: Dispatch<SetStateAction<boolean>>;
  goToBlock: (blockId: string) => void;
  goToProgram: (blockId: string, weekId: string) => void;
  creatingMacrocycle: boolean;
  creatingBlock: boolean;
  creatingWeekBlockId: string;
  editingBlockId: string;
  editingWeekId: string;
  newMacrocycleTitle: string;
  newBlockTitle: string;
  newBlockStartDate: string;
  newBlockDescription: string;
  newBlockMacrocycleId: string;
  newWeekTitle: string;
  setNewMacrocycleTitle: Dispatch<SetStateAction<string>>;
  setNewBlockTitle: Dispatch<SetStateAction<string>>;
  setNewBlockStartDate: Dispatch<SetStateAction<string>>;
  setNewBlockDescription: Dispatch<SetStateAction<string>>;
  setNewBlockMacrocycleId: Dispatch<SetStateAction<string>>;
  setNewWeekTitle: Dispatch<SetStateAction<string>>;
  setCreatingMacrocycle: Dispatch<SetStateAction<boolean>>;
  setCreatingBlock: Dispatch<SetStateAction<boolean>>;
  setCreatingWeekBlockId: Dispatch<SetStateAction<string>>;
  setEditingBlockId: Dispatch<SetStateAction<string>>;
  setEditingBlockTitle: Dispatch<SetStateAction<string>>;
  setEditingBlockStartDate: Dispatch<SetStateAction<string>>;
  setEditingBlockMacrocycleId: Dispatch<SetStateAction<string>>;
  setEditingWeekId: Dispatch<SetStateAction<string>>;
  setEditingWeekTitle: Dispatch<SetStateAction<string>>;
  createMacrocycle: () => Promise<void>;
  createBlock: () => Promise<void>;
  createWeek: (targetBlockId: string) => Promise<void>;
  duplicateBlock: (block: ProgramBlock) => Promise<void>;
  deleteBlock: (block: ProgramBlock) => Promise<void>;
  pendingBlockAction: { blockId: string; type: "duplicate" | "delete" } | null;
  duplicateWeek: (weekItem: ProgramWeek) => Promise<void>;
  deleteWeek: (weekItem: ProgramWeek) => Promise<void>;
  programAddMenuOpen: boolean;
  setProgramAddMenuOpen: Dispatch<SetStateAction<boolean>>;
  startProgramAdd: (type: "macrocycle" | "block" | "week") => void;
  onOpenTemplateApply: () => void;
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
  showEditorViewToggle?: boolean;
  draggedWeekId?: string;
  weekDropIndicator?: WeekDropIndicator | null;
  movingWeek?: boolean;
  onWeekDragStart?: (
    event: React.DragEvent<HTMLDivElement>,
    week: ProgramWeek,
  ) => void;
  onWeekDragEnd?: () => void;
  onWeekDragOver?: (
    event: React.DragEvent<HTMLElement>,
    blockId: string,
    targetWeekId: string | null,
    position: WeekDropIndicator["position"],
  ) => void;
  onWeekListDragOver?: (
    event: React.DragEvent<HTMLElement>,
    blockId: string,
  ) => void;
  athleteId?: string;
  sidebarCompetitions?: ProgramSidebarCompetitionEntry[];
  showCompareView?: boolean;
  compareCurrentDays?: ProgramDay[];
  compareCurrentExercisesByDay?: Record<string, ProgramExercise[]>;
};

export function buildProgramWeekAddMenuProps(
  input: Pick<
    ProgramWeekNavElementsInput,
    | "programAddMenuOpen"
    | "setProgramAddMenuOpen"
    | "startProgramAdd"
    | "onOpenTemplateApply"
  >,
): ProgramWeekAddMenuProps {
  return {
    programAddMenuOpen: input.programAddMenuOpen,
    setProgramAddMenuOpen: input.setProgramAddMenuOpen,
    onAddMacrocycle: () => input.startProgramAdd("macrocycle"),
    onAddTemplate: () => {
      input.setProgramAddMenuOpen(false);
      input.onOpenTemplateApply();
    },
    onAddBlock: () => input.startProgramAdd("block"),
    onAddWeek: () => input.startProgramAdd("week"),
  };
}

export function createProgramWeekNavElements(input: ProgramWeekNavElementsInput) {
  const programWeekAddMenuProps = buildProgramWeekAddMenuProps(input);

  const blockWeekNav = (
    <ProgramWeekBlockWeekNav
      role={input.role}
      userId={input.userId}
      blockId={input.blockId}
      weekId={input.weekId}
      navBlocks={input.navBlocks}
      navMacrocycles={input.navMacrocycles}
      weeksByBlock={input.weeksByBlock}
      currentBlock={input.currentBlock}
      week={input.week}
      blockNavRef={input.blockNavRef}
      weekNavRef={input.weekNavRef}
      blockNavOpen={input.blockNavOpen}
      weekNavOpen={input.weekNavOpen}
      setBlockNavOpen={input.setBlockNavOpen}
      setWeekNavOpen={input.setWeekNavOpen}
      goToBlock={input.goToBlock}
      goToProgram={input.goToProgram}
      creatingMacrocycle={input.creatingMacrocycle}
      creatingBlock={input.creatingBlock}
      creatingWeekBlockId={input.creatingWeekBlockId}
      newMacrocycleTitle={input.newMacrocycleTitle}
      newBlockTitle={input.newBlockTitle}
      newBlockStartDate={input.newBlockStartDate}
      newBlockDescription={input.newBlockDescription}
      newBlockMacrocycleId={input.newBlockMacrocycleId}
      newWeekTitle={input.newWeekTitle}
      setNewMacrocycleTitle={input.setNewMacrocycleTitle}
      setNewBlockTitle={input.setNewBlockTitle}
      setNewBlockStartDate={input.setNewBlockStartDate}
      setNewBlockDescription={input.setNewBlockDescription}
      setNewBlockMacrocycleId={input.setNewBlockMacrocycleId}
      setNewWeekTitle={input.setNewWeekTitle}
      setCreatingMacrocycle={input.setCreatingMacrocycle}
      setCreatingBlock={input.setCreatingBlock}
      setCreatingWeekBlockId={input.setCreatingWeekBlockId}
      createMacrocycle={input.createMacrocycle}
      createBlock={input.createBlock}
      createWeek={input.createWeek}
      duplicateBlock={input.duplicateBlock}
      deleteBlock={input.deleteBlock}
      pendingBlockAction={input.pendingBlockAction}
      duplicateWeek={input.duplicateWeek}
      deleteWeek={input.deleteWeek}
      setEditingBlockId={input.setEditingBlockId}
      setEditingBlockTitle={input.setEditingBlockTitle}
      setEditingBlockStartDate={input.setEditingBlockStartDate}
      setEditingBlockMacrocycleId={input.setEditingBlockMacrocycleId}
      setEditingWeekId={input.setEditingWeekId}
      setEditingWeekTitle={input.setEditingWeekTitle}
      editorView={input.editorView}
      onEditorViewChange={input.onEditorViewChange}
      showEditorViewToggle={input.showEditorViewToggle}
      showCompareView={input.showCompareView}
      compareCurrentDays={input.compareCurrentDays}
      compareCurrentExercisesByDay={input.compareCurrentExercisesByDay}
      {...programWeekAddMenuProps}
    />
  );

  const blocksSidebar = (
    <ProgramWeekBlocksSidebar
      role={input.role}
      userId={input.userId}
      blockId={input.blockId}
      weekId={input.weekId}
      navBlocks={input.navBlocks}
      navMacrocycles={input.navMacrocycles}
      weeksByBlock={input.weeksByBlock}
      openBlockIds={input.openBlockIds}
      setOpenBlockIds={input.setOpenBlockIds}
      creatingMacrocycle={input.creatingMacrocycle}
      creatingBlock={input.creatingBlock}
      creatingWeekBlockId={input.creatingWeekBlockId}
      editingBlockId={input.editingBlockId}
      editingWeekId={input.editingWeekId}
      newMacrocycleTitle={input.newMacrocycleTitle}
      newBlockTitle={input.newBlockTitle}
      newBlockStartDate={input.newBlockStartDate}
      newBlockDescription={input.newBlockDescription}
      newBlockMacrocycleId={input.newBlockMacrocycleId}
      newWeekTitle={input.newWeekTitle}
      setNewMacrocycleTitle={input.setNewMacrocycleTitle}
      setNewBlockTitle={input.setNewBlockTitle}
      setNewBlockStartDate={input.setNewBlockStartDate}
      setNewBlockDescription={input.setNewBlockDescription}
      setNewBlockMacrocycleId={input.setNewBlockMacrocycleId}
      setNewWeekTitle={input.setNewWeekTitle}
      setCreatingMacrocycle={input.setCreatingMacrocycle}
      setCreatingBlock={input.setCreatingBlock}
      setCreatingWeekBlockId={input.setCreatingWeekBlockId}
      setEditingBlockId={input.setEditingBlockId}
      setEditingBlockTitle={input.setEditingBlockTitle}
      setEditingBlockStartDate={input.setEditingBlockStartDate}
      setEditingBlockMacrocycleId={input.setEditingBlockMacrocycleId}
      setEditingWeekId={input.setEditingWeekId}
      setEditingWeekTitle={input.setEditingWeekTitle}
      goToProgram={input.goToProgram}
      createMacrocycle={input.createMacrocycle}
      createBlock={input.createBlock}
      createWeek={input.createWeek}
      duplicateBlock={input.duplicateBlock}
      deleteBlock={input.deleteBlock}
      pendingBlockAction={input.pendingBlockAction}
      duplicateWeek={input.duplicateWeek}
      deleteWeek={input.deleteWeek}
      draggedWeekId={input.draggedWeekId}
      weekDropIndicator={input.weekDropIndicator}
      movingWeek={input.movingWeek}
      onWeekDragStart={input.onWeekDragStart}
      onWeekDragEnd={input.onWeekDragEnd}
      onWeekDragOver={input.onWeekDragOver}
      onWeekListDragOver={input.onWeekListDragOver}
      {...programWeekAddMenuProps}
    />
  );

  return { blockWeekNav, blocksSidebar };
}
