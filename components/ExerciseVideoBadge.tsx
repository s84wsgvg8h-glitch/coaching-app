import {
  formatExercisePriorityBadge,
  getExercisePriorityClass,
} from "@/lib/exercisePriority";

type ExerciseVideoBadgeProps = {
  exerciseName: string;
  priority?: string | null;
  className?: string;
};

export default function ExerciseVideoBadge({
  exerciseName,
  priority,
  className = "",
}: ExerciseVideoBadgeProps) {
  const badge = formatExercisePriorityBadge(priority, exerciseName);

  if (!badge) return null;

  return (
    <span
      className={`absolute left-2 top-2 z-10 rounded-full px-2.5 py-1 text-[10px] font-bold shadow ${getExercisePriorityClass(
        priority,
      )} ${className}`}
    >
      {badge}
    </span>
  );
}
