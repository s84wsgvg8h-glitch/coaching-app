import type { Dispatch, ReactNode, RefObject, SetStateAction } from "react";
import type { BlockIntakeWizard } from "@/lib/blockIntakeWizard";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type { ProgramSearchContext } from "@/lib/programSearch";
import type { BlockProgressionSnapshot } from "@/lib/programWeek/progressionView";
import type {
  AthleteDayCheckin,
  AthleteExerciseNote,
  AthleteExerciseSet,
  AthleteExerciseVideo,
  PreviousWeekSetData,
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import type { useProgramVideoRecorder } from "@/hooks/useProgramVideoRecorder";

type VideoRecorderApi = ReturnType<typeof useProgramVideoRecorder>;

/** Handlers mirror ProgramWeekPageProvider; kept loose to avoid duplicating signatures. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ViewHandler = (...args: any[]) => any;

export type ProgramWeekPageViewProps = {
  embeddedInChat: boolean;
  isAthleteView: boolean;
  isCoachView: boolean;
  athleteSidebarBlocks: Array<{
    id: string;
    title: string;
    dateRange: string;
    isActive: boolean;
    isOpen: boolean;
    weeks: Array<{
      id: string;
      title: string;
      dateRange: string;
      isActive: boolean;
    }>;
  }>;
  setOpenBlockIds: Dispatch<SetStateAction<Record<string, boolean>>>;
  goToProgram: ViewHandler;
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
  openAthleteDayNotesId: string;
  selectedAthleteExerciseId: string;
  athleteExercisePanelOpen: boolean;
  getAthleteDayCheckin: ViewHandler;
  getDayDate: ViewHandler;
  getDayDateObject: ViewHandler;
  updateAthleteDayCheckinLocal: ViewHandler;
  saveAthleteDayCheckin: ViewHandler;
  setOpenAthleteDayNotesId: Dispatch<SetStateAction<string>>;
  getSetRowsForExercise: ViewHandler;
  getExerciseLibraryItem: ViewHandler;
  getAthleteSetAverage: ViewHandler;
  getDisplayIntensity: ViewHandler;
  getExercisePriority: ViewHandler;
  getExercisePriorityLabel: ViewHandler;
  openAthleteExercisePanel: ViewHandler;
  setPreviewLibraryItem: Dispatch<SetStateAction<ExerciseLibraryItem | null>>;
  blockWeekNav: ReactNode;
  editorView: "card" | "raw" | "athlete" | "progression";
  setEditorView: Dispatch<
    SetStateAction<"card" | "raw" | "athlete" | "progression">
  >;
  setPlanningSplitOpen: Dispatch<SetStateAction<boolean>>;
  athleteId: string | null;
  programSearchContext: ProgramSearchContext;
  creatingExerciseDayId: string;
  openDayNoteId: string;
  openDayWarmupId: string;
  openExerciseNoteId: string;
  draggedDayId: string;
  dayDropIndicator: {
    targetId: string;
    position: "before" | "after";
  } | null;
  draggedExercise: { dayId: string; exerciseId: string } | null;
  exerciseDropIndicator: {
    dayId: string;
    targetId: string;
    position: "before" | "after";
  } | null;
  isCreatingDay: boolean;
  newDayTitle: string;
  newDayInputRef: RefObject<HTMLInputElement | null>;
  exerciseNameInputRef: RefObject<HTMLInputElement | null>;
  uitlegMode: boolean;
  exerciseName: string;
  exerciseSets: string;
  exerciseReps: string;
  exerciseIntensity: string;
  exerciseLoadKg: string;
  setOpenDayWarmupId: Dispatch<SetStateAction<string>>;
  setOpenDayNoteId: Dispatch<SetStateAction<string>>;
  setUitlegMode: Dispatch<SetStateAction<boolean>>;
  setCreatingExerciseDayId: Dispatch<SetStateAction<string>>;
  setExerciseName: Dispatch<SetStateAction<string>>;
  setExerciseSets: Dispatch<SetStateAction<string>>;
  setExerciseReps: Dispatch<SetStateAction<string>>;
  setExerciseIntensity: Dispatch<SetStateAction<string>>;
  setExerciseLoadKg: Dispatch<SetStateAction<string>>;
  setIsCreatingDay: Dispatch<SetStateAction<boolean>>;
  setNewDayTitle: Dispatch<SetStateAction<string>>;
  setOpenExerciseNoteId: Dispatch<SetStateAction<string>>;
  getDayDateInputValue: ViewHandler;
  hasExercises: ViewHandler;
  duplicateDay: ViewHandler;
  deleteDay: ViewHandler;
  updateDayLocal: ViewHandler;
  saveDayMeta: ViewHandler;
  saveDayField: ViewHandler;
  deleteDayField: ViewHandler;
  handleDragStart: ViewHandler;
  handleDragOver: ViewHandler;
  saveDayOrder: ViewHandler;
  saveExerciseLibraryLink: ViewHandler;
  handleExerciseDragStart: ViewHandler;
  handleExerciseDragOver: ViewHandler;
  handleExerciseDragOverDay: ViewHandler;
  saveExerciseOrder: ViewHandler;
  updateExerciseLocal: ViewHandler;
  saveExerciseField: ViewHandler;
  deleteExercise: ViewHandler;
  handleCoachExerciseEnter: ViewHandler;
  handleNewExerciseFormKeyDown: ViewHandler;
  addExercise: ViewHandler;
  updateIntensityType: ViewHandler;
  deleteExerciseNote: ViewHandler;
  saveExercisePriority: ViewHandler;
  saveExerciseFields: ViewHandler;
  getAthleteExerciseNote: ViewHandler;
  createDay: ViewHandler;
  setLinkingExercise: Dispatch<SetStateAction<ProgramExercise | null>>;
  getShortSbdWeekSummary: ViewHandler;
  weekStatsReport: ReturnType<
    typeof import("@/lib/programWeek/weekStats").buildWeekStatsReport
  >;
  weeksByBlock: Record<string, ProgramWeek[]>;
  blockId: string;
  weekId: string;
  insertExerciseFromRaw: ViewHandler;
  applyRawClipboardPaste: ViewHandler;
  duplicateExerciseRow: ViewHandler;
  getSelectedAthleteExercise: ViewHandler;
  loadingAthleteSets: boolean;
  athleteNotePanelOpen: boolean;
  previousWeekOpen: boolean;
  loadingPreviousWeekSets: boolean;
  previousWeekMessage: string;
  previousWeekData: PreviousWeekSetData | null;
  uploadingVideoSetKey: string;
  setAthleteExercisePanelOpen: Dispatch<SetStateAction<boolean>>;
  setSelectedAthleteExerciseId: Dispatch<SetStateAction<string>>;
  setAthleteNotePanelOpen: Dispatch<SetStateAction<boolean>>;
  resetPreviousWeekData: ViewHandler;
  updateAthleteExerciseNoteLocal: ViewHandler;
  saveAthleteExerciseNote: ViewHandler;
  loadPreviousWeekExerciseSets: ViewHandler;
  openVideoRecorder: ViewHandler;
  updateAthleteSetLocal: ViewHandler;
  saveAthleteSetField: ViewHandler;
  handleAthleteSetArrowNavigation: ViewHandler;
  copyAthleteSetToNextRow: ViewHandler;
  deleteAthleteSetVideo: ViewHandler;
  getAthleteSetVideo: ViewHandler;
  getAthleteSetVideoKey: ViewHandler;
  getInlineE1rmLabel: ViewHandler;
  getAverageFromRows: ViewHandler;
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
  renameBlock: ViewHandler;
  editingWeekId: string;
  editingWeekTitle: string;
  setEditingWeekId: Dispatch<SetStateAction<string>>;
  setEditingWeekTitle: Dispatch<SetStateAction<string>>;
  renameWeek: ViewHandler;
  linkingExercise: ProgramExercise | null;
  libraryItems: ExerciseLibraryItem[];
  previewLibraryItem: ExerciseLibraryItem | null;
  blockIntakeWizard: BlockIntakeWizard | null;
  setBlockIntakeWizard: Dispatch<SetStateAction<BlockIntakeWizard | null>>;
  planningPanelHeight: number;
  setPlanningPanelHeight: Dispatch<SetStateAction<number>>;
  athleteDisplayName: string;
  progressionSnapshot: BlockProgressionSnapshot | null;
  progressionLoading: boolean;
  onProgressionSaveCell: (
    exerciseId: string,
    updates: { load: string; reps: string; rpe: string },
  ) => void | Promise<void>;
};
