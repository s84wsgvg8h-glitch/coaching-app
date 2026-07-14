import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { BlockIntakeWizard } from "@/lib/blockIntakeWizard";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type { ProgramSearchContext } from "@/lib/programSearch";
import type { BlockProgressionSnapshot } from "@/lib/programWeek/progressionView";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import type { useProgramVideoRecorder } from "@/hooks/useProgramVideoRecorder";
import type { useProgramWeekAthleteLogging } from "../_hooks/useProgramWeekAthleteLogging";
import type { useProgramWeekCoachMutations } from "../_hooks/useProgramWeekCoachMutations";
import type { ProgramWeekPageViewProps } from "../_components/programWeekPageViewProps";

type VideoRecorderApi = ReturnType<typeof useProgramVideoRecorder>;
type AthleteLoggingApi = ReturnType<typeof useProgramWeekAthleteLogging>;
type CoachMutationsApi = ReturnType<typeof useProgramWeekCoachMutations>;

export type BuildProgramWeekPageViewPropsInput = {
  embeddedInChat: boolean;
  isAthleteView: boolean;
  isCoachView: boolean;
  athleteSidebarBlocks: ProgramWeekPageViewProps["athleteSidebarBlocks"];
  setOpenBlockIds: Dispatch<SetStateAction<Record<string, boolean>>>;
  goToProgram: (blockId: string, weekId: string) => void;
  blocksSidebar: ReactNode;
  role: string;
  planningSplitOpen: boolean;
  isPending: boolean;
  navigatingUrl: string;
  programReady: boolean;
  authLoading: boolean;
  currentBlock: ProgramBlock | null;
  week: ProgramWeek | null;
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
  userId: string;
  athleteCoachId: string;
  athleteId: string | null;
  programSearchContext: ProgramSearchContext;
  blockWeekNav: ReactNode;
  editorView: ProgramWeekPageViewProps["editorView"];
  setEditorView: ProgramWeekPageViewProps["setEditorView"];
  setPlanningSplitOpen: Dispatch<SetStateAction<boolean>>;
  getExerciseLibraryItem: (exercise: ProgramExercise) => ExerciseLibraryItem | null;
  saveExerciseLibraryLink: (exerciseId: string, libraryId: string | null) => Promise<void>;
  setLinkingExercise: Dispatch<SetStateAction<ProgramExercise | null>>;
  setPreviewLibraryItem: Dispatch<SetStateAction<ExerciseLibraryItem | null>>;
  weeksByBlock: Record<string, ProgramWeek[]>;
  blockId: string;
  weekId: string;
  openVideoRecorder: VideoRecorderApi["openVideoRecorder"];
  videoRecorder: VideoRecorderApi;
  offlineQueueCount: number;
  templateApplyOpen: boolean;
  setTemplateApplyOpen: Dispatch<SetStateAction<boolean>>;
  planningAthleteId: string;
  editingBlockId: string;
  editingBlockTitle: string;
  editingBlockStartDate: string;
  editingBlockMacrocycleId: string;
  setEditingBlockId: Dispatch<SetStateAction<string>>;
  setEditingBlockTitle: Dispatch<SetStateAction<string>>;
  setEditingBlockStartDate: Dispatch<SetStateAction<string>>;
  setEditingBlockMacrocycleId: Dispatch<SetStateAction<string>>;
  navMacrocycles: ProgramMacrocycle[];
  renameBlock: (
    blockIdToRename: string,
    overrides?: {
      title?: string;
      startDate?: string;
      macrocycleId?: string;
      note?: string;
    },
  ) => Promise<void>;
  editingWeekId: string;
  editingWeekTitle: string;
  setEditingWeekId: Dispatch<SetStateAction<string>>;
  setEditingWeekTitle: Dispatch<SetStateAction<string>>;
  renameWeek: (
    weekToRename: ProgramWeek,
    titleOverride?: string,
    note?: string,
  ) => Promise<void>;
  linkingExercise: ProgramExercise | null;
  libraryItems: ExerciseLibraryItem[];
  previewLibraryItem: ExerciseLibraryItem | null;
  blockIntakeWizard: BlockIntakeWizard | null;
  setBlockIntakeWizard: Dispatch<SetStateAction<BlockIntakeWizard | null>>;
  planningPanelHeight: number;
  setPlanningPanelHeight: Dispatch<SetStateAction<number>>;
  athleteDisplayName: string;
  weekStatsReport: ProgramWeekPageViewProps["weekStatsReport"];
  progressionSnapshot: BlockProgressionSnapshot | null;
  progressionLoading: boolean;
  onProgressionSaveCell: (
    exerciseId: string,
    updates: { load: string; reps: string; rpe: string },
  ) => void | Promise<void>;
  athleteLogging: AthleteLoggingApi;
  coachMutations: CoachMutationsApi;
};

