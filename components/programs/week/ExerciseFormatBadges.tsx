import type { ProgramExercise } from "@/lib/programWeek/types";
import {
  formatExerciseFormatLabel,
  normalizeExerciseFormat,
} from "@/lib/exerciseFormat";

export default function ExerciseFormatBadges({
  exercise,
}: {
  exercise: Pick<
    ProgramExercise,
    "exercise_format" | "superset_group" | "rest_seconds"
  >;
}) {
  const format = normalizeExerciseFormat(exercise.exercise_format);
  const formatLabel = formatExerciseFormatLabel(format);
  const rest =
    exercise.rest_seconds && Number(exercise.rest_seconds) > 0
      ? `${exercise.rest_seconds}s rust`
      : null;

  if (!formatLabel && !exercise.superset_group && !rest) return null;

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {formatLabel ? (
        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-400">
          {formatLabel}
        </span>
      ) : null}
      {exercise.superset_group?.trim() ? (
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-400">
          Groep {exercise.superset_group.trim()}
        </span>
      ) : null}
      {rest ? (
        <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-[10px] font-bold text-app-muted">
          {rest}
        </span>
      ) : null}
    </div>
  );
}
