"use client";

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  applyIntensityInput,
  applyLoadKgInput,
  getIntensityInputDisplay,
  getLoadKgInputDisplay,
} from "@/lib/programWeek/intensityInput";
import { SHOW_EXERCISE_PRIORITY_UI } from "@/lib/programWeek/editorFlags";
import { normalizeExerciseName } from "@/lib/programWeek/exerciseUtils";
import { isPendingExerciseId } from "@/lib/programWeek/pendingExercise";
import {
  buildRawSeedFromRowValues,
  buildRawPastePlan,
  hasRawClipboardGrid,
  parseClipboardGrid,
  parseRawCellKey,
  rawCellKey,
  serializeRawSelectionToTsv,
} from "@/lib/programWeek/rawClipboard";
import {
  focusRawCellInput,
  getAltDigitWeekIndex,
  getRawCellDisplayValue,
  isPrintableKey,
} from "@/lib/programWeek/rawSpreadsheetCell";
import type {
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import { priorityOptions } from "@/lib/programWeek/types";
import {
  COL_LABELS,
  getRawSbdCellClass,
  getVisibleColKeys,
  isRawEditorActiveContext,
  MIN_VISIBLE_ROWS,
  type CellRef,
  type ColKey,
} from "./rawEditorCellUtils";

type RawExerciseSeed = Partial<
  Pick<
    ProgramExercise,
    "name" | "sets" | "reps" | "load" | "rpe" | "notes" | "priority"
  >
>;

export type RawProgramEditorProps = {
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
  getDayDate: (day: ProgramDay) => string;
  blockWeeks: ProgramWeek[];
  currentWeekId: string;
  onSelectWeek: (weekId: string) => void | Promise<void>;
  updateExerciseLocal: (
    dayId: string,
    exerciseId: string,
    field: keyof ProgramExercise,
    value: string,
  ) => void;
  saveExerciseField: (
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
  ) => void | Promise<void>;
  saveExerciseFields: (
    exerciseId: string,
    updates: Partial<
      Pick<ProgramExercise, "name" | "sets" | "reps" | "load" | "rpe" | "notes">
    >,
  ) => void | Promise<void>;
  saveExercisePriority: (
    exerciseId: string,
    priority: string,
  ) => void | Promise<void>;
  deleteExercise: (exerciseId: string) => void | Promise<void>;
  duplicateDay: (day: ProgramDay) => void | Promise<void>;
  insertExerciseFromRaw: (
    dayId: string,
    seed?: RawExerciseSeed,
    afterIndex?: number,
  ) => void | Promise<void>;
  applyRawClipboardPaste: (
    targets: Array<{
      dayId: string;
      rowIndex: number;
      rowValues: Partial<Record<ColKey, string>>;
    }>,
  ) => void | Promise<void>;
  duplicateExerciseRow: (
    dayId: string,
    exerciseId: string,
  ) => void | Promise<void>;
};

export type RawProgramEditorHandle = {
  flushPendingEdits: () => Promise<void>;
};

function cellKey(ref: CellRef) {
  return rawCellKey(ref);
}

function getCellKey(dayId: string, rowIndex: number, colKey: ColKey) {
  return rawCellKey({ dayId, rowIndex, colKey });
}

function getCellStorageKey(
  ref: CellRef,
  exercise: ProgramExercise | null,
): string {
  if (exercise?.id) return `${exercise.id}:${ref.colKey}`;
  return getCellKey(ref.dayId, ref.rowIndex, ref.colKey);
}

function normalizeCellCompareValue(
  colKey: ColKey,
  value: string,
): string {
  if (colKey === "name") return normalizeExerciseName(value);
  return value.trim();
}

type EditArrowDirection = "up" | "down" | "left" | "right";

function shouldLeaveCellOnEditArrow(
  event: ReactKeyboardEvent<HTMLElement>,
  direction: EditArrowDirection,
) {
  const target = event.currentTarget;

  if (target instanceof HTMLSelectElement) {
    return true;
  }

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? 0;
    const length = target.value.length;

    if (direction === "up" || direction === "down") {
      return true;
    }

    if (start !== end) {
      if (start === 0 && end === length) {
        return true;
      }
      return false;
    }

    if (direction === "left") return start === 0;
    return end === length;
  }

  return true;
}

function collapseEditSelectionOnArrow(
  event: ReactKeyboardEvent<HTMLElement>,
  direction: "left" | "right",
) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) {
    return false;
  }

  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? 0;
  if (start === end) return false;
  if (start === 0 && end === target.value.length) return false;

  event.preventDefault();
  event.stopPropagation();
  const pos = direction === "left" ? start : end;
  target.setSelectionRange(pos, pos);
  return true;
}

function editArrowDirectionFromKey(key: string): EditArrowDirection | null {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}

const DRAG_SELECT_THRESHOLD_PX = 4;
const MAX_UNDO_BATCHES = 50;

type UndoEntry = {
  dayId: string;
  rowIndex: number;
  colKey: ColKey;
  previousValue: string;
  /** When paste/typing created a new exercise row, undo removes it entirely. */
  undoAction?: "update" | "remove-exercise";
};

type RawPasteTargetInput = {
  dayId: string;
  rowIndex: number;
  rowValues: Partial<Record<ColKey, string>>;
};

function mergePasteTargetsByRow(targets: RawPasteTargetInput[]) {
  const merged = new Map<string, RawPasteTargetInput>();

  for (const target of targets) {
    const key = `${target.dayId}:${target.rowIndex}`;
    const existing = merged.get(key) ?? {
      dayId: target.dayId,
      rowIndex: target.rowIndex,
      rowValues: {},
    };
    existing.rowValues = { ...existing.rowValues, ...target.rowValues };
    merged.set(key, existing);
  }

  return [...merged.values()];
}

function colLetter(index: number) {
  let n = index;
  let result = "";
  while (n >= 0) {
    result = String.fromCharCode((n % 26) + 65) + result;
    n = Math.floor(n / 26) - 1;
  }
  return result;
}

function getRawPriorityClass(priority: string) {
  const clean = priority.trim().toLowerCase();
  if (!clean) return "coach-program-raw-priority-empty";
  if (
    ["primary", "secondary", "tertiary", "quaternary", "quinary"].includes(
      clean,
    )
  ) {
    return `coach-program-raw-priority-${clean}`;
  }
  return "coach-program-raw-priority-empty";
}

