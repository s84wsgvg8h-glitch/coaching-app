"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import CoachExerciseNameInput from "@/components/programs/coach/CoachExerciseNameInput";
import { isEditableKeyboardTarget } from "@/lib/keyboard/isEditableKeyboardTarget";
import { getExerciseLibrarySuggestions } from "@/lib/exerciseLibrarySuggestions";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import {
  getIntensityType,
  getIntensityValue,
} from "@/lib/programWeek/exerciseDisplay";
import type {
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import { priorityOptions } from "@/lib/programWeek/types";

const BLANK_ROWS = 3;
const COL_KEYS = [
  "name",
  "sets",
  "reps",
  "intensity",
  "type",
  "priority",
  "notes",
] as const;

type ColKey = (typeof COL_KEYS)[number];

type CellRef = {
  dayId: string;
  rowIndex: number;
  colKey: ColKey;
};

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
  onSelectWeek: (weekId: string) => void;
  libraryItems: ExerciseLibraryItem[];
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
  updateIntensityType: (
    dayId: string,
    exercise: ProgramExercise,
    type: string,
  ) => void | Promise<void>;
  deleteExercise: (exerciseId: string) => void | Promise<void>;
  duplicateDay: (day: ProgramDay) => void | Promise<void>;
  insertExerciseFromRaw: (
    dayId: string,
    seed?: RawExerciseSeed,
    afterIndex?: number,
  ) => void | Promise<void>;
  duplicateExerciseRow: (
    dayId: string,
    exerciseId: string,
  ) => void | Promise<void>;
};

const COL_LABELS: Record<ColKey, string> = {
  name: "Oefening",
  sets: "Sets",
  reps: "Reps",
  intensity: "Int.",
  type: "Type",
  priority: "Priority",
  notes: "Notes",
};

