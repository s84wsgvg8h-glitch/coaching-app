"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type {
  ProgramBlock,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import {
  buildCoachProgressionRows,
  DEFAULT_PROGRESSION_CELL_DISPLAY,
  formatCoachProgressionCellText,
  formatCoachProgressionCellTextForEdit,
  getProgressionExerciseColorClass,
  parseCoachProgressionEditText,
  buildCoachProgressionClearUpdates,
  type BlockProgressionSnapshot,
  type CoachProgressionRow,
  type ProgressionCellDisplay,
} from "@/lib/programWeek/progressionView";
import { isPrintableKey } from "@/lib/programWeek/rawSpreadsheetCell";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

const DISPLAY_STORAGE_KEY = "coach-progression-cell-display";

type CoachProgramProgressionViewProps = {
  block: ProgramBlock | null;
  athleteName?: string;
  snapshot: BlockProgressionSnapshot | null;
  loading: boolean;
  onSaveCell: (
    exerciseId: string,
    updates: { load: string; reps: string; rpe: string },
  ) => void | Promise<void>;
};

type ProgressionCellRef = {
  rowIndex: number;
  weekIndex: number;
};

type EditArrowDirection = "up" | "down" | "left" | "right";

function progressionCellKey(ref: ProgressionCellRef) {
  return `${ref.rowIndex}:${ref.weekIndex}`;
}

function editArrowDirectionFromKey(key: string): EditArrowDirection | null {
  if (key === "ArrowUp") return "up";
  if (key === "ArrowDown") return "down";
  if (key === "ArrowLeft") return "left";
  if (key === "ArrowRight") return "right";
  return null;
}

function shouldLeaveCellOnEditArrow(
  event: ReactKeyboardEvent<HTMLElement>,
  direction: EditArrowDirection,
) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLTextAreaElement)) return true;

  const start = target.selectionStart ?? 0;
  const end = target.selectionEnd ?? 0;
  const length = target.value.length;

  if (direction === "up" || direction === "down") {
    return true;
  }

  if (start !== end) {
    if (start === 0 && end === length) return true;
    return false;
  }

  if (direction === "left") return start === 0;
  return end === length;
}

