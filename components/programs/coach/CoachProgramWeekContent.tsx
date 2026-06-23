"use client";

import type { ReactNode, RefObject } from "react";
import { GripVertical } from "lucide-react";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import CoachProgramDayHeader from "@/components/programs/coach/CoachProgramDayHeader";
import CoachProgramWeekHeader, {
  type CoachSbdSummaryItem,
} from "@/components/programs/coach/CoachProgramWeekHeader";
import type { WeekStatsReport } from "@/lib/programWeek/weekStats";
import { isPriorityExercise } from "@/lib/programWeek/exerciseUtils";
import { CreateTemplateButton } from "@/components/programs/ProgramTemplateActions";
import { COACH_CARD_DISMISS_BTN, DELETE_X_BTN, setEmptyDragImage } from "@/lib/programWeek/constants";
import {
  getCoachExerciseColorClass,
  getCoachExercisePriorityClass,
  getExercisePriority,
  getExercisePriorityLabel,
  getExercisePriorityShortLabel,
  getIntensityType,
  getIntensityValue,
} from "@/lib/programWeek/exerciseDisplay";
import type { ProgramSearchContext } from "@/lib/programSearch";
import type {
  ProgramDay,
  ProgramExercise,
} from "@/lib/programWeek/types";
import { priorityOptions } from "@/lib/programWeek/types";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";

export type CoachProgramWeekContentProps = {
  embeddedInChat: boolean;
  isCoach: boolean;
  mobileWeekNav: ReactNode;
  blockTitle: string;
  weekTitle: string;
  programSearchContext: ProgramSearchContext;
  planningSplitOpen: boolean;
  onTogglePlanning: () => void;
  backHref: string;
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
  creatingExerciseDayId: string;
  openDayNoteId: string;
  openDayWarmupId: string;
  openExerciseNoteId: string;
  draggedDayId: string;
  dayDropIndicator: { targetId: string; position: "before" | "after" } | null;
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
  userId: string;
  role: string;
  exerciseName: string;
  exerciseSets: string;
  exerciseReps: string;
  exerciseIntensity: string;
  exerciseIntensityType: string;
  setOpenDayWarmupId: (id: string) => void;
  setOpenDayNoteId: (id: string) => void;
  setUitlegMode: React.Dispatch<React.SetStateAction<boolean>>;
  setPreviewLibraryItem: (item: ExerciseLibraryItem) => void;
  setCreatingExerciseDayId: (id: string) => void;
  setExerciseName: (v: string) => void;
  setExerciseSets: (v: string) => void;
  setExerciseReps: (v: string) => void;
  setExerciseIntensity: (v: string) => void;
  setExerciseIntensityType: (v: string) => void;
  setIsCreatingDay: (v: boolean) => void;
  setNewDayTitle: (v: string) => void;
  setOpenExerciseNoteId: (id: string) => void;
  getDayDate: (day: ProgramDay) => string;
  getDayDateInputValue: (day: ProgramDay) => string;
  hasExercises: (dayId: string) => boolean;
  duplicateDay: (day: ProgramDay) => void;
  deleteDay: (dayId: string) => void;
  updateDayLocal: (
    dayId: string,
    field: "notes" | "warmup" | "title" | "scheduled_date",
    value: string,
  ) => void;
  saveDayMeta: (
    dayId: string,
    updates: { title?: string; scheduled_date?: string | null },
  ) => void | Promise<void>;
  saveDayField: (
    dayId: string,
    field: "notes" | "warmup",
    value: string,
  ) => void | Promise<void>;
  deleteDayField: (
    dayId: string,
    field: "notes" | "warmup",
  ) => void | Promise<void>;
  handleDragStart: (dayId: string) => void;
  handleDragOver: (e: React.DragEvent<HTMLDivElement>, dayId: string) => void;
  saveDayOrder: () => void | Promise<void>;
  getExerciseLibraryItem: (exercise: ProgramExercise) => ExerciseLibraryItem | null;
  saveExerciseLibraryLink: (
    exerciseId: string,
    libraryId: string | null,
  ) => void | Promise<void>;
  handleExerciseDragStart: (dayId: string, exerciseId: string) => void;
  handleExerciseDragOver: (
    e: React.DragEvent<HTMLDivElement>,
    dayId: string,
    exerciseId: string,
  ) => void;
  saveExerciseOrder: (dayId: string) => void | Promise<void>;
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
      | "reps"
      | "rpe"
      | "sets"
      | "load"
      | "notes"
      | "exercise_format"
      | "superset_group"
      | "rest_seconds",
    value: string,
  ) => void | Promise<void>;
  deleteExercise: (exerciseId: string) => void;
  handleCoachExerciseEnter: (
    e: React.KeyboardEvent<HTMLInputElement>,
    exerciseId: string,
    field: "name" | "sets" | "reps" | "load" | "rpe",
    value: string,
  ) => void;
  handleNewExerciseFormKeyDown: (
    e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    dayId: string,
  ) => void;
  addExercise: (dayId: string) => void | Promise<void>;
  updateIntensityType: (
    dayId: string,
    exercise: ProgramExercise,
    type: string,
  ) => void | Promise<void>;
  deleteExerciseNote: (dayId: string, exerciseId: string) => void | Promise<void>;
  saveExercisePriority: (exerciseId: string, priority: string) => void | Promise<void>;
  saveExerciseFields: (
    exerciseId: string,
    fields: Partial<ProgramExercise>,
  ) => void | Promise<void>;
  getAthleteExerciseNote: (exerciseId: string) => string;
  createDay: (dayNumber: number) => void | Promise<void>;
  onLinkExerciseForLibrary: (exercise: ProgramExercise) => void;
  sbdWeekSummary?: CoachSbdSummaryItem[];
  weekStatsReport?: WeekStatsReport | null;
};

