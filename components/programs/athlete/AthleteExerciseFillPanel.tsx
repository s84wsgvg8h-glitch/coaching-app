"use client";

import Link from "next/link";
import { normalizeExerciseFormat } from "@/lib/exerciseFormat";
import {
  ATHLETE_PLACEHOLDER_INPUT_CLASS,
  isEmptySetField,
  withOverdueInputClass,
} from "@/lib/programDayValidation";
import type {
  AthleteExerciseSet,
  AthleteExerciseVideo,
  PreviousWeekSetData,
  ProgramDay,
  ProgramExercise,
} from "@/lib/programWeek/types";

type AthleteExerciseFillPanelProps = {
  day: ProgramDay;
  exercise: ProgramExercise;
  setRows: AthleteExerciseSet[];
  dayIsPast: boolean;
  dayDateLabel: string;
  exerciseTitle: string;
  prescribedLabel: string;
  loadingSets: boolean;
  notePanelOpen: boolean;
  exerciseNote: string;
  previousWeekOpen: boolean;
  loadingPreviousWeek: boolean;
  previousWeekMessage: string;
  previousWeekData: PreviousWeekSetData | null;
  uploadingVideoSetKey: string;
  onClose: () => void;
  onToggleNotePanel: () => void;
  onExerciseNoteChange: (value: string) => void;
  onExerciseNoteBlur: (value: string) => void;
  onTogglePreviousWeek: () => void;
  onOpenVideoRecorder: (setNumber: number) => void;
  onUpdateSet: (
    setNumber: number,
    field: "reps" | "weight" | "rpe",
    value: string,
  ) => void;
  onSaveSet: (
    setNumber: number,
    field: "reps" | "weight" | "rpe",
    value: string,
  ) => void;
  onSetKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onCopySetDown: (row: AthleteExerciseSet) => void;
  onDeleteSetVideo: (setNumber: number) => void;
  getSetVideo: (setNumber: number) => AthleteExerciseVideo | undefined;
  getSetVideoKey: (setNumber: number) => string;
  getE1rmLabel: (row: AthleteExerciseSet) => string | null;
  getAverageFromRows: (
    rows: AthleteExerciseSet[],
    field: "reps" | "weight" | "rpe",
  ) => string;
};

