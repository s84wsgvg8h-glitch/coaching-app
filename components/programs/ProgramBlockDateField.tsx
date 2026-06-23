"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

type ProgramBlockDateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDate(value: string, deltaDays: number) {
  const base = value ? new Date(`${value}T12:00:00`) : new Date();
  base.setDate(base.getDate() + deltaDays);
  return toDateInputValue(base);
}

export default function ProgramBlockDateField({
  value,
  onChange,
  className = "",
}: ProgramBlockDateFieldProps) {
  return (
    <div className={`space-y-2 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(toDateInputValue(new Date()))}
        className="program-block-date-today"
      >
        Vandaag
      </button>

      <div className="flex items-stretch gap-1.5">
        <div className="program-block-date-stepper" aria-label="Datum aanpassen">
          <button
            type="button"
            onClick={() => onChange(shiftDate(value, 1))}
            className="program-block-date-stepper-btn program-block-date-stepper-btn--up"
            aria-label="Eén dag later"
          >
            <ChevronUp className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => onChange(shiftDate(value, -1))}
            className="program-block-date-stepper-btn program-block-date-stepper-btn--down"
            aria-label="Eén dag eerder"
          >
            <ChevronDown className="h-2.5 w-2.5" aria-hidden="true" />
          </button>
        </div>

        <input
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="program-block-date-input min-w-0 flex-1"
        />
      </div>
    </div>
  );
}

export { toDateInputValue };
