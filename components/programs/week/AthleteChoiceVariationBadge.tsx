import {
  getAthleteVariationBaseName,
  hasAthleteChosenVariation,
  isAthleteChoiceExercise,
} from "@/lib/athleteExerciseVariation";
import type { ProgramExercise } from "@/lib/programWeek/types";

type AthleteChoiceVariationBadgeProps = {
  exercise: Pick<
    ProgramExercise,
    "exercise_format" | "variation_base_name" | "name" | "block_slot_key"
  >;
  variant?: "coach" | "athlete";
};

export default function AthleteChoiceVariationBadge({
  exercise,
  variant = "athlete",
}: AthleteChoiceVariationBadgeProps) {
  if (!isAthleteChoiceExercise(exercise)) return null;

  const baseName = getAthleteVariationBaseName(exercise);
  const chosen = hasAthleteChosenVariation(exercise);
  const className =
    variant === "coach"
      ? "coach-program-exercise-variation-badge"
      : "athlete-program-badge athlete-program-badge--variation";

  return (
    <span
      className={className}
      title={
        chosen
          ? `Gekozen variatie: ${exercise.name?.trim() || ""}`
          : baseName
            ? `Atleet kiest variatie — basis: ${baseName}`
            : "Atleet kiest variatie"
      }
    >
      {chosen ? "Variatie gekozen" : "Atleet kiest variatie"}
    </span>
  );
}