const RawProgramEditor = forwardRef<RawProgramEditorHandle, RawProgramEditorProps>(
  function RawProgramEditor(
  {
  days,
  exercisesByDay,
  getDayDate,
  blockWeeks,
  currentWeekId,
  onSelectWeek,
  updateExerciseLocal,
  saveExerciseField,
  saveExerciseFields,
  saveExercisePriority,
  deleteExercise,
  duplicateDay,
  insertExerciseFromRaw,
  applyRawClipboardPaste,
  duplicateExerciseRow,
}: RawProgramEditorProps,
  ref,
) {
  const editorRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const selectedCellRef = useRef<CellRef | null>(null);
  const editingCellRef = useRef<CellRef | null>(null);
  const editDraftRef = useRef("");
  const editOriginalRef = useRef("");
  // Local cell overrides keyed by dayId:rowIndex:colKey — triggers re-render.
  const [localCellValues, setLocalCellValues] = useState<Record<string, string>>({});
  const anchorCellRef = useRef<CellRef | null>(null);
  const selectedCellsRef = useRef<Set<string>>(new Set());
  const sortedWeeksRef = useRef<ProgramWeek[]>([]);
  const selectedDayIndexRef = useRef(0);
  const prevWeekIdRef = useRef(currentWeekId);
  const undoStackRef = useRef<UndoEntry[][]>([]);
  const isUndoingRef = useRef(false);
  const prevExercisesByIdRef = useRef<Map<string, ProgramExercise>>(new Map());
  const commitInFlightRef = useRef(Promise.resolve());
  const suppressEditBlurRef = useRef(false);
  const pointerSelectRef = useRef<{
    anchor: CellRef;
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<CellRef | null>(null);
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [anchorCell, setAnchorCell] = useState<CellRef | null>(null);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [isDraggingSelect, setIsDraggingSelect] = useState(false);
  const [fillDrag, setFillDrag] = useState<{
    source: CellRef;
    targetRow: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    dayId: string;
    rowIndex: number;
    exerciseId: string | null;
  } | null>(null);

  const sortedWeeks = useMemo(
    () => [...blockWeeks].sort((a, b) => a.week_number - b.week_number),
    [blockWeeks],
  );

  /** Returns local override if present, otherwise server/display value. */
  const getCellDisplayValue = (
    ref: CellRef,
    exercise: ProgramExercise | null,
    colKey: ColKey,
  ): string => {
    const key = getCellStorageKey(ref, exercise);
    if (Object.prototype.hasOwnProperty.call(localCellValues, key)) {
      return localCellValues[key];
    }
    return getRawCellDisplayValue(exercise, colKey);
  };

  const pushUndoBatch = useCallback((entries: UndoEntry[]) => {
    if (entries.length === 0 || isUndoingRef.current) return;
    undoStackRef.current.push(entries);
    if (undoStackRef.current.length > MAX_UNDO_BATCHES) {
      undoStackRef.current.shift();
    }
  }, []);

  const buildUndoEntry = (
    ref: CellRef,
    exercise: ProgramExercise | null,
    previousValue: string,
  ): UndoEntry => ({
    dayId: ref.dayId,
    rowIndex: ref.rowIndex,
    colKey: ref.colKey,
    previousValue,
    undoAction: exercise ? "update" : "remove-exercise",
  });

  const setLocalCellValue = useCallback((key: string, value: string) => {
    setLocalCellValues((current) => {
      if (current[key] === value) return current;
      return { ...current, [key]: value };
    });
  }, []);

  const clearLocalCellValue = useCallback((key: string) => {
    setLocalCellValues((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const trackCommit = useCallback((promise: Promise<void>) => {
    const tracked = promise.finally(() => {
      if (commitInFlightRef.current === tracked) {
        commitInFlightRef.current = Promise.resolve();
      }
    });
    commitInFlightRef.current = tracked;
    return tracked;
  }, []);

  const clearCommittedCellOverrides = useCallback(
    (ref: CellRef, exercise: ProgramExercise | null) => {
      const storageKey = getCellStorageKey(ref, exercise);
      clearLocalCellValue(storageKey);
      clearLocalCellValue(getCellKey(ref.dayId, ref.rowIndex, ref.colKey));
    },
    [clearLocalCellValue],
  );

  useEffect(() => {
    selectedCellRef.current = selectedCell;
  }, [selectedCell]);

  useEffect(() => {
    editingCellRef.current = editingCell;
  }, [editingCell]);

  useEffect(() => {
    editDraftRef.current = editDraft;
  }, [editDraft]);

  useEffect(() => {
    anchorCellRef.current = anchorCell;
  }, [anchorCell]);

  useEffect(() => {
    selectedCellsRef.current = selectedCells;
  }, [selectedCells]);

  useEffect(() => {
    sortedWeeksRef.current = sortedWeeks;
  }, [sortedWeeks]);

  useEffect(() => {
    if (!selectedCell) return;
    const dayIndex = days.findIndex((day) => day.id === selectedCell.dayId);
    if (dayIndex >= 0) selectedDayIndexRef.current = dayIndex;
  }, [selectedCell, days]);

  useEffect(() => {
    if (prevWeekIdRef.current === currentWeekId) return;
    prevWeekIdRef.current = currentWeekId;

    const prevRef = selectedCellRef.current;
    const dayIndex = Math.min(
      selectedDayIndexRef.current,
      Math.max(days.length - 1, 0),
    );
    const targetDay = days[dayIndex];

    if (!targetDay) {
      setSelectedCell(null);
      selectedCellRef.current = null;
      setSelectedCells(new Set());
      setEditingCell(null);
      editingCellRef.current = null;
      return;
    }

    const ref: CellRef = {
      dayId: targetDay.id,
      rowIndex: prevRef?.rowIndex ?? 0,
      colKey: prevRef?.colKey ?? "name",
    };

    setSelectedCell(ref);
    selectedCellRef.current = ref;
    setSelectedCells(new Set([rawCellKey(ref)]));
    setEditingCell(null);
    editingCellRef.current = null;
    setEditDraft("");
    editDraftRef.current = "";
    setLocalCellValues({});
  }, [currentWeekId, days]);

  const exercisesByDaySorted = useMemo(() => {
    const result: Record<string, ProgramExercise[]> = {};
    for (const day of days) {
      result[day.id] = [...(exercisesByDay[day.id] || [])].sort(
        (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
      );
    }
    return result;
  }, [days, exercisesByDay]);

  const maxRows = useMemo(() => {
    const maxExercises = days.reduce((max, day) => {
      const count = exercisesByDaySorted[day.id]?.length || 0;
      return Math.max(max, count);
    }, 0);
    return Math.max(MIN_VISIBLE_ROWS, maxExercises + 2);
  }, [days, exercisesByDaySorted]);

  const getExerciseAt = useCallback(
    (dayId: string, rowIndex: number): ProgramExercise | null => {
      const list = exercisesByDaySorted[dayId] || [];
      return list[rowIndex] ?? null;
    },
    [exercisesByDaySorted],
  );

  // Drop local overrides once server state matches the committed value.
  useEffect(() => {
    setLocalCellValues((current) => {
      let changed = false;
      const next = { ...current };

      for (const key of Object.keys(current)) {
        let ref: CellRef | null = null;
        let exercise: ProgramExercise | null = null;

        if (key.includes(":")) {
          const parts = key.split(":");
          if (parts.length === 3) {
            ref = parseRawCellKey(key);
            if (ref) {
              exercise = exercisesByDaySorted[ref.dayId]?.[ref.rowIndex] ?? null;
            }
          } else if (parts.length === 2) {
            const [exerciseId, colKey] = parts as [string, ColKey];
            for (const dayId of Object.keys(exercisesByDaySorted)) {
              const list = exercisesByDaySorted[dayId] || [];
              const match = list.find((item) => item.id === exerciseId);
              if (match) {
                exercise = match;
                ref = {
                  dayId,
                  rowIndex: list.indexOf(match),
                  colKey,
                };
                break;
              }
            }
          }
        }

        if (!ref) continue;

        const serverValue = getRawCellDisplayValue(exercise, ref.colKey);
        if (
          normalizeCellCompareValue(ref.colKey, serverValue) ===
          normalizeCellCompareValue(ref.colKey, current[key])
        ) {
          delete next[key];
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [exercisesByDaySorted]);

  // Migrate positional overrides to exercise-id keys after inserts land.
  useEffect(() => {
    setLocalCellValues((current) => {
      let changed = false;
      const next = { ...current };

      for (const key of Object.keys(current)) {
        const ref = parseRawCellKey(key);
        if (!ref) continue;
        const exercise = exercisesByDaySorted[ref.dayId]?.[ref.rowIndex] ?? null;
        if (!exercise?.id) continue;
        const stableKey = getCellStorageKey(ref, exercise);
        if (stableKey === key) continue;
        if (!(stableKey in next)) next[stableKey] = current[key];
        delete next[key];
        changed = true;
      }

      return changed ? next : current;
    });
  }, [exercisesByDaySorted]);

  // Migrate local overrides from temp pending ids to real exercise ids after insert.
  useEffect(() => {
    const currentById = new Map<string, ProgramExercise>();
    const currentByDayAndNumber = new Map<string, ProgramExercise>();

    for (const [dayId, list] of Object.entries(exercisesByDaySorted)) {
      for (const exercise of list) {
        currentById.set(exercise.id, exercise);
        currentByDayAndNumber.set(
          `${dayId}:${exercise.exercise_number}`,
          exercise,
        );
      }
    }

    setLocalCellValues((current) => {
      let changed = false;
      const next = { ...current };

      for (const [oldId, oldExercise] of prevExercisesByIdRef.current) {
        if (!isPendingExerciseId(oldId) || currentById.has(oldId)) continue;

        const replacement =
          currentByDayAndNumber.get(
            `${oldExercise.program_day_id}:${oldExercise.exercise_number}`,
          ) ?? null;
        if (!replacement || replacement.id === oldId) continue;

        for (const key of Object.keys(current)) {
          const [exerciseId, colKey] = key.split(":") as [string, ColKey];
          if (exerciseId !== oldId) continue;
          const migratedKey = `${replacement.id}:${colKey}`;
          if (!(migratedKey in next)) next[migratedKey] = current[key];
          delete next[key];
          changed = true;
        }
      }

      for (const key of Object.keys(current)) {
        const [exerciseId] = key.split(":");
        if (!isPendingExerciseId(exerciseId) || currentById.has(exerciseId)) {
          continue;
        }
        delete next[key];
        changed = true;
      }

      return changed ? next : current;
    });

    prevExercisesByIdRef.current = currentById;
  }, [exercisesByDaySorted]);

  const visibleColKeys = useMemo(() => getVisibleColKeys(), []);

  const getColIndex = (colKey: ColKey) => visibleColKeys.indexOf(colKey);

  const getCellLabel = (ref: CellRef | null) => {
    if (!ref) return "";
    const dayIndex = days.findIndex((day) => day.id === ref.dayId);
    const colIndex = getColIndex(ref.colKey);
    const globalCol = dayIndex * (visibleColKeys.length + 1) + colIndex + 1;
    return `${colLetter(globalCol)}${ref.rowIndex + 1}`;
  };

  const expandSelection = (from: CellRef, to: CellRef) => {
    const dayIds = days.map((day) => day.id);
    const fromDay = dayIds.indexOf(from.dayId);
    const toDay = dayIds.indexOf(to.dayId);
    const minDay = Math.min(fromDay, toDay);
    const maxDay = Math.max(fromDay, toDay);

    const fromCol = visibleColKeys.indexOf(from.colKey);
    const toCol = visibleColKeys.indexOf(to.colKey);
    if (fromCol === -1 || toCol === -1) return;
    const minCol = Math.min(fromCol, toCol);
    const maxCol = Math.max(fromCol, toCol);

    const minRow = Math.min(from.rowIndex, to.rowIndex);
    const maxRow = Math.max(from.rowIndex, to.rowIndex);

    const next = new Set<string>();
    for (let d = minDay; d <= maxDay; d += 1) {
      const dayId = dayIds[d];
      for (let r = minRow; r <= maxRow; r += 1) {
        for (let c = minCol; c <= maxCol; c += 1) {
          next.add(
            cellKey({ dayId, rowIndex: r, colKey: visibleColKeys[c] }),
          );
        }
      }
    }
    setSelectedCells(next);
  };

  const commitCellValue = async (
    ref: CellRef,
    value: string,
    options?: { recordUndo?: boolean },
  ) =>
    trackCommit(
      (async () => {
        const exercise = getExerciseAt(ref.dayId, ref.rowIndex);
        if (!exercise) {
          const list = exercisesByDaySorted[ref.dayId] || [];
          const actualIndex = Math.min(ref.rowIndex, list.length);
          const actualRef: CellRef = { ...ref, rowIndex: actualIndex };
          const clickedKey = getCellKey(ref.dayId, ref.rowIndex, ref.colKey);
          const actualKey = getCellKey(
            actualRef.dayId,
            actualRef.rowIndex,
            ref.colKey,
          );

          if (
            options?.recordUndo !== false &&
            !isUndoingRef.current &&
            value.trim()
          ) {
            pushUndoBatch([
              buildUndoEntry(
                ref,
                null,
                getCellDisplayValue(ref, null, ref.colKey),
              ),
            ]);
          }

          clearLocalCellValue(clickedKey);
          setLocalCellValue(actualKey, value);

          try {
            if (ref.colKey === "name") {
              await commitBlankName(ref.dayId, ref.rowIndex, value);
            } else {
              await commitEmptyCell(ref.dayId, ref.rowIndex, ref.colKey, value);
            }
            clearCommittedCellOverrides(
              actualRef,
              getExerciseAt(actualRef.dayId, actualRef.rowIndex),
            );
          } catch (error) {
            if (options?.recordUndo !== false) {
              undoStackRef.current.pop();
            }
            clearLocalCellValue(clickedKey);
            clearLocalCellValue(actualKey);
            throw error;
          }
          return;
        }

        const previousValue = getCellDisplayValue(ref, exercise, ref.colKey);
        if (
          options?.recordUndo !== false &&
          !isUndoingRef.current &&
          previousValue !== value
        ) {
          pushUndoBatch([buildUndoEntry(ref, exercise, previousValue)]);
        }

        const key = getCellStorageKey(ref, exercise);
        setLocalCellValue(key, value);

        await applyCellValue(ref.dayId, exercise, ref.colKey, value);
        clearCommittedCellOverrides(
          ref,
          getExerciseAt(ref.dayId, ref.rowIndex),
        );
      })(),
    );

  const undoLastChange = async () => {
    if (editingCellRef.current) {
      const editing = editingCellRef.current;
      if (editDraftRef.current !== editOriginalRef.current) {
        setEditDraft(editOriginalRef.current);
        editDraftRef.current = editOriginalRef.current;
        const exercise = getExerciseAt(editing.dayId, editing.rowIndex);
        const key = getCellStorageKey(editing, exercise);
        if (editOriginalRef.current) {
          setLocalCellValue(key, editOriginalRef.current);
        } else {
          clearLocalCellValue(key);
        }
        return;
      }
    }

    const batch = undoStackRef.current.pop();
    if (!batch?.length) return;

    isUndoingRef.current = true;
    try {
      if (editingCellRef.current) {
        await exitEditMode(false);
      }

      const rowsToRemove = new Set<string>();
      for (const entry of batch) {
        if (entry.undoAction === "remove-exercise") {
          rowsToRemove.add(`${entry.dayId}:${entry.rowIndex}`);
        }
      }

      const updateEntries = batch.filter(
        (entry) => entry.undoAction !== "remove-exercise",
      );

      setLocalCellValues((current) => {
        const next = { ...current };

        for (const entry of batch) {
          const ref: CellRef = {
            dayId: entry.dayId,
            rowIndex: entry.rowIndex,
            colKey: entry.colKey,
          };
          const positionalKey = getCellKey(ref.dayId, ref.rowIndex, ref.colKey);
          const exercise = getExerciseAt(ref.dayId, ref.rowIndex);
          const storageKey = getCellStorageKey(ref, exercise);

          if (entry.undoAction === "remove-exercise") {
            delete next[storageKey];
            delete next[positionalKey];
            continue;
          }

          if (entry.previousValue) {
            next[storageKey] = entry.previousValue;
          } else {
            delete next[storageKey];
            delete next[positionalKey];
          }
        }

        return next;
      });

      if (updateEntries.length > 0) {
        const targets = mergePasteTargetsByRow(
          updateEntries.map((entry) => ({
            dayId: entry.dayId,
            rowIndex: entry.rowIndex,
            rowValues: { [entry.colKey]: entry.previousValue },
          })),
        );
        await applyRawClipboardPaste(targets);
      }

      for (const key of rowsToRemove) {
        const [dayId, rowIndexStr] = key.split(":");
        const rowIndex = Number(rowIndexStr);
        if (!dayId || !Number.isFinite(rowIndex)) continue;
        const exercise = getExerciseAt(dayId, rowIndex);
        if (exercise) {
          await deleteExercise(exercise.id);
        }
      }

      const focusEntry = batch[batch.length - 1];
      selectSingleCell({
        dayId: focusEntry.dayId,
        rowIndex: focusEntry.rowIndex,
        colKey: focusEntry.colKey,
      });
    } finally {
      isUndoingRef.current = false;
    }
  };

  const exitEditMode = async (save: boolean) => {
    const editing = editingCellRef.current;
    if (!editing) return;

    const key = getCellStorageKey(editing, getExerciseAt(editing.dayId, editing.rowIndex));

    if (save) {
      await commitCellValue(editing, editDraftRef.current);
    } else {
      clearLocalCellValue(key);
    }

    setEditingCell(null);
    editingCellRef.current = null;
    setEditDraft("");
    editDraftRef.current = "";
    editOriginalRef.current = "";
  };

  const handleEditBlur = () => {
    if (suppressEditBlurRef.current) return;
    void exitEditMode(true);
  };

  const commitEditAndMoveByArrow = async (
    fromRef: CellRef,
    direction: EditArrowDirection,
  ) => {
    suppressEditBlurRef.current = true;
    try {
      await exitEditMode(true);
      moveActiveCellByArrow(fromRef, direction);
      const next = selectedCellRef.current;
      if (next) {
        startEditMode(next, { preserve: true });
      }
    } finally {
      window.requestAnimationFrame(() => {
        suppressEditBlurRef.current = false;
      });
    }
  };

  useImperativeHandle(ref, () => ({
    flushPendingEdits: async () => {
      if (editingCellRef.current) {
        await exitEditMode(true);
      }
      await commitInFlightRef.current;
    },
  }));

  const startEditMode = (
    ref: CellRef,
    options?: { preserve?: boolean; initialChar?: string; initialValue?: string },
  ) => {
    const exercise = getExerciseAt(ref.dayId, ref.rowIndex);
    const preserved = getRawCellDisplayValue(exercise, ref.colKey);
    const nextDraft = options?.preserve
      ? preserved
      : options?.initialValue !== undefined
        ? options.initialValue
        : (options?.initialChar ?? "");
    const nextOriginal = options?.preserve ? preserved : "";

    setSelectedCell(ref);
    selectedCellRef.current = ref;
    setAnchorCell(ref);
    anchorCellRef.current = ref;
    setSelectedCells(new Set([cellKey(ref)]));
    setEditingCell(ref);
    editingCellRef.current = ref;
    setEditDraft(nextDraft);
    editDraftRef.current = nextDraft;
    editOriginalRef.current = nextOriginal;
    if (!options?.preserve || nextDraft !== preserved) {
      setLocalCellValue(getCellStorageKey(ref, exercise), nextDraft);
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        focusRawCellInput(gridRef.current, ref, {
          preserve: options?.preserve,
          placeAtEnd: true,
        });
        if (options?.initialChar && !options?.preserve) {
          const cell = gridRef.current?.querySelector(
            `[data-cell="${cellKey(ref)}"]`,
          );
          const input = cell?.querySelector("input, textarea") as
            | HTMLInputElement
            | HTMLTextAreaElement
            | null;
          if (input) {
            input.setSelectionRange(1, 1);
          }
        }
      });
    });
  };

  const selectSingleCell = (ref: CellRef) => {
    setSelectedCell(ref);
    selectedCellRef.current = ref;
    setAnchorCell(ref);
    anchorCellRef.current = ref;
    setSelectedCells(new Set([cellKey(ref)]));
  };

  const moveActiveCell = (
    ref: CellRef,
    direction: "enter" | "tab" | "shift-tab",
  ) => {
    const colIndex = getColIndex(ref.colKey);
    let next: CellRef | null = null;

    if (direction === "enter") {
      next = { ...ref, rowIndex: Math.min(ref.rowIndex + 1, maxRows - 1) };
    } else if (direction === "tab") {
      if (colIndex < visibleColKeys.length - 1) {
        next = { ...ref, colKey: visibleColKeys[colIndex + 1] };
      } else if (ref.rowIndex + 1 < maxRows) {
        next = {
          ...ref,
          rowIndex: ref.rowIndex + 1,
          colKey: visibleColKeys[0],
        };
      }
    } else if (colIndex > 0) {
      next = { ...ref, colKey: visibleColKeys[colIndex - 1] };
    } else if (ref.rowIndex > 0) {
      next = {
        ...ref,
        rowIndex: ref.rowIndex - 1,
        colKey: visibleColKeys[visibleColKeys.length - 1],
      };
    }

    if (next) selectSingleCell(next);
  };

  const moveActiveCellByArrow = (
    ref: CellRef,
    direction: "up" | "down" | "left" | "right",
    extendSelection = false,
  ) => {
    const dayIds = days.map((day) => day.id);
    const dayIndex = dayIds.indexOf(ref.dayId);
    const colIndex = getColIndex(ref.colKey);
    let next: CellRef | null = null;

    if (direction === "up") {
      next = { ...ref, rowIndex: Math.max(ref.rowIndex - 1, 0) };
    } else if (direction === "down") {
      next = { ...ref, rowIndex: Math.min(ref.rowIndex + 1, maxRows - 1) };
    } else if (direction === "left") {
      if (colIndex > 0) {
        next = { ...ref, colKey: visibleColKeys[colIndex - 1] };
      } else if (dayIndex > 0) {
        next = {
          dayId: dayIds[dayIndex - 1],
          rowIndex: ref.rowIndex,
          colKey: visibleColKeys[visibleColKeys.length - 1],
        };
      }
    } else if (direction === "right") {
      if (colIndex < visibleColKeys.length - 1) {
        next = { ...ref, colKey: visibleColKeys[colIndex + 1] };
      } else if (dayIndex < dayIds.length - 1) {
        next = {
          dayId: dayIds[dayIndex + 1],
          rowIndex: ref.rowIndex,
          colKey: visibleColKeys[0],
        };
      }
    }

    if (!next) return;

    if (extendSelection && anchorCellRef.current) {
      expandSelection(anchorCellRef.current, next);
      setSelectedCell(next);
      selectedCellRef.current = next;
      return;
    }

    selectSingleCell(next);
  };

  const resolveCellFromPoint = (clientX: number, clientY: number): CellRef | null => {
    const el = document.elementFromPoint(clientX, clientY);
    const cellEl = el?.closest("[data-cell]") as HTMLElement | null;
    if (!cellEl?.dataset.cell) return null;
    return parseRawCellKey(cellEl.dataset.cell);
  };

  const handleCellPointerDown = (
    event: ReactPointerEvent,
    ref: CellRef,
    exercise: ProgramExercise | null,
  ) => {
    if (event.button !== 0) return;
    if ((event.target as HTMLElement).closest("button")) return;

    if ((event.target as HTMLElement).closest("input, textarea, select")) {
      return;
    }

    event.preventDefault();

    if (
      editingCellRef.current &&
      cellKey(editingCellRef.current) !== cellKey(ref)
    ) {
      void exitEditMode(true);
    }

    if (event.shiftKey && anchorCellRef.current) {
      expandSelection(anchorCellRef.current, ref);
      setSelectedCell(ref);
      selectedCellRef.current = ref;
      return;
    }

    pointerSelectRef.current = {
      anchor: ref,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };

    setAnchorCell(ref);
    anchorCellRef.current = ref;
    setSelectedCell(ref);
    selectedCellRef.current = ref;
    setSelectedCells(new Set([cellKey(ref)]));

  };

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const pending = pointerSelectRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;

      const dx = event.clientX - pending.startX;
      const dy = event.clientY - pending.startY;

      if (
        !pending.dragging &&
        (Math.abs(dx) > DRAG_SELECT_THRESHOLD_PX ||
          Math.abs(dy) > DRAG_SELECT_THRESHOLD_PX)
      ) {
        pending.dragging = true;
        setIsDraggingSelect(true);
        void exitEditMode(true);
        (document.activeElement as HTMLElement | null)?.blur();
      }

      if (!pending.dragging) return;

      const ref = resolveCellFromPoint(event.clientX, event.clientY);
      if (!ref) return;

      expandSelection(pending.anchor, ref);
      setSelectedCell(ref);
      selectedCellRef.current = ref;
    };

    const onPointerUp = (event: PointerEvent) => {
      const pending = pointerSelectRef.current;
      if (!pending || event.pointerId !== pending.pointerId) return;

      if (!pending.dragging) {
        selectSingleCell(pending.anchor);

        // Do NOT clear edit mode here — a pointerUp from the same click that started
        // editing (mousedown → keydown → mouseup) would discard the draft without saving.
        // Exiting edit mode is handled by pointerDown on another cell, blur/Enter/Tab,
        // or Escape.

        // Move focus to the editor so keyboard shortcuts work immediately after clicking a cell.
        // event.preventDefault() in handleCellPointerDown prevents the browser from setting focus
        // naturally, so we do it here explicitly.
        const editorEl = editorRef.current;
        if (editorEl) {
          const currentFocus = document.activeElement;
          const isEditingField =
            currentFocus instanceof HTMLElement &&
            currentFocus.matches("input, textarea, select") &&
            editorEl.contains(currentFocus);
          if (
            !isEditingField &&
            (!currentFocus || !editorEl.contains(currentFocus))
          ) {
            editorEl.focus({ preventScroll: true });
          }
        }
      }

      pointerSelectRef.current = null;
      setIsDraggingSelect(false);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  });

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  useEffect(() => {
    const editorEl = editorRef.current;
    if (!editorEl) return;

    const onWheel = (event: WheelEvent) => {
      const scrollEl = gridRef.current;
      if (!scrollEl || !editorEl.contains(event.target as Node)) return;

      const horizontalDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY)
          ? event.deltaX
          : event.shiftKey
            ? event.deltaY
            : 0;
      const verticalDelta =
        Math.abs(event.deltaX) > Math.abs(event.deltaY) ? 0 : event.deltaY;

      if (horizontalDelta !== 0) {
        scrollEl.scrollLeft += horizontalDelta;
      }
      if (verticalDelta !== 0) {
        scrollEl.scrollTop += verticalDelta;
      }

      if (horizontalDelta !== 0 || verticalDelta !== 0) {
        event.preventDefault();
        event.stopPropagation();
      }
    };

    editorEl.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    return () =>
      editorEl.removeEventListener("wheel", onWheel, { capture: true });
  }, [days.length]);

  const saveIntensity = (
    dayId: string,
    exercise: ProgramExercise,
    value: string,
  ) => {
    const updates = applyIntensityInput(exercise, value);
    void saveExerciseFields(exercise.id, updates);
    updateExerciseLocal(dayId, exercise.id, "rpe", updates.rpe || "");
    updateExerciseLocal(dayId, exercise.id, "load", updates.load || "");
  };

  const saveLoadKg = (
    dayId: string,
    exercise: ProgramExercise,
    value: string,
  ) => {
    const updates = applyLoadKgInput(exercise, value);
    void saveExerciseFields(exercise.id, updates);
    updateExerciseLocal(dayId, exercise.id, "rpe", updates.rpe || "");
    updateExerciseLocal(dayId, exercise.id, "load", updates.load || "");
  };

  const buildEmptyRowSeed = (
    colKey: ColKey,
    value: string,
  ): RawExerciseSeed | null => {
    const clean = value.trim();
    if (!clean) return null;

    if (colKey === "name") return { name: clean };
    if (colKey === "sets") return { sets: clean };
    if (colKey === "reps") return { reps: clean };
    if (colKey === "notes") return { notes: clean };
    if (colKey === "priority") return { priority: clean.toLowerCase() };
    if (colKey === "intensity") {
      const parsed = applyIntensityInput({ load: "", rpe: "" }, clean);
      return { rpe: parsed.rpe || "", load: parsed.load || "" };
    }
    if (colKey === "load") {
      const parsed = applyLoadKgInput({ load: "", rpe: "" }, clean);
      return { load: parsed.load || "" };
    }
    return null;
  };

  const commitEmptyCell = async (
    dayId: string,
    rowIndex: number,
    colKey: ColKey,
    value: string,
  ) => {
    const existing = getExerciseAt(dayId, rowIndex);
    if (existing) {
      await applyCellValue(dayId, existing, colKey, value);
      return;
    }

    const seed = buildEmptyRowSeed(colKey, value);
    if (!seed) return;
    await insertExerciseFromRaw(dayId, seed, rowIndex - 1);
  };

  const commitBlankName = async (dayId: string, rowIndex: number, name: string) => {
    const clean = name.trim();
    if (!clean) return;

    const existing = getExerciseAt(dayId, rowIndex);
    if (existing) {
      await applyCellValue(dayId, existing, "name", clean);
      return;
    }

    await insertExerciseFromRaw(dayId, { name: clean }, rowIndex - 1);
  };

  const applyCellValue = async (
    dayId: string,
    exercise: ProgramExercise,
    colKey: ColKey,
    value: string,
  ) => {
    if (isPendingExerciseId(exercise.id)) {
      if (colKey === "name") {
        updateExerciseLocal(dayId, exercise.id, "name", value);
      } else if (colKey === "sets") {
        updateExerciseLocal(dayId, exercise.id, "sets", value);
      } else if (colKey === "reps") {
        updateExerciseLocal(dayId, exercise.id, "reps", value);
      } else if (colKey === "notes") {
        updateExerciseLocal(dayId, exercise.id, "notes", value);
      } else if (colKey === "priority") {
        updateExerciseLocal(dayId, exercise.id, "priority", value.toLowerCase());
      } else if (colKey === "intensity") {
        const updates = applyIntensityInput(exercise, value);
        updateExerciseLocal(dayId, exercise.id, "rpe", updates.rpe || "");
        updateExerciseLocal(dayId, exercise.id, "load", updates.load || "");
      } else if (colKey === "load") {
        const updates = applyLoadKgInput(exercise, value);
        updateExerciseLocal(dayId, exercise.id, "rpe", updates.rpe || "");
        updateExerciseLocal(dayId, exercise.id, "load", updates.load || "");
      }
      return;
    }

    if (colKey === "name") {
      updateExerciseLocal(dayId, exercise.id, "name", value);
      await saveExerciseField(exercise.id, "name", value);
    } else if (colKey === "sets") {
      updateExerciseLocal(dayId, exercise.id, "sets", value);
      await saveExerciseField(exercise.id, "sets", value);
    } else if (colKey === "reps") {
      updateExerciseLocal(dayId, exercise.id, "reps", value);
      await saveExerciseField(exercise.id, "reps", value);
    } else if (colKey === "notes") {
      updateExerciseLocal(dayId, exercise.id, "notes", value);
      await saveExerciseField(exercise.id, "notes", value);
    } else if (colKey === "priority") {
      updateExerciseLocal(dayId, exercise.id, "priority", value.toLowerCase());
      await saveExercisePriority(exercise.id, value.toLowerCase());
    } else if (colKey === "intensity") {
      const updates = applyIntensityInput(exercise, value);
      updateExerciseLocal(dayId, exercise.id, "rpe", updates.rpe || "");
      updateExerciseLocal(dayId, exercise.id, "load", updates.load || "");
      await saveExerciseFields(exercise.id, updates);
    } else if (colKey === "load") {
      const updates = applyLoadKgInput(exercise, value);
      updateExerciseLocal(dayId, exercise.id, "rpe", updates.rpe || "");
      updateExerciseLocal(dayId, exercise.id, "load", updates.load || "");
      await saveExerciseFields(exercise.id, updates);
    }
  };

  const applyClipboardGrid = async (text: string, origin: CellRef) => {
    const grid = parseClipboardGrid(text);
    const startDayIndex = days.findIndex((day) => day.id === origin.dayId);
    const startCol = getColIndex(origin.colKey);
    if (startDayIndex === -1 || startCol === -1) return;

    const plan = buildRawPastePlan({
      grid,
      originDayIndex: startDayIndex,
      originRowIndex: origin.rowIndex,
      originColIndex: startCol,
      visibleColKeys,
      availableDayCount: days.length,
      maxRows,
    });

    const targets = plan
      .map((target) => {
        const day = days[startDayIndex + target.dayOffset];
        if (!day) return null;
        return {
          dayId: day.id,
          rowIndex: origin.rowIndex + target.rowOffset,
          rowValues: target.rowValues,
        };
      }      )
      .filter(
        (
          target,
        ): target is {
          dayId: string;
          rowIndex: number;
          rowValues: Partial<Record<ColKey, string>>;
        } => target != null,
      );

    const undoBatch: UndoEntry[] = [];
    for (const target of targets) {
      for (const [colKey, nextValue] of Object.entries(target.rowValues)) {
        if (nextValue === undefined) continue;
        const ref: CellRef = {
          dayId: target.dayId,
          rowIndex: target.rowIndex,
          colKey: colKey as ColKey,
        };
        const exercise = getExerciseAt(ref.dayId, ref.rowIndex);
        const previousValue = getCellDisplayValue(ref, exercise, ref.colKey);
        if (previousValue !== nextValue) {
          undoBatch.push(buildUndoEntry(ref, exercise, previousValue));
        }
      }
    }
    if (undoBatch.length > 0) {
      pushUndoBatch(undoBatch);
    }

    for (const target of targets) {
      for (const [colKey, value] of Object.entries(target.rowValues)) {
        if (value === undefined) continue;
        setLocalCellValue(
          getCellKey(target.dayId, target.rowIndex, colKey as ColKey),
          value,
        );
      }
    }

    try {
      await applyRawClipboardPaste(targets);
    } catch (error) {
      if (undoBatch.length > 0) {
        undoStackRef.current.pop();
      }
      for (const target of targets) {
        for (const colKey of visibleColKeys) {
          clearLocalCellValue(
            getCellKey(target.dayId, target.rowIndex, colKey),
          );
        }
      }
      throw error;
    }
  };

  const pasteHandlersRef = useRef({
    commitCellValue,
    applyClipboardGrid,
  });
  pasteHandlersRef.current = {
    commitCellValue,
    applyClipboardGrid,
  };

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      if (
        !isRawEditorActiveContext(
          editorRef.current,
          selectedCellRef.current,
        )
      ) {
        return;
      }

      const currentActive = selectedCellRef.current;
      if (!currentActive) return;
      if (!event.clipboardData) return;

      const text = event.clipboardData.getData("text/plain");

      const isGrid = hasRawClipboardGrid(text);

      if (editingCellRef.current && !isGrid) {
        event.preventDefault();
        const editing = editingCellRef.current;
        const exercise = getExerciseAt(editing.dayId, editing.rowIndex);
        const key = getCellStorageKey(editing, exercise);
        setEditDraft(text);
        editDraftRef.current = text;
        setLocalCellValue(key, text);
        return;
      }

      event.preventDefault();

      if (isGrid && editingCellRef.current) {
        await keyboardHandlersRef.current.exitEditMode(true);
      }

      if (isGrid) {
        await pasteHandlersRef.current.applyClipboardGrid(text, currentActive);
        return;
      }

      if (editingCellRef.current) {
        await keyboardHandlersRef.current.exitEditMode(false);
      }

      await pasteHandlersRef.current.commitCellValue(
        currentActive,
        text.trim(),
      );
    },
    [getExerciseAt, setLocalCellValue],
  );

  const handleCopy = useCallback(
    (event: ClipboardEvent) => {
      const selection = selectedCellsRef.current;
      if (selection.size === 0) return;

      if (
        !isRawEditorActiveContext(
          editorRef.current,
          selectedCellRef.current,
        )
      ) {
        return;
      }

      const target = event.target as HTMLElement;

      if (editingCellRef.current && selection.size === 1) {
        const input = target.closest("input, textarea") as
          | HTMLInputElement
          | HTMLTextAreaElement
          | null;
        if (input && input.selectionStart !== input.selectionEnd) return;
      }

      const text = serializeRawSelectionToTsv(
        selection,
        days,
        visibleColKeys,
        getExerciseAt,
        (dayId, rowIndex, colKey, exercise) =>
          getCellDisplayValue(
            { dayId, rowIndex, colKey },
            exercise,
            colKey,
          ),
      );

      event.preventDefault();
      event.clipboardData?.setData("text/plain", text);
    },
    [days, visibleColKeys, getExerciseAt],
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste, { capture: true });
    window.addEventListener("copy", handleCopy, { capture: true });
    return () => {
      window.removeEventListener("paste", handlePaste, { capture: true });
      window.removeEventListener("copy", handleCopy, { capture: true });
    };
  }, [handlePaste, handleCopy]);

  const clearSelectedCellValues = async () =>
    trackCommit(
      (async () => {
        if (editingCellRef.current) {
          await exitEditMode(false);
        }

        const keys =
          selectedCellsRef.current.size > 0
            ? [...selectedCellsRef.current]
            : selectedCellRef.current
              ? [cellKey(selectedCellRef.current)]
              : [];

        if (keys.length === 0) return;

        const undoBatch: UndoEntry[] = [];
        const localUpdates: Record<string, string | null> = {};

        for (const key of keys) {
          const ref = parseRawCellKey(key);
          if (!ref) continue;

          const exercise = getExerciseAt(ref.dayId, ref.rowIndex);
          const storageKey = getCellStorageKey(ref, exercise);
          const positionalKey = getCellKey(ref.dayId, ref.rowIndex, ref.colKey);
          const previousValue = getCellDisplayValue(ref, exercise, ref.colKey);

          if (!exercise) {
            localUpdates[positionalKey] = null;
            localUpdates[storageKey] = null;
            continue;
          }

          if (!previousValue && !(storageKey in localCellValues)) continue;

          undoBatch.push(buildUndoEntry(ref, exercise, previousValue));
          localUpdates[storageKey] = "";
        }

        if (undoBatch.length === 0) return;

        pushUndoBatch(undoBatch);

        setLocalCellValues((current) => {
          const next = { ...current };
          for (const [localKey, value] of Object.entries(localUpdates)) {
            if (value === null) {
              delete next[localKey];
            } else {
              next[localKey] = value;
            }
          }
          return next;
        });

        try {
          for (const entry of undoBatch) {
            const ref: CellRef = {
              dayId: entry.dayId,
              rowIndex: entry.rowIndex,
              colKey: entry.colKey,
            };
            const exercise = getExerciseAt(ref.dayId, ref.rowIndex);
            if (!exercise) continue;
            await applyCellValue(ref.dayId, exercise, ref.colKey, "");
            clearCommittedCellOverrides(
              ref,
              getExerciseAt(ref.dayId, ref.rowIndex),
            );
          }
        } catch {
          undoStackRef.current.pop();
          for (const entry of undoBatch) {
            const ref: CellRef = {
              dayId: entry.dayId,
              rowIndex: entry.rowIndex,
              colKey: entry.colKey,
            };
            const exercise = getExerciseAt(ref.dayId, ref.rowIndex);
            const storageKey = getCellStorageKey(ref, exercise);
            if (entry.previousValue) {
              setLocalCellValue(storageKey, entry.previousValue);
            } else {
              clearLocalCellValue(storageKey);
            }
          }
          throw new Error("Cel leegmaken mislukt");
        }
      })(),
    );

  const handleBulkDelete = () => {
    if (selectedCells.size === 0) return;

    const exerciseIds = new Set<string>();
    selectedCells.forEach((key) => {
      const [dayId, rowIndex] = key.split(":");
      const exercise = getExerciseAt(dayId, Number(rowIndex));
      if (exercise) exerciseIds.add(exercise.id);
    });

    if (exerciseIds.size === 0) return;

    const confirmed = window.confirm(
      exerciseIds.size === 1
        ? "Geselecteerde rij verwijderen?"
        : `${exerciseIds.size} rijen verwijderen?`,
    );
    if (!confirmed) return;
    exerciseIds.forEach((id) => void deleteExercise(id));
    setSelectedCells(new Set());
  };

  const onSelectWeekRef = useRef(onSelectWeek);
  onSelectWeekRef.current = onSelectWeek;

  const keyboardHandlersRef = useRef({
    exitEditMode,
    startEditMode,
    moveActiveCellByArrow,
    clearSelectedCellValues,
    duplicateExerciseRow,
    getExerciseAt,
    undoLastChange,
    setEditDraft,
  });
  keyboardHandlersRef.current = {
    exitEditMode,
    startEditMode,
    moveActiveCellByArrow,
    clearSelectedCellValues,
    duplicateExerciseRow,
    getExerciseAt,
    undoLastChange,
    setEditDraft,
  };

  const isRawEditorKeyboardContext = () =>
    isRawEditorActiveContext(editorRef.current, selectedCellRef.current);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const el = editorRef.current;
      if (!el) return;

      const weekIndex = getAltDigitWeekIndex(event);
      if (weekIndex !== null) {
        const week = sortedWeeksRef.current[weekIndex];
        if (!week) return;
        event.preventDefault();
        event.stopPropagation();
        if (week.id === currentWeekId) return;
        (document.activeElement as HTMLElement | null)?.blur();
        void (async () => {
          await keyboardHandlersRef.current.exitEditMode(true);
          await onSelectWeekRef.current(week.id);
        })();
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey &&
        (selectedCellRef.current || undoStackRef.current.length > 0)
      ) {
        event.preventDefault();
        event.stopPropagation();
        void keyboardHandlersRef.current.undoLastChange();
        return;
      }

      const target = event.target;
      if (!isRawEditorKeyboardContext()) return;

      if (event.key === "F2") {
        event.preventDefault();
        event.stopPropagation();
        const current = selectedCellRef.current;
        if (!current) return;
        void (async () => {
          if (editingCellRef.current) {
            await keyboardHandlersRef.current.exitEditMode(true);
          }
          keyboardHandlersRef.current.startEditMode(current, { preserve: true });
        })();
        return;
      }

      const isEditing = Boolean(editingCellRef.current);
      const typingInField =
        target instanceof HTMLElement &&
        target.closest("input, textarea, select") !== null;

      if (
        (event.metaKey || event.ctrlKey) &&
        event.key.toLowerCase() === "d"
      ) {
        const current = selectedCellRef.current;
        if (!current) return;
        const exercise = keyboardHandlersRef.current.getExerciseAt(
          current.dayId,
          current.rowIndex,
        );
        if (!exercise) return;
        event.preventDefault();
        event.stopPropagation();
        void keyboardHandlersRef.current.duplicateExerciseRow(
          current.dayId,
          exercise.id,
        );
        return;
      }

      if (!isEditing && isPrintableKey(event)) {
        const current = selectedCellRef.current;
        if (!current) return;
        event.preventDefault();
        event.stopPropagation();
        keyboardHandlersRef.current.startEditMode(current, {
          initialChar: event.key,
        });
        return;
      }

      if (isEditing && typingInField) return;

      const current = selectedCellRef.current;
      if (!current) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        event.stopPropagation();
        void keyboardHandlersRef.current.clearSelectedCellValues();
        return;
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowDown" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight"
      ) {
        event.preventDefault();
        event.stopPropagation();
        const direction =
          event.key === "ArrowUp"
            ? "up"
            : event.key === "ArrowDown"
              ? "down"
              : event.key === "ArrowLeft"
                ? "left"
                : "right";
        keyboardHandlersRef.current.moveActiveCellByArrow(
          current,
          direction,
          event.shiftKey,
        );
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  const applyFill = async () => {
    if (!fillDrag) return;
    const sourceExercise = getExerciseAt(
      fillDrag.source.dayId,
      fillDrag.source.rowIndex,
    );
    if (!sourceExercise) {
      setFillDrag(null);
      return;
    }

    const sourceValue = getCellDisplayValue(
      fillDrag.source,
      sourceExercise,
      fillDrag.source.colKey,
    );
    const sourceCol = fillDrag.source.colKey;
    const undoBatch: UndoEntry[] = [];
    const pasteTargets: RawPasteTargetInput[] = [];

    for (
      let row = fillDrag.source.rowIndex + 1;
      row <= fillDrag.targetRow;
      row += 1
    ) {
      const target = getExerciseAt(fillDrag.source.dayId, row);
      if (!target) continue;

      const ref: CellRef = {
        dayId: fillDrag.source.dayId,
        rowIndex: row,
        colKey: sourceCol,
      };
      const previousValue = getCellDisplayValue(ref, target, sourceCol);
      if (previousValue === sourceValue) continue;

      undoBatch.push({
        dayId: ref.dayId,
        rowIndex: ref.rowIndex,
        colKey: sourceCol,
        previousValue,
      });
      pasteTargets.push({
        dayId: ref.dayId,
        rowIndex: ref.rowIndex,
        rowValues: { [sourceCol]: sourceValue },
      });
      setLocalCellValue(getCellStorageKey(ref, target), sourceValue);
    }

    if (undoBatch.length > 0) {
      pushUndoBatch(undoBatch);
      try {
        await applyRawClipboardPaste(pasteTargets);
      } catch {
        undoStackRef.current.pop();
      }
    }

    setFillDrag(null);
  };

  useEffect(() => {
    if (!fillDrag) return;
    const onMove = (event: MouseEvent) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const cell = el?.closest("[data-row-index]") as HTMLElement | null;
      if (!cell) return;
      const rowIndex = Number(cell.dataset.rowIndex);
      if (Number.isFinite(rowIndex)) {
        setFillDrag((current) =>
          current ? { ...current, targetRow: rowIndex } : current,
        );
      }
    };
    const onUp = () => void applyFill();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  });

  const onEditKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    ref: CellRef,
  ) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      setEditDraft(editOriginalRef.current);
      editDraftRef.current = editOriginalRef.current;
      void exitEditMode(false);
      return;
    }

    const arrowDirection = editArrowDirectionFromKey(event.key);
    if (arrowDirection) {
      if (
        (arrowDirection === "left" || arrowDirection === "right") &&
        collapseEditSelectionOnArrow(event, arrowDirection)
      ) {
        return;
      }

      if (shouldLeaveCellOnEditArrow(event, arrowDirection)) {
        event.preventDefault();
        event.stopPropagation();
        void commitEditAndMoveByArrow(ref, arrowDirection);
      }
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      suppressEditBlurRef.current = true;
      void (async () => {
        try {
          await exitEditMode(true);
          moveActiveCell(ref, "enter");
        } finally {
          window.requestAnimationFrame(() => {
            suppressEditBlurRef.current = false;
          });
        }
      })();
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      event.stopPropagation();
      suppressEditBlurRef.current = true;
      void (async () => {
        try {
          await exitEditMode(true);
          moveActiveCell(ref, event.shiftKey ? "shift-tab" : "tab");
        } finally {
          window.requestAnimationFrame(() => {
            suppressEditBlurRef.current = false;
          });
        }
      })();
      return;
    }

    event.stopPropagation();
  };

  const openContextMenu = (
    event: ReactMouseEvent,
    dayId: string,
    rowIndex: number,
    exercise: ProgramExercise | null,
  ) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      dayId,
      rowIndex,
      exerciseId: exercise?.id ?? null,
    });
  };

  const formulaValue = (() => {
    if (editingCell) return editDraft;
    if (!selectedCell) return "";
    const exercise = getExerciseAt(selectedCell.dayId, selectedCell.rowIndex);
    return getCellDisplayValue(selectedCell, exercise, selectedCell.colKey);
  })();

  const handleCellDoubleClick = (ref: CellRef) => {
    void (async () => {
      if (editingCellRef.current) await exitEditMode(true);
      startEditMode(ref, { preserve: true });
    })();
  };

  const renderCellEditor = (
    ref: CellRef,
    day: ProgramDay,
    rowIndex: number,
    colKey: ColKey,
    exercise: ProgramExercise | null,
    placeholder = "",
  ) => {
    const isEditingThis =
      editingCell !== null && cellKey(editingCell) === cellKey(ref);

    const key = cellKey(ref);
    const storageKey = getCellStorageKey(ref, exercise);

    if (colKey === "priority") {
      if (!isEditingThis) {
        const label = getCellDisplayValue(ref, exercise, colKey);
        return (
          <div className="coach-program-raw-cell-display">
            {label
              ? label.charAt(0).toUpperCase() + label.slice(1)
              : "—"}
          </div>
        );
      }
      return (
        <select
          value={editDraft.toLowerCase()}
          className="coach-program-raw-select coach-program-raw-select--priority"
          autoFocus
          onChange={(event) => {
            const next = event.target.value;
            setEditDraft(next);
            editDraftRef.current = next;
            setLocalCellValue(storageKey, next);
          }}
          onBlur={handleEditBlur}
          onKeyDown={(event) => onEditKeyDown(event, ref)}
        >
          <option value="">—</option>
          {priorityOptions.slice(0, 5).map((option) => (
            <option key={option} value={option}>
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </option>
          ))}
        </select>
      );
    }

    if (colKey === "notes") {
      if (!isEditingThis) {
        return (
          <div className="coach-program-raw-cell-display coach-program-raw-cell-display--notes">
            {getCellDisplayValue(ref, exercise, colKey) || placeholder}
          </div>
        );
      }
      return (
        <textarea
          rows={1}
          value={editDraft}
          className="coach-program-raw-textarea"
          autoFocus
          onChange={(event) => {
            const next = event.target.value;
            setEditDraft(next);
            editDraftRef.current = next;
            setLocalCellValue(storageKey, next);
          }}
          onKeyDown={(event) => onEditKeyDown(event, ref)}
          onBlur={handleEditBlur}
        />
      );
    }

    if (!isEditingThis) {
      const display = getCellDisplayValue(ref, exercise, colKey);
      return (
        <div
          className={`coach-program-raw-cell-display ${
            colKey === "name" ? "coach-program-raw-cell-display--name" : ""
          } ${!display && placeholder ? "is-placeholder" : ""}`}
        >
          {display || placeholder}
        </div>
      );
    }

    return (
        <input
          type="text"
          value={editDraft}
          className={`coach-program-raw-input ${
            colKey === "name" ? "coach-program-raw-input--name" : ""
          }`}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          onChange={(event) => {
            const value = event.target.value;
            setEditDraft(value);
            editDraftRef.current = value;
            setLocalCellValue(storageKey, value);
          }}
          onKeyDown={(event) => onEditKeyDown(event, ref)}
          onBlur={handleEditBlur}
        />
    );
  };

  const renderCell = (
    day: ProgramDay,
    rowIndex: number,
    colKey: ColKey,
    exercise: ProgramExercise | null,
  ) => {
    const ref: CellRef = { dayId: day.id, rowIndex, colKey };
    const key = cellKey(ref);
    const isPrimarySelected =
      selectedCell !== null && cellKey(selectedCell) === key;
    const isEditingThis =
      editingCell !== null && cellKey(editingCell) === key;
    const isInMultiSelect = selectedCells.has(key);
    const isFillTarget =
      fillDrag &&
      fillDrag.source.dayId === day.id &&
      rowIndex > fillDrag.source.rowIndex &&
      rowIndex <= fillDrag.targetRow &&
      fillDrag.source.colKey === colKey;

    const placeholder =
      colKey === "name" ? "Nieuwe oefening…" : colKey === "priority" ? "" : "";

    const sbdClass =
      colKey === "name" && exercise ? getRawSbdCellClass(exercise.name) : "";

    const className = [
      "coach-program-raw-cell",
      `coach-program-raw-cell--${colKey}`,
      rowIndex % 2 === 1 ? "is-zebra" : "",
      isInMultiSelect ? "is-selected" : "",
      isPrimarySelected ? "is-primary-selected" : "",
      isEditingThis ? "is-editing" : "",
      isFillTarget ? "is-fill-target" : "",
      colKey === "priority" && exercise
        ? getRawPriorityClass(exercise.priority || "")
        : "",
      sbdClass,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div
        key={key}
        data-cell={key}
        data-row-index={rowIndex}
        data-col-key={colKey}
        data-day-id={day.id}
        className={className}
        onPointerDown={(event) => handleCellPointerDown(event, ref, exercise)}
        onDoubleClick={(event) => {
          event.preventDefault();
          handleCellDoubleClick(ref);
        }}
        onContextMenu={(event) =>
          openContextMenu(event, day.id, rowIndex, exercise)
        }
      >
        {renderCellEditor(ref, day, rowIndex, colKey, exercise, placeholder)}
        {isPrimarySelected && !isEditingThis && colKey !== "notes" ? (
          <button
            type="button"
            className="coach-program-raw-fill-handle"
            aria-label="Vul naar beneden"
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setFillDrag({ source: ref, targetRow: rowIndex });
            }}
          />
        ) : null}
      </div>
    );
  };

  return (
    <div
      ref={editorRef}
      tabIndex={-1}
      className={`coach-program-raw-editor ${
        isDraggingSelect ? "is-drag-selecting" : ""
      } ${
        SHOW_EXERCISE_PRIORITY_UI ? "" : "coach-program-raw-editor--no-priority"
      }`}
    >
      <div className="coach-program-raw-formula-bar" aria-live="polite">
        <span className="coach-program-raw-formula-ref">
          {getCellLabel(selectedCell)}
        </span>
        <span className="coach-program-raw-formula-value">{formulaValue}</span>
        {selectedCells.size > 1 ? (
          <span className="coach-program-raw-selection-count">
            {selectedCells.size} cellen
          </span>
        ) : null}
      </div>

      <div className="coach-program-raw-scroll" ref={gridRef}>
        <div className="coach-program-raw-sheet">
          {days.map((day) => (
            <div key={day.id} className="coach-program-raw-day-block">
              <div className="coach-program-raw-day-title">
                <span className="coach-program-raw-day-name">
                  {day.title.toUpperCase()}
                </span>
                <span className="coach-program-raw-day-date">
                  {getDayDate(day)}
                </span>
              </div>
              <div className="coach-program-raw-col-header coach-program-raw-col-header--row-num">
                #
              </div>
              {visibleColKeys.map((colKey) => (
                <div
                  key={colKey}
                  className={`coach-program-raw-col-header coach-program-raw-col-header--${colKey}`}
                >
                  {COL_LABELS[colKey]}
                </div>
              ))}
              {Array.from({ length: maxRows }, (_, rowIndex) => {
                const exercise = getExerciseAt(day.id, rowIndex);
                return (
                  <div
                    key={rowIndex}
                    className="coach-program-raw-data-row"
                    data-row-index={rowIndex}
                  >
                    <div className="coach-program-raw-row-num">
                      <span>{rowIndex + 1}</span>
                      {exercise ? (
                        <button
                          type="button"
                          className="coach-program-raw-row-dup"
                          title="Dupliceer rij (⌘D)"
                          aria-label="Dupliceer rij"
                          onClick={(event) => {
                            event.stopPropagation();
                            void duplicateExerciseRow(day.id, exercise.id);
                          }}
                        >
                          ⧉
                        </button>
                      ) : null}
                    </div>
                    {visibleColKeys.map((colKey) =>
                      renderCell(day, rowIndex, colKey, exercise),
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {contextMenu ? (
        <div
          className="coach-program-raw-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          role="menu"
        >
          {contextMenu.exerciseId ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                void duplicateExerciseRow(
                  contextMenu.dayId,
                  contextMenu.exerciseId!,
                );
                setContextMenu(null);
              }}
            >
              Dupliceer rij
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void insertExerciseFromRaw(
                contextMenu.dayId,
                {},
                contextMenu.rowIndex - 1,
              );
              setContextMenu(null);
            }}
          >
            Rij invoegen boven
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void insertExerciseFromRaw(
                contextMenu.dayId,
                {},
                contextMenu.exerciseId
                  ? contextMenu.rowIndex
                  : contextMenu.rowIndex - 1,
              );
              setContextMenu(null);
            }}
          >
            Rij invoegen onder
          </button>
          {contextMenu.exerciseId ? (
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                void deleteExercise(contextMenu.exerciseId!);
                setContextMenu(null);
              }}
            >
              Verwijder rij
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const day = days.find((item) => item.id === contextMenu.dayId);
              if (day) void duplicateDay(day);
              setContextMenu(null);
            }}
          >
            Dupliceer dag
          </button>
          {selectedCells.size > 0 ? (
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => {
                void clearSelectedCellValues();
                setContextMenu(null);
              }}
            >
              Cel(len) leegmaken
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export default RawProgramEditor;
