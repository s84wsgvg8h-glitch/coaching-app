"use client";

import { Play } from "lucide-react";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";

type AthleteExerciseCardProps = {
  name: string;
  priorityLabel: string;
  priorityClass: string;
  hasLibraryVideo: boolean;
  sets: string;
  reps: string;
  rpe: string;
  kg: string;
  irpe: string;
  kgHighlight?: boolean;
  isSelected?: boolean;
  onOpen: () => void;
  onPreviewVideo?: () => void;
};

export default function AthleteExerciseCard({
  name,
  priorityLabel,
  priorityClass,
  hasLibraryVideo,
  sets,
  reps,
  rpe,
  kg,
  irpe,
  kgHighlight = false,
  isSelected = false,
  onOpen,
  onPreviewVideo,
}: AthleteExerciseCardProps) {
  return (
    <div
      className={`athlete-program-exercise ${isSelected ? "is-selected" : ""}`}
    >
      {hasLibraryVideo ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onPreviewVideo?.();
          }}
          className="athlete-program-exercise-play"
          aria-label={`Uitlegvideo voor ${name}`}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
        </button>
      ) : (
        <div className="athlete-program-exercise-play is-disabled" aria-hidden="true">
          <Play className="h-3.5 w-3.5 opacity-30" />
        </div>
      )}

      <button type="button" onClick={onOpen} className="athlete-program-exercise-main">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-[13px] font-semibold text-app-text">{name}</h3>
            {hasLibraryVideo ? (
              <span className="athlete-program-badge athlete-program-badge--uitleg">
                Uitleg
              </span>
            ) : null}
            {priorityLabel ? (
              <span
                className={`athlete-program-badge athlete-program-badge--priority ${priorityClass}`}
              >
                {priorityLabel}
              </span>
            ) : null}
          </div>

          <div className="athlete-program-exercise-stats">
            <StatCell label="SETS" value={sets} />
            <StatCell label="REPS" value={reps} />
            <StatCell label="RPE" value={rpe} />
            <StatCell
              label="KG"
              value={kg}
              highlight={kgHighlight}
            />
            <StatCell label="isRPE" value={irpe} />
          </div>
        </div>
      </button>
    </div>
  );
}

function StatCell({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="athlete-program-stat">
      <p className="athlete-program-stat-label">{label}</p>
      <p
        className={`athlete-program-stat-value ${
          highlight ? "is-highlight" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

export function getAthletePriorityBadgeClass(priority: string) {
  switch (priority.toLowerCase()) {
    case "primary":
      return "priority-primary";
    case "secondary":
      return "priority-secondary";
    case "tertiary":
      return "priority-tertiary";
    case "quaternary":
      return "priority-quaternary";
    case "quinary":
      return "priority-quinary";
    case "senary":
      return "priority-senary";
    case "septenary":
      return "priority-septenary";
    default:
      return "priority-default";
  }
}

export type { ExerciseLibraryItem };
