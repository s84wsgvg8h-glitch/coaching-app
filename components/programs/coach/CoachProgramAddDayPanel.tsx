"use client";

import type { RefObject } from "react";

type CoachProgramAddDayPanelProps = {
  isCreatingDay: boolean;
  setIsCreatingDay: (value: boolean) => void;
  newDayTitle: string;
  setNewDayTitle: (value: string) => void;
  newDayInputRef: RefObject<HTMLInputElement | null>;
  createDay: () => void | Promise<void>;
  className?: string;
};

export default function CoachProgramAddDayPanel({
  isCreatingDay,
  setIsCreatingDay,
  newDayTitle,
  setNewDayTitle,
  newDayInputRef,
  createDay,
  className = "",
}: CoachProgramAddDayPanelProps) {
  return (
    <div className={className}>
      {!isCreatingDay ? (
        <button
          type="button"
          onClick={() => setIsCreatingDay(true)}
          className="coach-program-add-day coach-program-add-day--compact"
        >
          <div className="coach-program-add-day-icon">+</div>
          <p className="coach-program-add-day-title">Nieuwe dag toevoegen</p>
        </button>
      ) : (
        <div className="coach-program-add-day-form coach-program-add-day-form--inline">
          <input
            ref={newDayInputRef}
            value={newDayTitle}
            onChange={(event) => setNewDayTitle(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                void createDay();
              }
              if (event.key === "Escape") {
                setIsCreatingDay(false);
                setNewDayTitle("");
              }
            }}
            placeholder="Bijvoorbeeld: Borst training"
            className="coach-program-inline-form-input coach-program-inline-form-input-name min-w-0 flex-1"
          />
          <div className="coach-program-inline-form-actions shrink-0">
            <button
              type="button"
              onClick={() => void createDay()}
              className="app-btn-primary"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={() => {
                setIsCreatingDay(false);
                setNewDayTitle("");
              }}
              className="app-btn-secondary"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
