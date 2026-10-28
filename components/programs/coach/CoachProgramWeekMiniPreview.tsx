"use client";

import { useMemo, type CSSProperties } from "react";
import {
  buildProgramWeekDayDates,
  formatDutchDateWithShortMonth,
} from "@/lib/programWeek/dateFormatting";
import { sortExercisesForDay } from "@/lib/programWeek/sortExercises";
import { formatProgramDayTitle } from "@/lib/programWeek/weekdayFromTitle";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

type CoachProgramWeekMiniPreviewProps = {
  block: ProgramBlock | null;
  week: ProgramWeek | null;
  days: ProgramDay[];
  exercisesByDay: Record<string, ProgramExercise[]>;
  blockWeeks?: ProgramWeek[];
};

export default function CoachProgramWeekMiniPreview({
  block,
  week,
  days,
  exercisesByDay,
  blockWeeks,
}: CoachProgramWeekMiniPreviewProps) {
  const sortedDays = useMemo(
    () => [...days].sort((left, right) => left.day_number - right.day_number),
    [days],
  );

  const dayDates = useMemo(
    () => buildProgramWeekDayDates(block, week, sortedDays, blockWeeks),
    [block, week, sortedDays, blockWeeks],
  );

  if (sortedDays.length === 0) {
    return (
      <div className="coach-program-week-mini-preview-empty">
        Geen dagen in deze week.
      </div>
    );
  }

  return (
    <div
      className="coach-program-week-mini-preview"
      style={
        {
          ["--compare-day-count" as string]: String(sortedDays.length),
        } as CSSProperties
      }
    >
      <div className="coach-program-week-mini-preview-grid">
        {sortedDays.map((day) => {
          const exercises = sortExercisesForDay(exercisesByDay[day.id] || []);
          const date = dayDates.get(day.id);

          return (
            <div key={day.id} className="coach-program-week-mini-day">
              <div className="coach-program-week-mini-day-header">
                <p className="coach-program-week-mini-day-title">
                  {formatProgramDayTitle(day.title)}
                </p>
                {date ? (
                  <p className="coach-program-week-mini-day-date">
                    {formatDutchDateWithShortMonth(date)}
                  </p>
                ) : null}
              </div>

              <div className="coach-program-week-mini-day-card">
                {exercises.length === 0 ? (
                  <p className="coach-program-week-mini-empty-day">
                    Geen oefeningen
                  </p>
                ) : (
                  exercises.map((exercise) => (
                    <div
                      key={exercise.id}
                      className="coach-program-week-mini-exercise"
                    >
                      <p className="coach-program-week-mini-exercise-name">
                        {exercise.name || "Oefening"}
                      </p>
                      <div className="coach-program-week-mini-exercise-grid">
                        <span>{exercise.sets || "—"}</span>
                        <span>{exercise.reps || "—"}</span>
                        <span>{exercise.rpe || "—"}</span>
                        <span>{exercise.load || "—"}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
