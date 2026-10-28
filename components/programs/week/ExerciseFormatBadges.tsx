import { isAthleteExtraExercise } from "@/lib/athleteExtraExercise";
import { isAthleteChoiceExercise } from "@/lib/athleteExerciseVariation";
import {
  formatExerciseFormatLabel,
  normalizeExerciseFormat,
} from "@/lib/exerciseFormat";
import type { ProgramExercise } from "@/lib/programWeek/types";

export default function ExerciseFormatBadges({
  exercise,
}: {
  exercise: Pick<
    ProgramExercise,
    "exercise_format" | "superset_group" | "rest_seconds" | "block_slot_key" | "variation_base_name"
  >;
}) {
  const isExtra = isAthleteExtraExercise(exercise);
  const isAthleteChoice = isAthleteChoiceExercise(exercise);
  const format = normalizeExerciseFormat(exercise.exercise_format);
  const formatLabel = formatExerciseFormatLabel(format);
  const rest =
    exercise.rest_seconds && Number(exercise.rest_seconds) > 0
      ? `${exercise.rest_seconds}s rust`
      : null;

  if (!isExtra && !isAthleteChoice && !formatLabel && !exercise.superset_group && !rest) {
    return null;
  }

  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {isExtra ? (
        <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-400">
          Extra
        </span>
      ) : null}
      {isAthleteChoice ? (
        <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-400">
          Atleet kiest variatie
        </span>
      ) : null}
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