function collapseEditSelectionOnArrow(
  event: ReactKeyboardEvent<HTMLElement>,
  direction: "left" | "right",
) {
  const target = event.currentTarget;
  if (!(target instanceof HTMLTextAreaElement)) return false;

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

function loadDisplayPrefs(): ProgressionCellDisplay {
  if (typeof window === "undefined") {
    return DEFAULT_PROGRESSION_CELL_DISPLAY;
  }

  try {
    const raw = window.localStorage.getItem(DISPLAY_STORAGE_KEY);
    if (!raw) return DEFAULT_PROGRESSION_CELL_DISPLAY;
    const parsed = JSON.parse(raw) as Partial<ProgressionCellDisplay>;
    return {
      showLoad: parsed.showLoad ?? true,
      showReps: parsed.showReps ?? true,
      showRpe: parsed.showRpe ?? true,
    };
  } catch {
    return DEFAULT_PROGRESSION_CELL_DISPLAY;
  }
}

function DisplayToggle({
  label,
  checked,
  onChange,
  accentClass,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  accentClass?: string;
}) {
  return (
    <label
      className={`coach-program-progression-toggle ${accentClass || ""} ${
        checked ? "is-active" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="sr-only"
      />
      <span className="coach-program-progression-toggle-box" aria-hidden="true">
        {checked ? "✓" : ""}
      </span>
      <span>{label}</span>
    </label>
  );
}

export default function CoachProgramProgressionView({
  block,
  athleteName,
  snapshot,
  loading,
  onSaveCell,
}: CoachProgramProgressionViewProps) {
  const [activeCell, setActiveCell] = useState<ProgressionCellRef | null>(null);
  const [editingExercise, setEditingExercise] = useState<ProgramExercise | null>(
    null,
  );
  const [draft, setDraft] = useState("");
  const [editPreserveMode, setEditPreserveMode] = useState(false);
  const [cellDisplay, setCellDisplay] =
    useState<ProgressionCellDisplay>(DEFAULT_PROGRESSION_CELL_DISPLAY);

  const progressionRef = useRef<HTMLDivElement | null>(null);
  const editInputRef = useRef<HTMLTextAreaElement | null>(null);
  const activeCellRef = useRef<ProgressionCellRef | null>(null);
  const editingExerciseRef = useRef<ProgramExercise | null>(null);
  const draftRef = useRef("");
  const cellDisplayRef = useRef(cellDisplay);
  const rowsRef = useRef<CoachProgressionRow[]>([]);
  const weeksRef = useRef<ProgramWeek[]>([]);
  const suppressEditBlurRef = useRef(false);
  const onSaveCellRef = useRef(onSaveCell);

  const rows = useMemo(
    () => (snapshot ? buildCoachProgressionRows(snapshot) : []),
    [snapshot],
  );

  const weeks = snapshot?.weeks || [];

  useEffect(() => {
    activeCellRef.current = activeCell;
  }, [activeCell]);

  useEffect(() => {
    editingExerciseRef.current = editingExercise;
  }, [editingExercise]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    cellDisplayRef.current = cellDisplay;
  }, [cellDisplay]);

  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useEffect(() => {
    weeksRef.current = weeks;
  }, [weeks]);

  useEffect(() => {
    onSaveCellRef.current = onSaveCell;
  }, [onSaveCell]);

  useLayoutEffect(() => {
    if (!editingExercise) return;
    const input = editInputRef.current;
    if (!input) return;
    input.focus();
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }, [editingExercise?.id, editPreserveMode]);

  useEffect(() => {
    deferEffectUpdate(() => {
      setCellDisplay(loadDisplayPrefs());
    });
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      DISPLAY_STORAGE_KEY,
      JSON.stringify(cellDisplay),
    );
  }, [cellDisplay]);

  function getExerciseAt(ref: ProgressionCellRef): ProgramExercise | null {
    const week = weeksRef.current[ref.weekIndex];
    const row = rowsRef.current[ref.rowIndex];
    if (!week || !row) return null;
    return row.cells[week.id] ?? null;
  }

  function selectCell(ref: ProgressionCellRef) {
    setActiveCell(ref);
    activeCellRef.current = ref;
  }

  function startEdit(
    ref: ProgressionCellRef,
    options?: { preserve?: boolean; initialChar?: string },
  ) {
    const exercise = getExerciseAt(ref);
    if (!exercise) return;

    const preserve = options?.preserve ?? false;
    const nextDraft = preserve
      ? formatCoachProgressionCellTextForEdit(exercise, cellDisplayRef.current)
      : options?.initialChar ?? "";

    selectCell(ref);
    setEditPreserveMode(preserve);
    setEditingExercise(exercise);
    editingExerciseRef.current = exercise;
    setDraft(nextDraft);
    draftRef.current = nextDraft;
  }

  async function clearActiveCell(exercise: ProgramExercise) {
    if (editingExerciseRef.current) {
      cancelEdit();
    }

    const updates = buildCoachProgressionClearUpdates(
      exercise,
      cellDisplayRef.current,
    );
    await onSaveCellRef.current(exercise.id, updates);
  }

  async function commitEdit() {
    const exercise = editingExerciseRef.current;
    if (!exercise) return;

    const parsed = parseCoachProgressionEditText(
      draftRef.current,
      cellDisplayRef.current,
      exercise,
    );
    const exerciseId = exercise.id;

    setEditingExercise(null);
    editingExerciseRef.current = null;
    setDraft("");
    draftRef.current = "";
    setEditPreserveMode(false);

    if (!parsed) return;
    await onSaveCellRef.current(exerciseId, parsed);
  }

  function cancelEdit() {
    suppressEditBlurRef.current = true;
    setEditingExercise(null);
    editingExerciseRef.current = null;
    setDraft("");
    draftRef.current = "";
    setEditPreserveMode(false);
    window.requestAnimationFrame(() => {
      suppressEditBlurRef.current = false;
    });
  }

  function handleEditBlur() {
    if (suppressEditBlurRef.current) return;
    void commitEdit();
  }

  function moveActiveCellByArrow(
    from: ProgressionCellRef,
    direction: EditArrowDirection,
  ) {
    const rowCount = rowsRef.current.length;
    const weekCount = weeksRef.current.length;
    if (rowCount === 0 || weekCount === 0) return;

    let rowIndex = from.rowIndex;
    let weekIndex = from.weekIndex;

    if (direction === "up") {
      rowIndex = Math.max(0, rowIndex - 1);
    } else if (direction === "down") {
      rowIndex = Math.min(rowCount - 1, rowIndex + 1);
    } else if (direction === "left") {
      weekIndex = Math.max(0, weekIndex - 1);
    } else if (direction === "right") {
      weekIndex = Math.min(weekCount - 1, weekIndex + 1);
    }

    selectCell({ rowIndex, weekIndex });
  }

  async function commitEditAndMoveByArrow(
    from: ProgressionCellRef,
    direction: EditArrowDirection,
    options?: { enterEditOnNext?: boolean },
  ) {
    suppressEditBlurRef.current = true;
    try {
      await commitEdit();
      moveActiveCellByArrow(from, direction);
      const next = activeCellRef.current;
      if (next && options?.enterEditOnNext !== false) {
        const exercise = getExerciseAt(next);
        if (exercise) {
          startEdit(next, { preserve: true });
        }
      }
    } finally {
      window.requestAnimationFrame(() => {
        suppressEditBlurRef.current = false;
      });
    }
  }

  function isProgressionKeyboardContext() {
    const root = progressionRef.current;
    if (!root) return false;
    if (!activeCellRef.current && !editingExerciseRef.current) return false;

    const target = document.activeElement;
    if (target instanceof HTMLElement && root.contains(target)) return true;

    return Boolean(activeCellRef.current && !editingExerciseRef.current);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!isProgressionKeyboardContext()) return;

      const target = event.target;
      const typingInField =
        target instanceof HTMLElement &&
        target.closest("input, textarea, select") !== null;

      if (typingInField) return;

      if (event.key === "F2") {
        event.preventDefault();
        event.stopPropagation();
        const current = activeCellRef.current;
        if (!current) return;
        const exercise = getExerciseAt(current);
        if (!exercise) return;
        void (async () => {
          if (editingExerciseRef.current) {
            await commitEdit();
          }
          startEdit(current, { preserve: true });
        })();
        return;
      }

      const isEditing = Boolean(editingExerciseRef.current);

      if (!isEditing && isPrintableKey(event)) {
        const current = activeCellRef.current;
        if (!current) return;
        const exercise = getExerciseAt(current);
        if (!exercise) return;
        event.preventDefault();
        event.stopPropagation();
        startEdit(current, { initialChar: event.key });
        return;
      }

      if (isEditing && typingInField) return;

      const current = activeCellRef.current;
      if (!current) return;

      if (
        (event.key === "Delete" || event.key === "Backspace") &&
        !isEditing
      ) {
        const exercise = getExerciseAt(current);
        if (!exercise) return;
        event.preventDefault();
        event.stopPropagation();
        void clearActiveCell(exercise);
        return;
      }

      const arrowDirection = editArrowDirectionFromKey(event.key);
      if (arrowDirection) {
        event.preventDefault();
        event.stopPropagation();
        moveActiveCellByArrow(current, arrowDirection);
        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        event.stopPropagation();
        moveActiveCellByArrow(current, "down");
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () =>
      window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, []);

  function onEditKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
    ref: ProgressionCellRef,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cancelEdit();
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
          await commitEdit();
        } finally {
          window.requestAnimationFrame(() => {
            suppressEditBlurRef.current = false;
          });
        }
      })();
    }
  }

  function updateDisplay(patch: Partial<ProgressionCellDisplay>) {
    setCellDisplay((current) => {
      const next = { ...current, ...patch };
      if (!next.showLoad && !next.showReps && !next.showRpe) {
        return current;
      }
      return next;
    });
  }

  function handleCellPointerDown(
    ref: ProgressionCellRef,
    exercise: ProgramExercise | null,
  ) {
    if (
      editingExerciseRef.current &&
      editingExerciseRef.current.id !== exercise?.id
    ) {
      void commitEdit();
    }

    selectCell(ref);
  }

  if (loading) {
    return (
      <div className="coach-program-progression-loading rounded-2xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
        Progression laden…
      </div>
    );
  }

  if (!block) {
    return (
      <div className="coach-program-progression-empty rounded-2xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
        Geen block geselecteerd.
      </div>
    );
  }

  return (
    <div ref={progressionRef} className="coach-program-progression min-w-0">
      <div className="coach-program-progression-header">
        <h2 className="coach-program-progression-title">
          {block.title || "Block"}
        </h2>
        <p className="coach-program-progression-subtitle">
          {athleteName || "Atleet"}
          {block.start_date
            ? ` · start ${new Date(block.start_date).toLocaleDateString("nl-NL")}`
            : ""}
        </p>
        <p className="coach-program-progression-hint">
          Vul per week in hoe je wilt progresseren. Selecteer een cel en typ
          direct om te vervangen (zoals Excel), of dubbelklik / F2 om te
          bewerken. Delete wist de geselecteerde cel. Pijltjestoetsen
          navigeren tussen cellen.
        </p>

        <div className="coach-program-progression-display-toggles">
          <span className="coach-program-progression-display-label">
            Toon in cellen:
          </span>
          <DisplayToggle
            label="Load"
            checked={cellDisplay.showLoad}
            onChange={(checked) => updateDisplay({ showLoad: checked })}
            accentClass="is-load"
          />
          <DisplayToggle
            label="Reps"
            checked={cellDisplay.showReps}
            onChange={(checked) => updateDisplay({ showReps: checked })}
            accentClass="is-reps"
          />
          <DisplayToggle
            label="Intensity"
            checked={cellDisplay.showRpe}
            onChange={(checked) => updateDisplay({ showRpe: checked })}
            accentClass="is-rpe"
          />
        </div>
      </div>

      {weeks.length === 0 || rows.length === 0 ? (
        <div className="coach-program-progression-empty rounded-2xl border border-app-border bg-app-surface p-8 text-center text-sm text-app-muted">
          Geen oefeningen gevonden in dit block.
        </div>
      ) : (
        <div className="coach-program-progression-table-wrap">
          <div
            className="coach-program-progression-grid"
            style={{
              gridTemplateColumns: `minmax(220px, 280px) repeat(${weeks.length}, minmax(160px, 1fr))`,
            }}
          >
            <div className="coach-program-progression-head coach-program-progression-head--sticky-left">
              Oefening
            </div>
            {weeks.map((week) => (
              <div key={week.id} className="coach-program-progression-head">
                {week.title || `Week ${week.week_number}`}
              </div>
            ))}

            {rows.map((row, rowIndex) => {
              const sbdClass = getProgressionExerciseColorClass(row.baseName);

              return (
                <div key={row.key} className="contents">
                  <div
                    className={`coach-program-progression-exercise coach-program-progression-exercise--sticky-left ${sbdClass} ${
                      rowIndex % 2 === 0 ? "is-even" : "is-odd"
                    }`}
                  >
                    <span className="coach-program-progression-exercise-day">
                      {row.name.split(" ")[0]}
                    </span>{" "}
                    {row.name.split(" ").slice(1).join(" ")}
                  </div>

                  {weeks.map((week, weekIndex) => {
                    const exercise = row.cells[week.id] || null;
                    const cellRef: ProgressionCellRef = { rowIndex, weekIndex };
                    const cellKey = `${row.key}-${week.id}`;
                    const displayValue = formatCoachProgressionCellText(
                      exercise,
                      cellDisplay,
                    );
                    const isSelected =
                      activeCell !== null &&
                      progressionCellKey(activeCell) ===
                        progressionCellKey(cellRef);
                    const isEditing =
                      exercise && editingExercise?.id === exercise.id;

                    return (
                      <div
                        key={cellKey}
                        data-cell={progressionCellKey(cellRef)}
                        className={`coach-program-progression-cell ${sbdClass} ${
                          rowIndex % 2 === 0 ? "is-even" : "is-odd"
                        } ${exercise ? "is-editable" : "is-empty"} ${
                          isSelected && !isEditing ? "is-selected" : ""
                        } ${isEditing ? "is-editing" : ""}`}
                      >
                        {exercise ? (
                          isEditing ? (
                            <textarea
                              ref={editInputRef}
                              value={draft}
                              onChange={(event) => {
                                const next = event.target.value;
                                setDraft(next);
                                draftRef.current = next;
                              }}
                              onFocus={(event) => {
                                if (!editPreserveMode) return;
                                const input = event.currentTarget;
                                const length = input.value.length;
                                requestAnimationFrame(() => {
                                  input.setSelectionRange(length, length);
                                });
                              }}
                              onBlur={handleEditBlur}
                              onKeyDown={(event) => onEditKeyDown(event, cellRef)}
                              autoFocus
                              rows={Math.max(1, draft.split("\n").length)}
                              className="coach-program-progression-cell-input"
                              placeholder={
                                cellDisplay.showLoad &&
                                cellDisplay.showReps &&
                                cellDisplay.showRpe
                                  ? "185 x 2 6"
                                  : cellDisplay.showRpe
                                    ? "5"
                                    : cellDisplay.showLoad
                                      ? "185"
                                      : "4"
                              }
                            />
                          ) : (
                            <button
                              type="button"
                              onPointerDown={() =>
                                handleCellPointerDown(cellRef, exercise)
                              }
                              onDoubleClick={(event) => {
                                event.preventDefault();
                                startEdit(cellRef, { preserve: true });
                              }}
                              className="coach-program-progression-cell-btn"
                            >
                              {displayValue || "—"}
                            </button>
                          )
                        ) : (
                          <button
                            type="button"
                            onPointerDown={() => handleCellPointerDown(cellRef, null)}
                            className="coach-program-progression-cell-empty"
                          >
                            —
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