export default function AthleteExerciseFillPanel({
  day,
  exercise,
  setRows,
  dayIsPast,
  dayDateLabel,
  exerciseTitle,
  prescribedLabel,
  loadingSets,
  notePanelOpen,
  exerciseNote,
  previousWeekOpen,
  loadingPreviousWeek,
  previousWeekMessage,
  previousWeekData,
  uploadingVideoSetKey,
  onClose,
  onToggleNotePanel,
  onExerciseNoteChange,
  onExerciseNoteBlur,
  onTogglePreviousWeek,
  onOpenVideoRecorder,
  onUpdateSet,
  onSaveSet,
  onSetKeyDown,
  onCopySetDown,
  onDeleteSetVideo,
  getSetVideo,
  getSetVideoKey,
  getE1rmLabel,
  getAverageFromRows,
}: AthleteExerciseFillPanelProps) {
  return (
    <div className="fixed inset-0 z-40 athlete-exercise-panel-root">
      <button
        type="button"
        aria-label="Sluit oefening invullen"
        onClick={onClose}
        className="athlete-exercise-panel-backdrop cursor-default"
      />

      <section
        data-athlete-set-panel="true"
        className="athlete-exercise-panel absolute bottom-0 left-0 right-0 flex h-[min(78dvh,calc(100dvh-env(safe-area-inset-bottom)-0.5rem))] w-full max-lg:animate-[slidepanel_0.22s_ease-out] flex-col overflow-hidden lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:h-auto lg:max-h-[82vh] lg:w-[min(640px,calc(100vw-32px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:animate-[floatpanel_0.18s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-2 mt-3 h-1 w-10 shrink-0 rounded-full bg-white/20 lg:hidden" />

        <div className="athlete-exercise-panel-header flex shrink-0 items-start justify-between gap-3 md:gap-4">
          <div className="min-w-0 pr-2">
            <p className="mb-1.5 text-xs text-app-muted md:text-sm">
              {day.title} · {dayDateLabel}
            </p>
            <h2 className="text-xl font-bold leading-tight text-app-text md:text-2xl">
              {exerciseTitle}
            </h2>
            <p className="mt-1 text-xs text-app-muted md:text-sm">
              Voorgeschreven: {prescribedLabel}
            </p>

            <button
              type="button"
              onClick={onTogglePreviousWeek}
              className="athlete-exercise-panel-secondary-btn mt-3"
            >
              {previousWeekOpen ? "Vorige week verbergen" : "Bekijk vorige week"}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="athlete-exercise-panel-close"
            aria-label="Sluiten"
          >
            ✕
          </button>
        </div>

        <div className="athlete-exercise-panel-body min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div
            className={`athlete-exercise-panel-notes mb-4 pt-2 ${
              notePanelOpen ? "is-open" : ""
            }`}
          >
            <button
              type="button"
              onClick={onToggleNotePanel}
              className="athlete-exercise-panel-notes-header"
            >
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                <div className="min-w-0 text-left">
                  <p className="athlete-exercise-panel-notes-label">Athlete notes</p>
                  {!notePanelOpen && exerciseNote.trim() ? (
                    <p className="athlete-exercise-panel-notes-preview">
                      {exerciseNote}
                    </p>
                  ) : (
                    <p className="text-sm text-app-muted">
                      {notePanelOpen
                        ? "Bewerk je note bij deze oefening"
                        : exerciseNote.trim()
                          ? "Bekijk of bewerk je note"
                          : "Voeg een note toe bij deze oefening"}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-lg font-bold text-emerald-400">
                  {notePanelOpen ? "−" : "+"}
                </span>
              </div>
            </button>

            {notePanelOpen ? (
              <textarea
                value={exerciseNote}
                onChange={(event) => onExerciseNoteChange(event.target.value)}
                onBlur={(event) => onExerciseNoteBlur(event.target.value)}
                placeholder="Schrijf hier je note bij deze oefening..."
                className="athlete-exercise-panel-notes-input"
              />
            ) : null}
          </div>

          {previousWeekOpen ? (
            <div className="athlete-exercise-panel-previous-week mb-4">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-app-muted">
                    Vorige week
                  </p>
                  <h3 className="text-sm font-bold text-app-text">
                    {previousWeekData
                      ? `${previousWeekData.weekTitle} · ${previousWeekData.dayTitle}`
                      : "Resultaat vorige week"}
                  </h3>
                </div>

                {previousWeekData ? (
                  <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    {(["reps", "weight", "rpe"] as const).map((field) => (
                      <div key={field} className="athlete-exercise-panel-stat-chip">
                        <p className="text-[8px] font-bold uppercase text-app-muted">
                          {field === "weight" ? "KG" : field === "rpe" ? "isRPE" : "REPS"}
                        </p>
                        <p className="font-bold text-app-text">
                          {getAverageFromRows(previousWeekData.rows, field)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {!loadingPreviousWeek && previousWeekData?.athleteNote?.trim() ? (
                <div className="athlete-exercise-panel-previous-note mb-3">
                  <p className="mb-1 text-[9px] font-bold uppercase text-emerald-400">
                    Athlete notes vorige week
                  </p>
                  <p className="whitespace-pre-wrap text-sm text-app-text">
                    {previousWeekData.athleteNote}
                  </p>
                </div>
              ) : null}

              {loadingPreviousWeek ? (
                <p className="text-sm text-app-muted">Vorige week laden...</p>
              ) : null}

              {!loadingPreviousWeek && previousWeekMessage ? (
                <p className="text-sm text-app-muted">{previousWeekMessage}</p>
              ) : null}

              {!loadingPreviousWeek && previousWeekData ? (
                <div className="space-y-2">
                  {previousWeekData.rows.map((row) => (
                    <div key={`previous-${row.program_exercise_id}-${row.set_number}`} className="athlete-exercise-panel-previous-set">
                      <p className="font-bold">Set {row.set_number}</p>
                      <p>
                        Reps: <span className="font-bold">{row.reps || "-"}</span>
                      </p>
                      <p>
                        KG: <span className="font-bold">{row.weight || "-"}</span>
                      </p>
                      <p>
                        isRPE: <span className="font-bold">{row.rpe || "-"}</span>
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {loadingSets ? (
            <div className="athlete-exercise-panel-loading">Sets laden...</div>
          ) : (
            <div className="space-y-2">
              <div className="athlete-set-header-row">
                <p>Video</p>
                <p>Set</p>
                <p>Reps</p>
                <p>Gewicht</p>
                <p className="flex items-center gap-1">
                  isRPE
                  <Link
                    href="/rpe-tabel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="athlete-exercise-panel-rpe-link"
                    onClick={(event) => event.stopPropagation()}
                  >
                    RPE?
                  </Link>
                </p>
                <p className="text-center">↓</p>
              </div>

              {setRows.map((row) => {
                const video = getSetVideo(row.set_number);
                const videoKey = getSetVideoKey(row.set_number);
                const isUploading = uploadingVideoSetKey === videoKey;

                return (
                  <div key={`${exercise.id}-${row.set_number}`} className="athlete-set-row">
                    <div className="athlete-set-row-grid">
                      <div className="flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => onOpenVideoRecorder(row.set_number)}
                          disabled={isUploading}
                          className={`athlete-set-video-btn ${
                            video?.video_url ? "has-video" : ""
                          } ${isUploading ? "is-loading" : ""}`}
                          title={video?.video_url ? "Video vervangen" : "Video toevoegen"}
                        >
                          {isUploading ? "…" : video?.video_url ? "▶" : "+"}
                        </button>
                      </div>

                      <div className="text-sm font-bold text-app-text">
                        Set {row.set_number}
                      </div>

                      <input
                        data-athlete-set-input="true"
                        data-athlete-field="reps"
                        data-set-number={row.set_number}
                        value={row.reps || ""}
                        onChange={(event) =>
                          onUpdateSet(row.set_number, "reps", event.target.value)
                        }
                        onBlur={(event) =>
                          onSaveSet(row.set_number, "reps", event.target.value)
                        }
                        onKeyDown={onSetKeyDown}
                        placeholder={
                          normalizeExerciseFormat(exercise.exercise_format) === "amrap"
                            ? "AMRAP"
                            : "8"
                        }
                        inputMode="numeric"
                        className={withOverdueInputClass(
                          `athlete-set-input ${ATHLETE_PLACEHOLDER_INPUT_CLASS}`,
                          dayIsPast && isEmptySetField(row.reps),
                        )}
                      />

                      <input
                        data-athlete-set-input="true"
                        data-athlete-field="weight"
                        data-set-number={row.set_number}
                        value={row.weight || ""}
                        onChange={(event) =>
                          onUpdateSet(row.set_number, "weight", event.target.value)
                        }
                        onBlur={(event) =>
                          onSaveSet(row.set_number, "weight", event.target.value)
                        }
                        onKeyDown={onSetKeyDown}
                        placeholder="100"
                        inputMode="decimal"
                        className={withOverdueInputClass(
                          `athlete-set-input ${ATHLETE_PLACEHOLDER_INPUT_CLASS}`,
                          dayIsPast && isEmptySetField(row.weight),
                        )}
                      />

                      <input
                        data-athlete-set-input="true"
                        data-athlete-field="rpe"
                        data-set-number={row.set_number}
                        value={row.rpe || ""}
                        onChange={(event) =>
                          onUpdateSet(row.set_number, "rpe", event.target.value)
                        }
                        onBlur={(event) =>
                          onSaveSet(row.set_number, "rpe", event.target.value)
                        }
                        onKeyDown={onSetKeyDown}
                        placeholder="8"
                        inputMode="decimal"
                        className={withOverdueInputClass(
                          `athlete-set-input ${ATHLETE_PLACEHOLDER_INPUT_CLASS}`,
                          dayIsPast && isEmptySetField(row.rpe),
                        )}
                      />

                      <button
                        type="button"
                        onClick={() => onCopySetDown(row)}
                        disabled={row.set_number >= setRows.length}
                        className={`athlete-set-copy-btn ${
                          row.set_number >= setRows.length ? "is-disabled" : ""
                        }`}
                        title="Kopieer deze set naar de set eronder"
                      >
                        ↓
                      </button>
                    </div>

                    {getE1rmLabel(row) ? (
                      <p className="athlete-set-e1rm">{getE1rmLabel(row)}</p>
                    ) : null}

                    {video?.video_url ? (
                      <div className="athlete-set-video-preview">
                        <video
                          src={video.video_url}
                          controls
                          className="w-full max-h-[220px] rounded-xl bg-black"
                        />
                        {video.caption?.trim() ? (
                          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-white/5 px-3 py-2 text-sm text-app-muted">
                            {video.caption}
                          </p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => onDeleteSetVideo(row.set_number)}
                          className="athlete-set-video-delete"
                        >
                          Video verwijderen
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