function cellKey(ref: CellRef) {
  return `${ref.dayId}:${ref.rowIndex}:${ref.colKey}`;
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

export default function RawProgramEditor({
  days,
  exercisesByDay,
  getDayDate,
  blockWeeks,
  currentWeekId,
  onSelectWeek,
  libraryItems,
  updateExerciseLocal,
  saveExerciseField,
  saveExerciseFields,
  saveExercisePriority,
  updateIntensityType,
  deleteExercise,
  duplicateDay,
  insertExerciseFromRaw,
  duplicateExerciseRow,
}: RawProgramEditorProps) {
  const gridRef = useRef<HTMLDivElement>(null);
  const activeCellRef = useRef<CellRef | null>(null);
  const [activeCell, setActiveCell] = useState<CellRef | null>(null);
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
  const [nameSuggestions, setNameSuggestions] = useState<{
    dayId: string;
    rowIndex: number;
    items: ExerciseLibraryItem[];
  } | null>(null);

  useEffect(() => {
    activeCellRef.current = activeCell;
  }, [activeCell]);

  const sortedWeeks = useMemo(
    () => [...blockWeeks].sort((a, b) => a.week_number - b.week_number),
    [blockWeeks],
  );

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
    return maxExercises + BLANK_ROWS;
  }, [days, exercisesByDaySorted]);

  const getExerciseAt = useCallback(
    (dayId: string, rowIndex: number): ProgramExercise | null => {
      const list = exercisesByDaySorted[dayId] || [];
      return list[rowIndex] ?? null;
    },
    [exercisesByDaySorted],
  );

  const getColIndex = (colKey: ColKey) => COL_KEYS.indexOf(colKey);

  const getCellLabel = (ref: CellRef | null) => {
    if (!ref) return "";
    const dayIndex = days.findIndex((day) => day.id === ref.dayId);
    const colIndex = getColIndex(ref.colKey);
    const globalCol = dayIndex * (COL_KEYS.length + 1) + colIndex + 1;
    return `${colLetter(globalCol)}${ref.rowIndex + 1}`;
  };

  const expandSelection = (from: CellRef, to: CellRef) => {
    const dayIds = days.map((day) => day.id);
    const fromDay = dayIds.indexOf(from.dayId);
    const toDay = dayIds.indexOf(to.dayId);
    const minDay = Math.min(fromDay, toDay);
    const maxDay = Math.max(fromDay, toDay);

    const fromCol = getColIndex(from.colKey);
    const toCol = getColIndex(to.colKey);
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
            cellKey({ dayId, rowIndex: r, colKey: COL_KEYS[c] }),
          );
        }
      }
    }
    setSelectedCells(next);
  };

  const focusCell = (ref: CellRef) => {
    setActiveCell(ref);
    activeCellRef.current = ref;
    const selector = `[data-cell="${cellKey(ref)}"] input, [data-cell="${cellKey(ref)}"] select, [data-cell="${cellKey(ref)}"] textarea`;
    window.requestAnimationFrame(() => {
      const el = gridRef.current?.querySelector(selector) as
        | HTMLElement
        | null;
      el?.focus();
    });
  };

  const moveActiveCell = (
    ref: CellRef,
    direction: "enter" | "tab" | "shift-tab",
  ) => {
    const dayIndex = days.findIndex((day) => day.id === ref.dayId);
    const colIndex = getColIndex(ref.colKey);

    if (direction === "enter") {
      const nextRow = Math.min(ref.rowIndex + 1, maxRows - 1);
      const next: CellRef = { ...ref, rowIndex: nextRow };
      setActiveCell(next);
      setAnchorCell(next);
      setSelectedCells(new Set([cellKey(next)]));
      focusCell(next);
      return;
    }

    if (direction === "tab") {
      if (colIndex < COL_KEYS.length - 1) {
        const next: CellRef = { ...ref, colKey: COL_KEYS[colIndex + 1] };
        setActiveCell(next);
        setAnchorCell(next);
        setSelectedCells(new Set([cellKey(next)]));
        focusCell(next);
        return;
      }
      if (dayIndex < days.length - 1) {
        const next: CellRef = {
          dayId: days[dayIndex + 1].id,
          rowIndex: ref.rowIndex,
          colKey: "name",
        };
        setActiveCell(next);
        setAnchorCell(next);
        setSelectedCells(new Set([cellKey(next)]));
        focusCell(next);
      }
      return;
    }

    if (colIndex > 0) {
      const next: CellRef = { ...ref, colKey: COL_KEYS[colIndex - 1] };
      setActiveCell(next);
      setAnchorCell(next);
      setSelectedCells(new Set([cellKey(next)]));
      focusCell(next);
      return;
    }
    if (dayIndex > 0) {
      const next: CellRef = {
        dayId: days[dayIndex - 1].id,
        rowIndex: ref.rowIndex,
        colKey: "notes",
      };
      setActiveCell(next);
      setAnchorCell(next);
      setSelectedCells(new Set([cellKey(next)]));
      focusCell(next);
    }
  };

  const handleCellMouseDown = (
    event: ReactMouseEvent,
    ref: CellRef,
    exercise: ProgramExercise | null,
  ) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest("input, textarea, select, button")) {
      return;
    }

    event.preventDefault();

    if (event.shiftKey && anchorCell) {
      expandSelection(anchorCell, ref);
      setActiveCell(ref);
      return;
    }

    setActiveCell(ref);
    setAnchorCell(ref);
    setSelectedCells(new Set([cellKey(ref)]));
    setIsDraggingSelect(true);

    if (!exercise && ref.colKey === "name") {
      setNameSuggestions(null);
    }
  };

  const handleCellMouseEnter = (ref: CellRef) => {
    if (!isDraggingSelect || !anchorCell) return;
    expandSelection(anchorCell, ref);
    setActiveCell(ref);
  };

  useEffect(() => {
    const stopDrag = () => setIsDraggingSelect(false);
    window.addEventListener("mouseup", stopDrag);
    return () => window.removeEventListener("mouseup", stopDrag);
  }, []);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("scroll", closeMenu, true);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("scroll", closeMenu, true);
    };
  }, []);

  const saveIntensity = (
    dayId: string,
    exercise: ProgramExercise,
    type: string,
    value: string,
  ) => {
    const clean = value.trim();
    if (type === "rpe") {
      void saveExerciseFields(exercise.id, { rpe: clean, load: "" });
      updateExerciseLocal(dayId, exercise.id, "rpe", clean);
      updateExerciseLocal(dayId, exercise.id, "load", "");
      return;
    }
    if (type === "%" || type === "kg") {
      const load = clean ? `${clean}${type}` : "";
      void saveExerciseFields(exercise.id, { load, rpe: "" });
      updateExerciseLocal(dayId, exercise.id, "load", load);
      updateExerciseLocal(dayId, exercise.id, "rpe", "");
      return;
    }
    void saveExerciseFields(exercise.id, { load: "", rpe: "" });
    updateExerciseLocal(dayId, exercise.id, "load", "");
    updateExerciseLocal(dayId, exercise.id, "rpe", "");
  };

  const commitBlankName = async (dayId: string, rowIndex: number, name: string) => {
    const clean = name.trim();
    if (!clean) return;
    await insertExerciseFromRaw(dayId, { name: clean });
  };

  const handlePaste = useCallback(
    async (event: ClipboardEvent) => {
      const currentActive = activeCellRef.current;
      if (!currentActive) return;
      const target = event.target as HTMLElement;
      if (!gridRef.current?.contains(target)) return;

      const text = event.clipboardData?.getData("text/plain");
      if (!text) return;

      event.preventDefault();
      const rows = text.split(/\r?\n/).filter((row) => row.length > 0);
      const startDayIndex = days.findIndex(
        (day) => day.id === currentActive.dayId,
      );
      const startCol = getColIndex(currentActive.colKey);

      for (let rowOffset = 0; rowOffset < rows.length; rowOffset += 1) {
        const values = rows[rowOffset].split("\t");
        const rowIndex = currentActive.rowIndex + rowOffset;
        if (rowIndex >= maxRows) break;

        for (let colOffset = 0; colOffset < values.length; colOffset += 1) {
          const colKey = COL_KEYS[startCol + colOffset];
          if (!colKey) break;

          const day = days[startDayIndex];
          if (!day) break;

          const value = values[colOffset].trim();
          const exercise = getExerciseAt(day.id, rowIndex);

          if (!exercise) {
            if (colKey === "name" && value) {
              await insertExerciseFromRaw(day.id, { name: value });
            }
            continue;
          }

          if (colKey === "name") {
            updateExerciseLocal(day.id, exercise.id, "name", value);
            void saveExerciseField(exercise.id, "name", value);
          } else if (colKey === "sets") {
            updateExerciseLocal(day.id, exercise.id, "sets", value);
            void saveExerciseField(exercise.id, "sets", value);
          } else if (colKey === "reps") {
            updateExerciseLocal(day.id, exercise.id, "reps", value);
            void saveExerciseField(exercise.id, "reps", value);
          } else if (colKey === "notes") {
            updateExerciseLocal(day.id, exercise.id, "notes", value);
            void saveExerciseField(exercise.id, "notes", value);
          } else if (colKey === "priority") {
            void saveExercisePriority(exercise.id, value.toLowerCase());
          } else if (colKey === "type") {
            void updateIntensityType(day.id, exercise, value || "-");
          } else if (colKey === "intensity") {
            saveIntensity(day.id, exercise, getIntensityType(exercise), value);
          }
        }
      }
    },
    [
      days,
      maxRows,
      getExerciseAt,
      insertExerciseFromRaw,
      updateExerciseLocal,
      saveExerciseField,
      saveExercisePriority,
      updateIntensityType,
    ],
  );

  useEffect(() => {
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleBulkDelete = () => {
    if (selectedCells.size === 0) return;

    const exerciseIds = new Set<string>();
    selectedCells.forEach((key) => {
      const [dayId, rowIndex] = key.split(":");
      const exercise = getExerciseAt(dayId, Number(rowIndex));
      if (exercise) exerciseIds.add(exercise.id);
    });

    if (exerciseIds.size > 0) {
      const confirmed = window.confirm(
        exerciseIds.size === 1
          ? "Geselecteerde rij verwijderen?"
          : `${exerciseIds.size} rijen verwijderen?`,
      );
      if (!confirmed) return;
      exerciseIds.forEach((id) => void deleteExercise(id));
      setSelectedCells(new Set());
      return;
    }

    selectedCells.forEach((key) => {
      const [dayId, rowIndex, colKey] = key.split(":") as [
        string,
        string,
        ColKey,
      ];
      const exercise = getExerciseAt(dayId, Number(rowIndex));
      if (!exercise) return;

      if (colKey === "name") {
        updateExerciseLocal(dayId, exercise.id, "name", "");
        void saveExerciseField(exercise.id, "name", "");
      } else if (colKey === "sets") {
        updateExerciseLocal(dayId, exercise.id, "sets", "");
        void saveExerciseField(exercise.id, "sets", "");
      } else if (colKey === "reps") {
        updateExerciseLocal(dayId, exercise.id, "reps", "");
        void saveExerciseField(exercise.id, "reps", "");
      } else if (colKey === "notes") {
        updateExerciseLocal(dayId, exercise.id, "notes", "");
        void saveExerciseField(exercise.id, "notes", "");
      } else if (colKey === "priority") {
        void saveExercisePriority(exercise.id, "");
      } else if (colKey === "intensity" || colKey === "type") {
        saveIntensity(dayId, exercise, "-", "");
      }
    });
    setSelectedCells(new Set());
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target)) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleBulkDelete();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const applyFill = () => {
    if (!fillDrag) return;
    const exercise = getExerciseAt(fillDrag.source.dayId, fillDrag.source.rowIndex);
    if (!exercise) {
      setFillDrag(null);
      return;
    }

    const sourceCol = fillDrag.source.colKey;
    const sourceValue = (() => {
      if (sourceCol === "name") return exercise.name;
      if (sourceCol === "sets") return exercise.sets || "";
      if (sourceCol === "reps") return exercise.reps || "";
      if (sourceCol === "notes") return exercise.notes || "";
      if (sourceCol === "priority") return exercise.priority || "";
      if (sourceCol === "intensity") return getIntensityValue(exercise);
      if (sourceCol === "type") return getIntensityType(exercise);
      return "";
    })();

    for (
      let row = fillDrag.source.rowIndex + 1;
      row <= fillDrag.targetRow;
      row += 1
    ) {
      const target = getExerciseAt(fillDrag.source.dayId, row);
      if (!target) continue;

      if (sourceCol === "name") {
        updateExerciseLocal(fillDrag.source.dayId, target.id, "name", sourceValue);
        void saveExerciseField(target.id, "name", sourceValue);
      } else if (sourceCol === "sets") {
        updateExerciseLocal(fillDrag.source.dayId, target.id, "sets", sourceValue);
        void saveExerciseField(target.id, "sets", sourceValue);
      } else if (sourceCol === "reps") {
        updateExerciseLocal(fillDrag.source.dayId, target.id, "reps", sourceValue);
        void saveExerciseField(target.id, "reps", sourceValue);
      } else if (sourceCol === "notes") {
        updateExerciseLocal(fillDrag.source.dayId, target.id, "notes", sourceValue);
        void saveExerciseField(target.id, "notes", sourceValue);
      } else if (sourceCol === "priority") {
        void saveExercisePriority(target.id, sourceValue);
      } else if (sourceCol === "intensity") {
        saveIntensity(
          fillDrag.source.dayId,
          target,
          getIntensityType(target),
          sourceValue,
        );
      } else if (sourceCol === "type") {
        void updateIntensityType(fillDrag.source.dayId, target, sourceValue);
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
    const onUp = () => applyFill();
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  });

  const onCellKeyDown = (
    event: ReactKeyboardEvent<HTMLElement>,
    ref: CellRef,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      (event.target as HTMLElement).blur();
      moveActiveCell(ref, "enter");
    } else if (event.key === "Tab") {
      event.preventDefault();
      (event.target as HTMLElement).blur();
      moveActiveCell(ref, event.shiftKey ? "shift-tab" : "tab");
    }
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
    if (!activeCell) return "";
    const exercise = getExerciseAt(activeCell.dayId, activeCell.rowIndex);
    if (!exercise) return "";
    if (activeCell.colKey === "name") return exercise.name;
    if (activeCell.colKey === "sets") return exercise.sets || "";
    if (activeCell.colKey === "reps") return exercise.reps || "";
    if (activeCell.colKey === "notes") return exercise.notes || "";
    if (activeCell.colKey === "priority") return exercise.priority || "";
    if (activeCell.colKey === "intensity") return getIntensityValue(exercise);
    if (activeCell.colKey === "type") return getIntensityType(exercise);
    return "";
  })();

  const renderCell = (
    day: ProgramDay,
    rowIndex: number,
    colKey: ColKey,
    exercise: ProgramExercise | null,
  ) => {
    const ref: CellRef = { dayId: day.id, rowIndex, colKey };
    const key = cellKey(ref);
    const isActive = activeCell && cellKey(activeCell) === key;
    const isSelected = selectedCells.has(key);
    const isFillTarget =
      fillDrag &&
      fillDrag.source.dayId === day.id &&
      rowIndex > fillDrag.source.rowIndex &&
      rowIndex <= fillDrag.targetRow &&
      fillDrag.source.colKey === colKey;

    const className = [
      "coach-program-raw-cell",
      `coach-program-raw-cell--${colKey}`,
      rowIndex % 2 === 1 ? "is-zebra" : "",
      isSelected ? "is-selected" : "",
      isActive ? "is-active" : "",
      isFillTarget ? "is-fill-target" : "",
      colKey === "priority" && exercise
        ? getRawPriorityClass(exercise.priority || "")
        : "",
    ]
      .filter(Boolean)
      .join(" ");

    const commonKeyHandlers = {
      onKeyDown: (event: ReactKeyboardEvent<HTMLElement>) =>
        onCellKeyDown(event, ref),
    };

    if (!exercise) {
      if (colKey === "name") {
        return (
          <div
            key={key}
            data-cell={key}
            data-row-index={rowIndex}
            className={className}
            onMouseDown={(event) => handleCellMouseDown(event, ref, null)}
            onMouseEnter={() => handleCellMouseEnter(ref)}
            onContextMenu={(event) =>
              openContextMenu(event, day.id, rowIndex, null)
            }
          >
            <input
              type="text"
              placeholder="Nieuwe oefening…"
              className="coach-program-raw-input"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              onMouseDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                event.stopPropagation();
                onCellKeyDown(event, ref);
              }}
              onBlur={(event) => {
                void commitBlankName(day.id, rowIndex, event.currentTarget.value);
                event.currentTarget.value = "";
                setNameSuggestions(null);
              }}
              onChange={(event) => {
                const value = event.currentTarget.value;
                if (!value.trim()) {
                  setNameSuggestions(null);
                  return;
                }
                const items = getExerciseLibrarySuggestions(value, libraryItems, {
                  limit: 6,
                });
                setNameSuggestions({ dayId: day.id, rowIndex, items });
              }}
            />
            {nameSuggestions &&
            nameSuggestions.dayId === day.id &&
            nameSuggestions.rowIndex === rowIndex &&
            nameSuggestions.items.length > 0 ? (
              <ul className="coach-program-raw-suggestions" role="listbox">
                {nameSuggestions.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="coach-program-raw-suggestion-btn"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        void commitBlankName(day.id, rowIndex, item.name);
                        setNameSuggestions(null);
                      }}
                    >
                      {item.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      }

      return (
        <div
          key={key}
          data-cell={key}
          data-row-index={rowIndex}
          className={`${className} is-blank`}
          onMouseDown={(event) => handleCellMouseDown(event, ref, null)}
          onMouseEnter={() => handleCellMouseEnter(ref)}
          onContextMenu={(event) =>
            openContextMenu(event, day.id, rowIndex, null)
          }
        />
      );
    }

    if (colKey === "name") {
      return (
        <div
          key={key}
          data-cell={key}
          data-row-index={rowIndex}
          className={className}
          onMouseDown={(event) => handleCellMouseDown(event, ref, exercise)}
          onMouseEnter={() => handleCellMouseEnter(ref)}
          onContextMenu={(event) =>
            openContextMenu(event, day.id, rowIndex, exercise)
          }
        >
          <CoachExerciseNameInput
            exerciseId={exercise.id}
            initialName={exercise.name}
            className="coach-program-raw-input coach-program-raw-input--name"
            onCommit={(value) => {
              updateExerciseLocal(day.id, exercise.id, "name", value);
              void saveExerciseField(exercise.id, "name", value);
              setNameSuggestions(null);
            }}
          />
          {isActive ? (
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
    }

    if (colKey === "type") {
      const typeValue = getIntensityType(exercise);
      return (
        <div
          key={key}
          data-cell={key}
          data-row-index={rowIndex}
          className={className}
          onMouseDown={(event) => handleCellMouseDown(event, ref, exercise)}
          onMouseEnter={() => handleCellMouseEnter(ref)}
          onContextMenu={(event) =>
            openContextMenu(event, day.id, rowIndex, exercise)
          }
        >
          <select
            value={typeValue}
            className="coach-program-raw-select"
            onChange={(event) => {
              void updateIntensityType(day.id, exercise, event.target.value);
            }}
            {...commonKeyHandlers}
          >
            <option value="%">%</option>
            <option value="rpe">RPE</option>
            <option value="kg">kg</option>
            <option value="-">-</option>
          </select>
          {isActive ? (
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
    }

    if (colKey === "priority") {
      return (
        <div
          key={key}
          data-cell={key}
          data-row-index={rowIndex}
          className={className}
          onMouseDown={(event) => handleCellMouseDown(event, ref, exercise)}
          onMouseEnter={() => handleCellMouseEnter(ref)}
          onContextMenu={(event) =>
            openContextMenu(event, day.id, rowIndex, exercise)
          }
        >
          <select
            value={(exercise.priority || "").toLowerCase()}
            className="coach-program-raw-select coach-program-raw-select--priority"
            onChange={(event) => {
              void saveExercisePriority(exercise.id, event.target.value);
            }}
            {...commonKeyHandlers}
          >
            <option value="">—</option>
            {priorityOptions.slice(0, 5).map((option) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
      );
    }

    const fieldValue =
      colKey === "intensity"
        ? getIntensityValue(exercise)
        : colKey === "sets"
          ? exercise.sets || ""
          : colKey === "reps"
            ? exercise.reps || ""
            : exercise.notes || "";

    return (
      <div
        key={key}
        data-cell={key}
        data-row-index={rowIndex}
        className={className}
        onMouseDown={(event) => handleCellMouseDown(event, ref, exercise)}
        onMouseEnter={() => handleCellMouseEnter(ref)}
        onContextMenu={(event) =>
          openContextMenu(event, day.id, rowIndex, exercise)
        }
      >
        {colKey === "notes" ? (
          <textarea
            defaultValue={fieldValue}
            key={`${exercise.id}-notes`}
            rows={1}
            className="coach-program-raw-textarea"
            onBlur={(event) => {
              updateExerciseLocal(day.id, exercise.id, "notes", event.target.value);
              void saveExerciseField(exercise.id, "notes", event.target.value);
            }}
            {...commonKeyHandlers}
          />
        ) : (
          <input
            type="text"
            defaultValue={fieldValue}
            key={`${exercise.id}-${colKey}`}
            className="coach-program-raw-input"
            onBlur={(event) => {
              const value = event.target.value;
              if (colKey === "intensity") {
                saveIntensity(day.id, exercise, getIntensityType(exercise), value);
                return;
              }
              updateExerciseLocal(day.id, exercise.id, colKey, value);
              void saveExerciseField(exercise.id, colKey, value);
            }}
            {...commonKeyHandlers}
          />
        )}
        {isActive && colKey !== "notes" ? (
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
    <div className="coach-program-raw-editor">
      <div className="coach-program-raw-formula-bar" aria-live="polite">
        <span className="coach-program-raw-formula-ref">
          {getCellLabel(activeCell)}
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
          <div className="coach-program-raw-day-headers">
            {days.map((day) => (
              <div key={day.id} className="coach-program-raw-day-group">
                <div className="coach-program-raw-day-title">
                  <span className="coach-program-raw-day-name">
                    {day.title.toUpperCase()}
                  </span>
                  <span className="coach-program-raw-day-date">
                    {getDayDate(day)}
                  </span>
                </div>
                <div className="coach-program-raw-col-header-row">
                  <div className="coach-program-raw-col-header coach-program-raw-col-header--row-num">
                    #
                  </div>
                  {COL_KEYS.map((colKey) => (
                    <div
                      key={colKey}
                      className={`coach-program-raw-col-header coach-program-raw-col-header--${colKey}`}
                    >
                      {COL_LABELS[colKey]}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="coach-program-raw-body">
            {Array.from({ length: maxRows }, (_, rowIndex) => (
              <div key={rowIndex} className="coach-program-raw-data-row">
                {days.map((day) => {
                  const exercise = getExerciseAt(day.id, rowIndex);
                  return (
                    <div key={day.id} className="coach-program-raw-day-group">
                      <div className="coach-program-raw-row-num">{rowIndex + 1}</div>
                      {COL_KEYS.map((colKey) =>
                        renderCell(day, rowIndex, colKey, exercise),
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {sortedWeeks.length > 0 ? (
        <div className="coach-program-raw-week-tabs">
          {sortedWeeks.map((week) => (
            <button
              key={week.id}
              type="button"
              className={`coach-program-raw-week-tab ${
                week.id === currentWeekId ? "is-active" : ""
              }`}
              onClick={() => onSelectWeek(week.id)}
            >
              {week.title}
            </button>
          ))}
        </div>
      ) : null}

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
                handleBulkDelete();
                setContextMenu(null);
              }}
            >
              Verwijder selectie
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
