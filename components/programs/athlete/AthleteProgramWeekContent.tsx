"use client";

import type { ReactNode } from "react";
import ProgramDayCoachNoteField from "@/components/programs/ProgramDayCoachNoteField";
import { AthleteProgramDayHeader } from "@/components/programs/athlete/AthleteProgramSidebar";
import AthleteDayCheckinCard from "@/components/programs/athlete/AthleteDayCheckinCard";
import AthleteExerciseCard, {
  getAthletePriorityBadgeClass,
} from "@/components/programs/athlete/AthleteExerciseCard";
import { getPrescribedKgFromExercise } from "@/lib/exercisePrescription";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import { sortExercisesForDay } from "@/lib/programWeek/sortExercises";
import type {
  AthleteDayCheckin,
  AthleteExerciseSet,
  ProgramDay,
  ProgramExercise,
} from "@/lib/programWeek/types";

type AthleteProgramWeekContentProps = {
  mobileWeekNav: ReactNode;
  blockTitle: string;
  weekTitle: string;
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
  userId: string;
  athleteCoachId: string;
  openAthleteDayNotesId: string;
  selectedAthleteExerciseId: string;
  athleteExercisePanelOpen: boolean;
  getAthleteDayCheckin: (dayId: string) => AthleteDayCheckin;
  getDayDate: (day: ProgramDay) => string;
  isDayPast: (date: Date | null) => boolean;
  getDayDateObject: (day: ProgramDay | number) => Date | null;
  updateAthleteDayCheckinLocal: (
    dayId: string,
    updates: Partial<AthleteDayCheckin>,
  ) => void;
  saveAthleteDayCheckin: (
    dayId: string,
    updates: Partial<AthleteDayCheckin>,
  ) => void;
  setOpenAthleteDayNotesId: React.Dispatch<React.SetStateAction<string>>;
  getSetRowsForExercise: (exercise: ProgramExercise) => AthleteExerciseSet[];
  hasIncompleteSetField: (
    rows: AthleteExerciseSet[],
    field: "weight" | "reps" | "rpe",
  ) => boolean;
  getExerciseLibraryItem: (
    exercise: ProgramExercise,
  ) => ExerciseLibraryItem | null;
  getAthleteSetAverage: (
    exercise: ProgramExercise,
    field: "reps" | "weight" | "rpe",
  ) => string;
  getDisplayIntensity: (exercise: ProgramExercise) => string;
  getExercisePriority: (exercise: ProgramExercise) => string;
  getExercisePriorityLabel: (exercise: ProgramExercise) => string;
  capitalizeExerciseName: (name: string) => string;
  openAthleteExercisePanel: (exerciseId: string) => void;
  setPreviewLibraryItem: (item: ExerciseLibraryItem) => void;
  readOnly?: boolean;
};

