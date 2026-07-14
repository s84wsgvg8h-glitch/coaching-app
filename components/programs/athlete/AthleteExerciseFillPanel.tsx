"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
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
  videoRecorderActive?: boolean;
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
  readOnly?: boolean;
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
  videoRecorderActive = false,
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
  readOnly = false,
}: AthleteExerciseFillPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const dismissHandleRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  function handleNumericSetUpdate(
    setNumber: number,
    field: "reps" | "weight" | "rpe",
    raw: string,
  ) {
    const filtered = raw.replace(/[^0-9.,]/g, "");
    onUpdateSet(setNumber, field, filtered);
  }

  useEffect(() => {
    const panel = panelRef.current;
    const handle = dismissHandleRef.current;
    const header = headerRef.current;
    const body = bodyRef.current;
    if (!panel || !handle || !header || !body) return;

    const mobileQuery = window.matchMedia("(max-width: 1023px)");
    if (!mobileQuery.matches) return;

    let startY = 0;
    let dragging = false;

    function resetTransform() {
      panel!.style.transform = "";
      panel!.style.transition = "";
    }

    function canStartDrag(target: EventTarget | null) {
      if (!handle || !header || !body) return false;
      if (body.scrollTop > 2) return false;
      if (!target || !(target instanceof Element)) return false;
      if (
        target.closest(
          "input, textarea, button, a, video, .athlete-set-copy-btn, .athlete-set-video-btn",
        )
      ) {
        return false;
      }
      if (handle.contains(target) || header.contains(target)) return true;
      if (body.contains(target)) return true;
      return false;
    }

    function onTouchStart(event: TouchEvent) {
      if (!canStartDrag(event.target)) return;
      startY = event.touches[0]?.clientY ?? 0;
      dragging = true;
      panel!.style.transition = "none";
    }

    function onTouchMove(event: TouchEvent) {
      if (!dragging) return;
      if (body!.scrollTop > 2) {
        dragging = false;
        resetTransform();
        return;
      }

      const currentY = event.touches[0]?.clientY ?? startY;
      const deltaY = currentY - startY;
      if (deltaY <= 0) return;

      event.preventDefault();
      panel!.style.transform = `translateY(${Math.min(deltaY, 160)}px)`;
    }

    function onTouchEnd(event: TouchEvent) {
      if (!dragging) return;
      dragging = false;
      const endY = event.changedTouches[0]?.clientY ?? startY;
      const deltaY = endY - startY;

      panel!.style.transition = "transform 0.22s ease";
      if (deltaY > 72 && body!.scrollTop <= 2) {
        panel!.style.transform = "translateY(100%)";
        window.setTimeout(onClose, 180);
        return;
      }

      resetTransform();
    }

    panel.addEventListener("touchstart", onTouchStart, { passive: true });
    panel.addEventListener("touchmove", onTouchMove, { passive: false });
    panel.addEventListener("touchend", onTouchEnd, { passive: true });
    panel.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      panel.removeEventListener("touchstart", onTouchStart);
      panel.removeEventListener("touchmove", onTouchMove);
      panel.removeEventListener("touchend", onTouchEnd);
      panel.removeEventListener("touchcancel", onTouchEnd);
      resetTransform();
    };
  }, [onClose]);

  return (
    <div
      className={`athlete-exercise-panel-root fixed inset-0 z-50 overflow-x-hidden ${
        videoRecorderActive ? "pointer-events-none" : ""
      }`}
    >
      <button
        type="button"
        aria-label="Sluit oefening invullen"
        onClick={onClose}
        className="athlete-exercise-panel-backdrop cursor-default"
      />

      <section
        ref={panelRef}
        data-athlete-set-panel="true"
        className="athlete-exercise-panel absolute bottom-0 left-0 right-0 flex h-[min(78dvh,calc(100dvh-env(safe-area-inset-bottom)-0.5rem))] w-full max-w-full min-w-0 max-lg:animate-[slidepanel_0.22s_ease-out] flex-col overflow-hidden lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:h-auto lg:max-h-[82vh] lg:w-[min(640px,calc(100vw-32px))] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:animate-[floatpanel_0.18s_ease-out]"
        onClick={(event) => event.stopPropagation()}
      >
        <div
          ref={dismissHandleRef}
          className="athlete-exercise-panel-dismiss-handle shrink-0 touch-none lg:hidden"
          aria-hidden="true"
        >
          <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-app-surface-hover" />
        </div>

        <div
          ref={headerRef}
          className="athlete-exercise-panel-header flex shrink-0 items-start justify-between gap-3 md:gap-4 touch-none lg:touch-auto"
        >
          <div className="min-w-0 flex-1 pr-2">
            <p className="mb-1.5 text-xs text-app-muted md:text-sm">
              {day.title} · {dayDateLabel}
            </p>
            <h2 className="text-xl font-bold leading-tight text-app-text md:text-2xl">
              {exerciseTitle}
            </h2>
            <p className="mt-1 text-xs text-app-muted md:text-sm">
              Voorgeschreven: {prescribedLabel}
            </p>
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

        <div
          ref={bodyRef}
          className="athlete-exercise-panel-body min-h-0 min-w-0 max-w-full flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
        >
          {readOnly ? (
            <p className="mb-3 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs text-app-muted">
              Alleen bekijken — dit is precies wat de atleet ziet en heeft ingevuld.
            </p>
          ) : null}
          <div className="athlete-exercise-panel-action-chips mb-4 pt-2">
            <button
              type="button"
              onClick={onToggleNotePanel}
              className={`athlete-exercise-panel-action-chip athlete-exercise-panel-action-chip--notes ${
                notePanelOpen ? "is-active" : ""
              }`}
            >
              <span className="athlete-exercise-panel-action-chip-label">
                Athlete notes
              </span>
              {!notePanelOpen && exerciseNote.trim() ? (
                <span className="athlete-exercise-panel-action-chip-preview">
                  {exerciseNote}
                </span>
              ) : null}
            </button>

            <button
              type="button"
              onClick={onTogglePreviousWeek}
              className={`athlete-exercise-panel-action-chip athlete-exercise-panel-action-chip--previous ${
                previousWeekOpen ? "is-active" : ""
              }`}
            >
              <span className="athlete-exercise-panel-action-chip-label">
                {previousWeekOpen ? "Verberg vorige week" : "Bekijk vorige week"}
              </span>
            </button>
          </div>

          {notePanelOpen ? (
            <textarea
              value={exerciseNote}
              onChange={(event) => onExerciseNoteChange(event.target.value)}
              onBlur={(event) => onExerciseNoteBlur(event.target.value)}
              placeholder="Schrijf hier je note bij deze oefening..."
              className="athlete-exercise-panel-notes-input mb-4"
              readOnly={readOnly}
            />
          ) : null}

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

          {loadingSets && !readOnly ? (
            <div className="athlete-exercise-panel-loading">Sets laden...</div>
          ) : (
            <div className="space-y-2">
              <div className="athlete-set-header-row">
                <p>Video</p>
                <p>Set</p>
                <p>Reps</p>
                <p>Gewicht</p>
                <p>
                  <Link
                    href="/rpe-tabel"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="athlete-exercise-panel-rpe-link"
                    onClick={(event) => event.stopPropagation()}
                  >
                    RPE
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
                          disabled={readOnly || isUploading}
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
                          handleNumericSetUpdate(row.set_number, "reps", event.target.value)
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
                        readOnly={readOnly}
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
                          handleNumericSetUpdate(row.set_number, "weight", event.target.value)
                        }
                        onBlur={(event) =>
                          onSaveSet(row.set_number, "weight", event.target.value)
                        }
                        onKeyDown={onSetKeyDown}
                        placeholder="100"
                        inputMode="decimal"
                        readOnly={readOnly}
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
                          handleNumericSetUpdate(row.set_number, "rpe", event.target.value)
                        }
                        onBlur={(event) =>
                          onSaveSet(row.set_number, "rpe", event.target.value)
                        }
                        onKeyDown={onSetKeyDown}
                        placeholder="8"
                        inputMode="decimal"
                        readOnly={readOnly}
                        className={withOverdueInputClass(
                          `athlete-set-input ${ATHLETE_PLACEHOLDER_INPUT_CLASS}`,
                          dayIsPast && isEmptySetField(row.rpe),
                        )}
                      />

                      <button
                        type="button"
                        onClick={() => onCopySetDown(row)}
                        disabled={readOnly || row.set_number >= setRows.length}
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
                          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-app-surface-muted px-3 py-2 text-sm text-app-muted">
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