export default function CoachProgramWeekContent({
  embeddedInChat,
  isCoach,
  mobileWeekNav,
  blockTitle,
  weekTitle,
  programSearchContext,
  planningSplitOpen,
  onTogglePlanning,
  backHref,
  days,
  exercisesByDay,
  creatingExerciseDayId,
  openDayNoteId,
  openDayWarmupId,
  openExerciseNoteId,
  draggedDayId,
  dayDropIndicator,
  draggedExercise,
  exerciseDropIndicator,
  isCreatingDay,
  newDayTitle,
  newDayInputRef,
  exerciseNameInputRef,
  uitlegMode,
  userId,
  role,
  exerciseName,
  exerciseSets,
  exerciseReps,
  exerciseIntensity,
  exerciseIntensityType,
  setOpenDayWarmupId,
  setOpenDayNoteId,
  setUitlegMode,
  setPreviewLibraryItem,
  setCreatingExerciseDayId,
  setExerciseName,
  setExerciseSets,
  setExerciseReps,
  setExerciseIntensity,
  setExerciseIntensityType,
  setIsCreatingDay,
  setNewDayTitle,
  setOpenExerciseNoteId,
  getDayDate,
  getDayDateInputValue,
  hasExercises,
  duplicateDay,
  deleteDay,
  updateDayLocal,
  saveDayMeta,
  saveDayField,
  deleteDayField,
  handleDragStart,
  handleDragOver,
  saveDayOrder,
  getExerciseLibraryItem,
  saveExerciseLibraryLink,
  handleExerciseDragStart,
  handleExerciseDragOver,
  saveExerciseOrder,
  updateExerciseLocal,
  saveExerciseField,
  deleteExercise,
  handleCoachExerciseEnter,
  handleNewExerciseFormKeyDown,
  addExercise,
  createDay,
  updateIntensityType,
  deleteExerciseNote,
  saveExercisePriority,
  saveExerciseFields,
  getAthleteExerciseNote,
  onLinkExerciseForLibrary,
  sbdWeekSummary,
  weekStatsReport = null,
}: CoachProgramWeekContentProps) {
  return (
    <div className="coach-program-main max-w-full">
      {!embeddedInChat && (
        <CoachProgramWeekHeader
          blockTitle={blockTitle}
          weekTitle={weekTitle}
          programSearchContext={programSearchContext}
          planningSplitOpen={planningSplitOpen}
          onTogglePlanning={onTogglePlanning}
          backHref={backHref}
          sbdWeekSummary={sbdWeekSummary}
          weekStatsReport={weekStatsReport}
        />
      )}

      {!embeddedInChat && mobileWeekNav}

              <div className="coach-program-days-grid">
                {days.map((day) => {
                  const exercises = exercisesByDay[day.id] || [];
                  const isAddingExercise = creatingExerciseDayId === day.id;
                  const dayHasExercises = hasExercises(day.id);
                  const noteOpen = openDayNoteId === day.id;
                  const warmupOpen = openDayWarmupId === day.id;

                  const dayDropShift =
                    dayDropIndicator?.targetId === day.id &&
                    draggedDayId &&
                    draggedDayId !== day.id
                      ? dayDropIndicator.position === "before"
                        ? "translate-y-8"
                        : "-translate-y-8"
                      : "";

                  return (
                    <div
                      key={day.id}
                      onDragOver={(e) => handleDragOver(e, day.id)}
                      onDrop={(e) => {
                        e.preventDefault();
                        void saveDayOrder();
                      }}
                      className={`coach-program-day-column group/day flex w-full min-w-0 flex-col transform-gpu transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                        draggedDayId === day.id
                          ? "z-10 opacity-55 scale-[0.94] rotate-1"
                          : "opacity-100 scale-100 rotate-0"
                      } ${dayDropShift}`}
                    >
                      <div className="coach-program-day-header-row flex items-start gap-1">
                        {isCoach ? (
                          <div
                            role="button"
                            tabIndex={0}
                            draggable
                            onDragStart={(event) => {
                              setEmptyDragImage(event);
                              handleDragStart(day.id);
                            }}
                            onDragEnd={() => void saveDayOrder()}
                            className="coach-program-drag-handle mt-1 shrink-0"
                            aria-label="Dag verplaatsen"
                            title="Sleep om dag te verplaatsen"
                          >
                            <GripVertical className="h-4 w-4" aria-hidden />
                          </div>
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <CoachProgramDayHeader
                            title={day.title}
                            dateLabel={getDayDate(day)}
                            dateInputValue={getDayDateInputValue(day)}
                            editable={isCoach}
                            onTitleChange={(value) =>
                              updateDayLocal(day.id, "title", value)
                            }
                            onTitleBlur={() => {
                              void saveDayMeta(day.id, { title: day.title });
                            }}
                            onDateChange={(value) => {
                              updateDayLocal(day.id, "scheduled_date", value);
                              void saveDayMeta(day.id, {
                                scheduled_date: value || null,
                              });
                            }}
                          />
                        </div>
                      </div>

                      <div
                        className={`coach-program-day-card flex flex-col transition-[transform,opacity,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          draggedDayId === day.id
                            ? "shadow-2xl ring-2 ring-brand-blue/20"
                            : ""
                        } ${
                          dayDropIndicator?.targetId === day.id &&
                          draggedDayId !== day.id
                            ? "border-brand-blue/50 shadow-xl"
                            : ""
                        } ${
                          dayHasExercises ||
                          isAddingExercise ||
                          noteOpen ||
                          warmupOpen
                            ? "min-h-[420px]"
                            : "min-h-[230px]"
                        }`}
                      >
                      <div className="flex flex-col h-full">
                        <div className="coach-program-day-chips">
                          <div className="coach-program-day-chips-start">
                            {isCoach && !day.warmup?.trim() && (
                              <button
                                type="button"
                                onClick={() => setOpenDayWarmupId(day.id)}
                                className="program-day-chip program-day-chip-warmup"
                              >
                                Warmup
                              </button>
                            )}

                            {isCoach && !day.notes?.trim() && (
                              <button
                                type="button"
                                onClick={() => setOpenDayNoteId(day.id)}
                                className="program-day-chip program-day-chip-notes"
                              >
                                Notes
                              </button>
                            )}

                            {isCoach && (
                              <button
                                type="button"
                                onClick={() => setUitlegMode((current) => !current)}
                                className={`program-day-chip program-day-chip-uitleg ${
                                  uitlegMode ? "program-day-chip-uitleg-active" : ""
                                }`}
                              >
                                Uitleg
                              </button>
                            )}
                          </div>

                          <div className="coach-program-day-chip-actions">
                            {isCoach && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => duplicateDay(day)}
                                  className="coach-program-icon-btn opacity-0 transition group-hover/day:opacity-100"
                                  title="Dag dupliceren"
                                >
                                  ⧉
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deleteDay(day.id)}
                                  className={`${DELETE_X_BTN} opacity-0 group-hover/day:opacity-100`}
                                >
                                  ✕
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {day.warmup?.trim() && !warmupOpen && (
                          <div className="coach-program-warmup-panel group/warmup relative mb-3">
                            <button
                              type="button"
                              onClick={() =>
                                isCoach && setOpenDayWarmupId(day.id)
                              }
                              className="coach-program-warmup-preview w-full text-left"
                            >
                              <p className="coach-program-panel-label coach-program-panel-label-warmup">
                                Warmup
                              </p>
                              <p className="coach-program-warmup-text whitespace-pre-wrap">
                                {day.warmup}
                              </p>
                            </button>

                            {isCoach && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteDayField(day.id, "warmup");
                                }}
                                className={`${COACH_CARD_DISMISS_BTN} opacity-0 group-hover/warmup:opacity-100`}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}

                        {warmupOpen && (
                          <div className="coach-program-warmup-panel group/warmup relative mb-3">
                            <p className="coach-program-panel-label coach-program-panel-label-warmup">
                              Warmup
                            </p>

                            <textarea
                              value={day.warmup || ""}
                              onChange={(e) =>
                                updateDayLocal(day.id, "warmup", e.target.value)
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  saveDayField(
                                    day.id,
                                    "warmup",
                                    day.warmup || "",
                                  );
                                }
                              }}
                              placeholder="Schrijf warmup..."
                              className="coach-program-warmup-input"
                            />

                            <button
                              type="button"
                              onClick={() =>
                                saveDayField(day.id, "warmup", day.warmup || "")
                              }
                              className="coach-program-warmup-save"
                            >
                              Toevoegen
                            </button>
                          </div>
                        )}

                        {(noteOpen || day.notes?.trim()) && (
                          <div className="coach-program-inline-notes group/daynote relative mb-4">
                            {isCoach && day.notes?.trim() ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteDayField(day.id, "notes");
                                }}
                                className={`${COACH_CARD_DISMISS_BTN} opacity-70 hover:opacity-100`}
                                aria-label="Notes verwijderen"
                              >
                                ✕
                              </button>
                            ) : null}

                            <p className="coach-program-panel-label coach-program-panel-label-notes">
                              Notes
                            </p>

                            <textarea
                              value={day.notes || ""}
                              onChange={(e) =>
                                updateDayLocal(day.id, "notes", e.target.value)
                              }
                              onBlur={() => {
                                void saveDayField(
                                  day.id,
                                  "notes",
                                  day.notes || "",
                                );
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  void saveDayField(
                                    day.id,
                                    "notes",
                                    day.notes || "",
                                  );
                                }
                              }}
                              placeholder="Schrijf notes..."
                              className="coach-program-inline-notes-input"
                            />
                          </div>
                        )}

                        {dayHasExercises && (
                          <div className="space-y-1.5 mt-1.5">
                            {exercises.map((exercise) => {
                              const intensityType = getIntensityType(exercise);
                              const exerciseNoteOpen =
                                openExerciseNoteId === exercise.id;
                              const linkedLibraryItem =
                                getExerciseLibraryItem(exercise);
                              const exerciseDropShift =
                                exerciseDropIndicator?.dayId === day.id &&
                                exerciseDropIndicator.targetId === exercise.id &&
                                draggedExercise?.exerciseId !== exercise.id
                                  ? exerciseDropIndicator.position === "before"
                                    ? "translate-y-4"
                                    : "-translate-y-4"
                                  : "";

                              return (
                                <div
                                  key={exercise.id}
                                  id={`exercise-${exercise.id}`}
                                  className="coach-program-exercise-row flex items-stretch gap-1.5"
                                >
                                  {isCoach ? (
                                    <div
                                      role="button"
                                      tabIndex={0}
                                      draggable
                                      onDragStart={(e) => {
                                        e.stopPropagation();
                                        setEmptyDragImage(e);
                                        handleExerciseDragStart(day.id, exercise.id);
                                      }}
                                      onDragEnd={() => void saveExerciseOrder(day.id)}
                                      className="coach-program-drag-handle self-center shrink-0"
                                      aria-label="Oefening verplaatsen"
                                      title="Sleep om oefening te verplaatsen"
                                    >
                                      <GripVertical className="h-4 w-4" aria-hidden />
                                    </div>
                                  ) : null}
                                  {linkedLibraryItem && (
                                    <div className="coach-exercise-uitleg group/uitleg relative shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewLibraryItem(linkedLibraryItem)
                                        }
                                        className="program-uitleg-btn flex h-full w-full flex-col items-center justify-center px-1 transition"
                                        title={`Uitleg: ${linkedLibraryItem.name}`}
                                      >
                                        <span className="text-base leading-none">
                                          ▶
                                        </span>
                                        <span className="mt-0.5 text-[8px] font-bold uppercase">
                                          Uitleg
                                        </span>
                                      </button>
                                      {isCoach && (
                                        <button
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            void saveExerciseLibraryLink(
                                              exercise.id,
                                              null,
                                            );
                                          }}
                                          className={`absolute -right-1 -top-1 ${DELETE_X_BTN} opacity-0 group-hover/uitleg:opacity-100`}
                                          title="Uitlegvideo loskoppelen"
                                        >
                                          ✕
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  <div
                                    onDragOver={(e) =>
                                      handleExerciseDragOver(
                                        e,
                                        day.id,
                                        exercise.id,
                                      )
                                    }
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                    }}
                                    onDragEnd={() => void saveExerciseOrder(day.id)}
                                    className={`coach-exercise-block group/exercise relative min-w-0 flex-1 ${getCoachExerciseColorClass(
                                      exercise.name,
                                    )} transition-[transform,opacity,box-shadow] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${exerciseDropShift} ${
                                      draggedExercise?.exerciseId === exercise.id
                                        ? "z-10 opacity-55 scale-[0.96] shadow-lg ring-2 ring-black/15"
                                        : "opacity-100 scale-100"
                                    } ${
                                      exerciseDropIndicator?.dayId === day.id &&
                                      exerciseDropIndicator.targetId ===
                                        exercise.id &&
                                      draggedExercise?.exerciseId !== exercise.id
                                        ? "ring-2 ring-black"
                                        : ""
                                    }`}
                                  >
                                  {isCoach && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteExercise(exercise.id)
                                        }
                                        className={`${COACH_CARD_DISMISS_BTN} opacity-0 group-hover/exercise:opacity-100`}
                                      >
                                        ✕
                                      </button>
                                    </>
                                  )}

                                  <div className="coach-program-exercise-head">
                                    <div className="min-w-0 flex-1">
                                      <div className="coach-program-exercise-title-row">
                                        <div className="coach-program-exercise-name-wrap min-w-0 flex-1">
                                          <AutoResizeTextarea
                                            value={exercise.name || ""}
                                            onChange={(e) =>
                                              updateExerciseLocal(
                                                day.id,
                                                exercise.id,
                                                "name",
                                                e.target.value,
                                              )
                                            }
                                            onBlur={(e) =>
                                              saveExerciseField(
                                                exercise.id,
                                                "name",
                                                e.target.value,
                                              )
                                            }
                                            onKeyDown={(e) => {
                                              e.stopPropagation();
                                              if (e.key === "Enter" && !e.shiftKey) {
                                                e.preventDefault();
                                                e.currentTarget.blur();
                                              }
                                            }}
                                            disabled={!isCoach}
                                            rows={1}
                                            className="coach-program-exercise-name"
                                          />
                                        </div>

                                        {isCoach && (
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              setOpenExerciseNoteId(
                                                exerciseNoteOpen ? "" : exercise.id,
                                              );
                                            }}
                                            className={`program-day-chip program-day-chip-notes shrink-0 ${
                                              exerciseNoteOpen || exercise.notes?.trim()
                                                ? "program-day-chip-notes-active"
                                                : ""
                                            }`}
                                          >
                                            Notes
                                          </button>
                                        )}
                                      </div>

                                      {isCoach && isPriorityExercise(exercise.name) ? (
                                        <select
                                          value={getExercisePriority(exercise) || ""}
                                          onChange={(event) => {
                                            event.stopPropagation();
                                            void saveExercisePriority(
                                              exercise.id,
                                              event.target.value,
                                            );
                                          }}
                                          onClick={(event) => event.stopPropagation()}
                                          disabled={!isCoach}
                                          className={`coach-program-priority-select ${getCoachExercisePriorityClass(
                                            exercise,
                                          )}`}
                                          aria-label="Prioriteit"
                                        >
                                          <option value="">Prioriteit kiezen</option>
                                          {priorityOptions.map((priority) => (
                                            <option key={priority} value={priority}>
                                              {getExercisePriorityLabel({
                                                ...exercise,
                                                priority,
                                              })}
                                            </option>
                                          ))}
                                        </select>
                                      ) : isPriorityExercise(exercise.name) &&
                                        getExercisePriority(exercise) ? (
                                        <p className="coach-program-exercise-priority-sub">
                                          {getExercisePriorityLabel(exercise)}
                                        </p>
                                      ) : null}
                                    </div>
                                  </div>

                                  <div className="coach-program-exercise-fields">
                                    <div className="coach-program-field-cell">
                                      <p className="coach-program-field-label">
                                        SETS
                                      </p>

                                      <input
                                        value={exercise.sets || ""}
                                        onChange={(e) =>
                                          updateExerciseLocal(
                                            day.id,
                                            exercise.id,
                                            "sets",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={(e) =>
                                          saveExerciseField(
                                            exercise.id,
                                            "sets",
                                            e.target.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        disabled={!isCoach}
                                        className="coach-program-field"
                                      />
                                    </div>

                                    <div className="coach-program-field-cell">
                                      <p className="coach-program-field-label">
                                        REPS
                                      </p>

                                      <input
                                        value={exercise.reps || ""}
                                        onChange={(e) =>
                                          updateExerciseLocal(
                                            day.id,
                                            exercise.id,
                                            "reps",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={(e) =>
                                          saveExerciseField(
                                            exercise.id,
                                            "reps",
                                            e.target.value,
                                          )
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        disabled={!isCoach}
                                        className="coach-program-field"
                                      />
                                    </div>

                                    <div className="coach-program-field-cell">
                                      <p className="coach-program-field-label">
                                        INT.
                                      </p>

                                      <input
                                        value={getIntensityValue(exercise)}
                                        onChange={(e) => {
                                          const value = e.target.value;

                                          if (intensityType === "rpe") {
                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "rpe",
                                              value,
                                            );

                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "load",
                                              "",
                                            );
                                          } else {
                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "load",
                                              value,
                                            );

                                            updateExerciseLocal(
                                              day.id,
                                              exercise.id,
                                              "rpe",
                                              "",
                                            );
                                          }
                                        }}
                                        onBlur={(e) => {
                                          const value = e.target.value.trim();

                                          if (intensityType === "rpe") {
                                            saveExerciseFields(exercise.id, {
                                              rpe: value,
                                              load: "",
                                            });
                                          } else {
                                            saveExerciseFields(exercise.id, {
                                              load: value
                                                ? `${value}${intensityType}`
                                                : "",
                                              rpe: "",
                                            });
                                          }
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            e.currentTarget.blur();
                                          }
                                        }}
                                        disabled={!isCoach}
                                        className="coach-program-field"
                                      />
                                    </div>

                                    <div className="coach-program-field-cell">
                                      <p className="coach-program-field-label">
                                        TYPE
                                      </p>

                                      <select
                                        value={intensityType}
                                        onChange={(e) =>
                                          updateIntensityType(
                                            day.id,
                                            exercise,
                                            e.target.value,
                                          )
                                        }
                                        disabled={!isCoach}
                                        className="coach-program-field coach-program-field-select"
                                      >
                                        <option value="%">%</option>
                                        <option value="rpe">RPE</option>
                                        <option value="kg">KG</option>
                                      </select>
                                    </div>
                                  </div>

                                  {(exerciseNoteOpen || exercise.notes?.trim()) && (
                                    <div className="coach-program-inline-notes group/exnote relative mt-2">
                                      {isCoach && exercise.notes?.trim() ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            void deleteExerciseNote(
                                              day.id,
                                              exercise.id,
                                            );
                                          }}
                                          className={`${COACH_CARD_DISMISS_BTN} opacity-70 hover:opacity-100`}
                                          aria-label="Notes verwijderen"
                                        >
                                          ✕
                                        </button>
                                      ) : null}

                                      <textarea
                                        value={exercise.notes || ""}
                                        onChange={(e) =>
                                          updateExerciseLocal(
                                            day.id,
                                            exercise.id,
                                            "notes",
                                            e.target.value,
                                          )
                                        }
                                        onBlur={() => {
                                          void saveExerciseField(
                                            exercise.id,
                                            "notes",
                                            exercise.notes || "",
                                          );
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault();
                                            void saveExerciseField(
                                              exercise.id,
                                              "notes",
                                              exercise.notes || "",
                                            );
                                          }
                                        }}
                                        placeholder="Notes bij oefening..."
                                        className="coach-program-inline-notes-input"
                                      />
                                    </div>
                                  )}

                                  {isCoach && uitlegMode && (
                                    <div className="coach-program-uitleg-actions">
                                      {!linkedLibraryItem ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onLinkExerciseForLibrary(exercise)
                                          }
                                          className="program-day-chip program-day-chip-uitleg"
                                        >
                                          + Uitleg video
                                        </button>
                                      ) : (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              onLinkExerciseForLibrary(exercise)
                                            }
                                            className="program-day-chip program-day-chip-uitleg"
                                          >
                                            Wijzig uitleg
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              void saveExerciseLibraryLink(
                                                exercise.id,
                                                null,
                                              )
                                            }
                                            className="program-day-chip program-day-chip-uitleg-muted"
                                          >
                                            Verwijder uitleg
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  )}
                                </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        <div className="mt-auto pt-5">
                          {isCoach && !isAddingExercise && (
                            <button
                              type="button"
                              onClick={() => {
                                setCreatingExerciseDayId(day.id);
                                setExerciseName("");
                                setExerciseSets("");
                                setExerciseReps("");
                                setExerciseIntensity("");
                                setExerciseIntensityType("rpe");
                              }}
                              className="coach-program-add-exercise-btn"
                            >
                              +
                            </button>
                          )}

                          {isCoach && isAddingExercise && (
                            <div
                              className="coach-program-inline-form"
                              data-new-exercise-form="true"
                            >
                              <input
                                ref={exerciseNameInputRef}
                                value={exerciseName}
                                onChange={(e) => setExerciseName(e.target.value)}
                                onKeyDown={(e) => {
                                  e.stopPropagation();
                                  handleNewExerciseFormKeyDown(e, day.id);
                                }}
                                placeholder="Naam oefening"
                                className="coach-program-inline-form-input coach-program-inline-form-input-name"
                              />

                              <div className="coach-program-inline-form-grid">
                                <input
                                  value={exerciseSets}
                                  onChange={(e) =>
                                    setExerciseSets(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  placeholder="Sets"
                                  className="coach-program-inline-form-input"
                                />

                                <input
                                  value={exerciseReps}
                                  onChange={(e) =>
                                    setExerciseReps(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  placeholder="Reps"
                                  className="coach-program-inline-form-input"
                                />

                                <input
                                  value={exerciseIntensity}
                                  onChange={(e) =>
                                    setExerciseIntensity(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  placeholder="Int."
                                  className="coach-program-inline-form-input"
                                />

                                <select
                                  value={exerciseIntensityType}
                                  onChange={(e) =>
                                    setExerciseIntensityType(e.target.value)
                                  }
                                  onKeyDown={(e) =>
                                    handleNewExerciseFormKeyDown(e, day.id)
                                  }
                                  className="coach-program-inline-form-input coach-program-inline-form-select"
                                >
                                  <option value="%">%</option>
                                  <option value="rpe">RPE</option>
                                  <option value="kg">KG</option>
                                </select>
                              </div>

                              <div className="coach-program-inline-form-actions">
                                <button
                                  type="button"
                                  onClick={() => addExercise(day.id)}
                                  className="app-btn-primary flex-1"
                                >
                                  Opslaan
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setCreatingExerciseDayId("");
                                    setExerciseName("");
                                    setExerciseSets("");
                                    setExerciseReps("");
                                    setExerciseIntensity("");
                                    setExerciseIntensityType("rpe");
                                  }}
                                  className="app-btn-secondary flex-1"
                                >
                                  Annuleer
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })}

                {isCoach && !isCreatingDay && (
                  <button
                    type="button"
                    onClick={() => setIsCreatingDay(true)}
                    className="coach-program-add-day"
                  >
                    <div className="coach-program-add-day-icon">+</div>
                    <p className="coach-program-add-day-title">Nieuwe dag toevoegen</p>
                    <p className="coach-program-add-day-subtitle">
                      Plan een nieuwe trainingsdag in deze week.
                    </p>
                  </button>
                )}

                {isCoach && isCreatingDay && (
                  <div className="coach-program-add-day-form">
                    <div>
                      <h2>Nieuwe dag</h2>

                      <input
                        ref={newDayInputRef}
                        value={newDayTitle}
                        onChange={(e) => setNewDayTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            createDay(days.length + 1);
                          }
                        }}
                        placeholder="Bijvoorbeeld: Borst training"
                        className="coach-program-inline-form-input coach-program-inline-form-input-name"
                      />
                    </div>

                    <div className="coach-program-inline-form-actions">
                      <button
                        type="button"
                        onClick={() => createDay(days.length + 1)}
                        className="app-btn-primary flex-1"
                      >
                        Opslaan
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsCreatingDay(false);
                          setNewDayTitle("");
                        }}
                        className="app-btn-secondary flex-1"
                      >
                        Annuleer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
  );
}