export default function AthleteProgramWeekContent({
  mobileWeekNav,
  blockTitle: _blockTitle,
  weekTitle: _weekTitle,
  days,
  exercisesByDay,
  userId,
  athleteCoachId,
  openAthleteDayNotesId,
  selectedAthleteExerciseId,
  athleteExercisePanelOpen,
  getAthleteDayCheckin,
  getDayDate,
  isDayPast,
  getDayDateObject,
  updateAthleteDayCheckinLocal,
  saveAthleteDayCheckin,
  setOpenAthleteDayNotesId,
  getSetRowsForExercise,
  hasIncompleteSetField,
  getExerciseLibraryItem,
  getAthleteSetAverage,
  getDisplayIntensity,
  getExercisePriority,
  getExercisePriorityLabel,
  capitalizeExerciseName,
  openAthleteExercisePanel,
  setPreviewLibraryItem,
  readOnly = false,
}: AthleteProgramWeekContentProps) {
  return (
    <div className="athlete-program-main min-w-0 max-w-full overflow-x-hidden">
      {mobileWeekNav}

      <div className="athlete-program-days-grid">
        {days.map((day) => {
          const exercises = sortExercisesForDay(exercisesByDay[day.id] || []);
          const checkin = getAthleteDayCheckin(day.id);
          const dayIsPast = isDayPast(getDayDateObject(day));

          return (
            <div
              key={day.id}
              id={`program-day-${day.id}`}
              className="athlete-program-day-column"
            >
              <AthleteProgramDayHeader
                title={day.title}
                dateLabel={getDayDate(day)}
                hasNote={Boolean(checkin.notes?.trim())}
                notesOpen={openAthleteDayNotesId === day.id}
                onToggleNotes={() =>
                  setOpenAthleteDayNotesId((current) =>
                    current === day.id ? "" : day.id,
                  )
                }
              />

              <AthleteDayCheckinCard
                checkin={checkin}
                dayIsPast={dayIsPast}
                notesOpen={openAthleteDayNotesId === day.id}
                readOnly={readOnly}
                onBwChange={(value) =>
                  updateAthleteDayCheckinLocal(day.id, { bw: value })
                }
                onBwBlur={(value) =>
                  saveAthleteDayCheckin(day.id, { bw: value })
                }
                onRecoverySelect={(value) =>
                  saveAthleteDayCheckin(day.id, { recovery: value })
                }
                onFatigueSelect={(value) =>
                  saveAthleteDayCheckin(day.id, { fatigue: value })
                }
                onNotesChange={(value) =>
                  updateAthleteDayCheckinLocal(day.id, { notes: value })
                }
                onNotesBlur={(value) =>
                  saveAthleteDayCheckin(day.id, { notes: value })
                }
              />

              {userId && athleteCoachId ? (
                <ProgramDayCoachNoteField
                  programDayId={day.id}
                  athleteId={userId}
                  coachId={athleteCoachId}
                  canEdit={false}
                  variant="program-dark"
                />
              ) : null}

              {(day.warmup?.trim() || day.notes?.trim()) && (
                <div className="athlete-program-coach-notes">
                  {day.warmup?.trim() ? (
                    <div className="athlete-program-coach-note athlete-program-coach-note--warmup">
                      <p className="athlete-program-coach-note-label">Warmup</p>
                      <p className="whitespace-pre-wrap text-[13px] text-app-text">
                        {day.warmup}
                      </p>
                    </div>
                  ) : null}
                  {day.notes?.trim() ? (
                    <div className="athlete-program-coach-note athlete-program-coach-note--coach">
                      <p className="athlete-program-coach-note-label">
                        Coach notes
                      </p>
                      <p className="whitespace-pre-wrap text-[13px] text-app-text">
                        {day.notes}
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              <div className="athlete-program-exercise-list">
                {exercises.length === 0 ? (
                  <p className="rounded-xl border border-app-border bg-app-surface p-4 text-[13px] text-app-muted">
                    Geen oefeningen voor deze dag.
                  </p>
                ) : (
                  exercises.map((exercise) => {
                    const setRows = getSetRowsForExercise(exercise);
                    const weightOverdue =
                      dayIsPast && hasIncompleteSetField(setRows, "weight");
                    const linkedLibraryItem = getExerciseLibraryItem(exercise);
                    const prescribedKg = getPrescribedKgFromExercise(exercise);
                    const loggedKg = getAthleteSetAverage(exercise, "weight");
                    const kgValue = prescribedKg || loggedKg;
                    const parsedKg = Number.parseFloat(
                      kgValue.replace(",", "."),
                    );
                    const priority = getExercisePriority(exercise);

                    return (
                      <div key={exercise.id} id={`exercise-${exercise.id}`}>
                        <AthleteExerciseCard
                          name={
                            capitalizeExerciseName(exercise.name) || "Oefening"
                          }
                          priorityLabel={getExercisePriorityLabel(exercise)}
                          priorityClass={getAthletePriorityBadgeClass(priority)}
                          hasLibraryVideo={Boolean(linkedLibraryItem)}
                          sets={exercise.sets || "—"}
                          reps={exercise.reps || "—"}
                          rpe={getDisplayIntensity(exercise)}
                          kg={kgValue}
                          irpe={getAthleteSetAverage(exercise, "rpe")}
                          kgHighlight={
                            kgValue !== "-" &&
                            (weightOverdue ||
                              (Number.isFinite(parsedKg) && parsedKg >= 100))
                          }
                          isSelected={
                            selectedAthleteExerciseId === exercise.id &&
                            athleteExercisePanelOpen
                          }
                          onOpen={() => openAthleteExercisePanel(exercise.id)}
                          onPreviewVideo={
                            linkedLibraryItem
                              ? () => setPreviewLibraryItem(linkedLibraryItem)
                              : undefined
                          }
                        />
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