export function buildProgramWeekPageViewProps(
  input: BuildProgramWeekPageViewPropsInput,
): ProgramWeekPageViewProps {
  const { athleteLogging, coachMutations } = input;

  return {
    embeddedInChat: input.embeddedInChat,
    isAthleteView: input.isAthleteView,
    isCoachView: input.isCoachView,
    athleteSidebarBlocks: input.athleteSidebarBlocks,
    setOpenBlockIds: input.setOpenBlockIds,
    goToProgram: input.goToProgram,
    blocksSidebar: input.blocksSidebar,
    role: input.role,
    planningSplitOpen: input.planningSplitOpen,
    isPending: input.isPending,
    navigatingUrl: input.navigatingUrl,
    programReady: input.programReady,
    authLoading: input.authLoading,
    currentBlock: input.currentBlock,
    week: input.week,
    days: input.days,
    exercisesByDay: input.exercisesByDay,
    userId: input.userId,
    athleteCoachId: input.athleteCoachId,
    openAthleteDayNotesId: athleteLogging.openAthleteDayNotesId,
    selectedAthleteExerciseId: athleteLogging.selectedAthleteExerciseId,
    athleteExercisePanelOpen: athleteLogging.athleteExercisePanelOpen,
    getAthleteDayCheckin: athleteLogging.getAthleteDayCheckin,
    getDayDate: coachMutations.getDayDate,
    getDayDateObject: coachMutations.getDayDateObject,
    updateAthleteDayCheckinLocal: athleteLogging.updateAthleteDayCheckinLocal,
    saveAthleteDayCheckin: athleteLogging.saveAthleteDayCheckin,
    setOpenAthleteDayNotesId: athleteLogging.setOpenAthleteDayNotesId,
    getSetRowsForExercise: athleteLogging.getSetRowsForExercise,
    getExerciseLibraryItem: input.getExerciseLibraryItem,
    getAthleteSetAverage: coachMutations.getAthleteSetAverage,
    getDisplayIntensity: coachMutations.getDisplayIntensity,
    getExercisePriority: coachMutations.getExercisePriority,
    getExercisePriorityLabel: coachMutations.getExercisePriorityLabel,
    openAthleteExercisePanel: athleteLogging.openAthleteExercisePanel,
    setPreviewLibraryItem: input.setPreviewLibraryItem,
    blockWeekNav: input.blockWeekNav,
    editorView: input.editorView,
    setEditorView: input.setEditorView,
    setPlanningSplitOpen: input.setPlanningSplitOpen,
    athleteId: input.athleteId,
    programSearchContext: input.programSearchContext,
    creatingExerciseDayId: coachMutations.creatingExerciseDayId,
    openDayNoteId: coachMutations.openDayNoteId,
    openDayWarmupId: coachMutations.openDayWarmupId,
    openExerciseNoteId: coachMutations.openExerciseNoteId,
    draggedDayId: coachMutations.draggedDayId,
    dayDropIndicator: coachMutations.dayDropIndicator,
    draggedExercise: coachMutations.draggedExercise,
    exerciseDropIndicator: coachMutations.exerciseDropIndicator,
    isCreatingDay: coachMutations.isCreatingDay,
    newDayTitle: coachMutations.newDayTitle,
    newDayInputRef: coachMutations.newDayInputRef,
    exerciseNameInputRef: coachMutations.exerciseNameInputRef,
    uitlegMode: coachMutations.uitlegMode,
    exerciseName: coachMutations.exerciseName,
    exerciseSets: coachMutations.exerciseSets,
    exerciseReps: coachMutations.exerciseReps,
    exerciseIntensity: coachMutations.exerciseIntensity,
    exerciseLoadKg: coachMutations.exerciseLoadKg,
    setOpenDayWarmupId: coachMutations.setOpenDayWarmupId,
    setOpenDayNoteId: coachMutations.setOpenDayNoteId,
    setUitlegMode: coachMutations.setUitlegMode,
    setCreatingExerciseDayId: coachMutations.setCreatingExerciseDayId,
    setExerciseName: coachMutations.setExerciseName,
    setExerciseSets: coachMutations.setExerciseSets,
    setExerciseReps: coachMutations.setExerciseReps,
    setExerciseIntensity: coachMutations.setExerciseIntensity,
    setExerciseLoadKg: coachMutations.setExerciseLoadKg,
    setIsCreatingDay: coachMutations.setIsCreatingDay,
    setNewDayTitle: coachMutations.setNewDayTitle,
    setOpenExerciseNoteId: coachMutations.setOpenExerciseNoteId,
    getDayDateInputValue: coachMutations.getDayDateInputValue,
    hasExercises: coachMutations.hasExercises,
    duplicateDay: coachMutations.duplicateDay,
    deleteDay: coachMutations.deleteDay,
    updateDayLocal: coachMutations.updateDayLocal,
    saveDayMeta: coachMutations.saveDayMeta,
    saveDayField: coachMutations.saveDayField,
    deleteDayField: coachMutations.deleteDayField,
    handleDragStart: coachMutations.handleDragStart,
    handleDragOver: coachMutations.handleDragOver,
    saveDayOrder: coachMutations.saveDayOrder,
    saveExerciseLibraryLink: input.saveExerciseLibraryLink,
    handleExerciseDragStart: coachMutations.handleExerciseDragStart,
    handleExerciseDragOver: coachMutations.handleExerciseDragOver,
    handleExerciseDragOverDay: coachMutations.handleExerciseDragOverDay,
    saveExerciseOrder: coachMutations.saveExerciseOrder,
    updateExerciseLocal: coachMutations.updateExerciseLocal,
    saveExerciseField: coachMutations.saveExerciseField,
    deleteExercise: coachMutations.deleteExercise,
    handleCoachExerciseEnter: coachMutations.handleCoachExerciseEnter,
    handleNewExerciseFormKeyDown: coachMutations.handleNewExerciseFormKeyDown,
    addExercise: coachMutations.addExercise,
    updateIntensityType: coachMutations.updateIntensityType,
    deleteExerciseNote: coachMutations.deleteExerciseNote,
    saveExercisePriority: coachMutations.saveExercisePriority,
    saveExerciseFields: coachMutations.saveExerciseFields,
    getAthleteExerciseNote: athleteLogging.getAthleteExerciseNote,
    createDay: coachMutations.createDay,
    setLinkingExercise: input.setLinkingExercise,
    getShortSbdWeekSummary: coachMutations.getShortSbdWeekSummary,
    weekStatsReport: input.weekStatsReport,
    weeksByBlock: input.weeksByBlock,
    blockId: input.blockId,
    weekId: input.weekId,
    insertExerciseFromRaw: coachMutations.insertExerciseFromRaw,
    applyRawClipboardPaste: coachMutations.applyRawClipboardPaste,
    duplicateExerciseRow: coachMutations.duplicateExerciseRow,
    getSelectedAthleteExercise: athleteLogging.getSelectedAthleteExercise,
    loadingAthleteSets: athleteLogging.loadingAthleteSets,
    athleteNotePanelOpen: athleteLogging.athleteNotePanelOpen,
    previousWeekOpen: athleteLogging.previousWeekOpen,
    loadingPreviousWeekSets: athleteLogging.loadingPreviousWeekSets,
    previousWeekMessage: athleteLogging.previousWeekMessage,
    previousWeekData: athleteLogging.previousWeekData,
    uploadingVideoSetKey: athleteLogging.uploadingVideoSetKey,
    setAthleteExercisePanelOpen: athleteLogging.setAthleteExercisePanelOpen,
    setSelectedAthleteExerciseId: athleteLogging.setSelectedAthleteExerciseId,
    setAthleteNotePanelOpen: athleteLogging.setAthleteNotePanelOpen,
    resetPreviousWeekData: athleteLogging.resetPreviousWeekData,
    updateAthleteExerciseNoteLocal: athleteLogging.updateAthleteExerciseNoteLocal,
    saveAthleteExerciseNote: athleteLogging.saveAthleteExerciseNote,
    loadPreviousWeekExerciseSets: athleteLogging.loadPreviousWeekExerciseSets,
    openVideoRecorder: input.openVideoRecorder,
    updateAthleteSetLocal: athleteLogging.updateAthleteSetLocal,
    saveAthleteSetField: athleteLogging.saveAthleteSetField,
    handleAthleteSetArrowNavigation: athleteLogging.handleAthleteSetArrowNavigation,
    copyAthleteSetToNextRow: athleteLogging.copyAthleteSetToNextRow,
    deleteAthleteSetVideo: athleteLogging.deleteAthleteSetVideo,
    getAthleteSetVideo: athleteLogging.getAthleteSetVideo,
    getAthleteSetVideoKey: athleteLogging.getAthleteSetVideoKey,
    getInlineE1rmLabel: coachMutations.getInlineE1rmLabel,
    getAverageFromRows: athleteLogging.getAverageFromRows,
    videoRecorder: input.videoRecorder,
    offlineQueueCount: input.offlineQueueCount,
    templateApplyOpen: input.templateApplyOpen,
    setTemplateApplyOpen: input.setTemplateApplyOpen,
    planningAthleteId: input.planningAthleteId,
    editingBlockId: input.editingBlockId,
    editingBlockTitle: input.editingBlockTitle,
    editingBlockStartDate: input.editingBlockStartDate,
    editingBlockMacrocycleId: input.editingBlockMacrocycleId,
    setEditingBlockId: input.setEditingBlockId,
    setEditingBlockTitle: input.setEditingBlockTitle,
    setEditingBlockStartDate: input.setEditingBlockStartDate,
    setEditingBlockMacrocycleId: input.setEditingBlockMacrocycleId,
    navMacrocycles: input.navMacrocycles,
    renameBlock: input.renameBlock,
    editingWeekId: input.editingWeekId,
    editingWeekTitle: input.editingWeekTitle,
    setEditingWeekId: input.setEditingWeekId,
    setEditingWeekTitle: input.setEditingWeekTitle,
    renameWeek: input.renameWeek,
    linkingExercise: input.linkingExercise,
    libraryItems: input.libraryItems,
    previewLibraryItem: input.previewLibraryItem,
    blockIntakeWizard: input.blockIntakeWizard,
    setBlockIntakeWizard: input.setBlockIntakeWizard,
    planningPanelHeight: input.planningPanelHeight,
    setPlanningPanelHeight: input.setPlanningPanelHeight,
    athleteDisplayName: input.athleteDisplayName,
    progressionSnapshot: input.progressionSnapshot,
    progressionLoading: input.progressionLoading,
    onProgressionSaveCell: input.onProgressionSaveCell,
  };
}
