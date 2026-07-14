"use client";

type CoachProgramDayHeaderProps = {
  title: string;
  dateLabel: string;
  dateInputValue: string;
  editable?: boolean;
  onTitleChange?: (value: string) => void;
  onTitleBlur?: () => void;
  onDateChange?: (value: string) => void;
};

export default function CoachProgramDayHeader({
  title,
  dateLabel,
  dateInputValue,
  editable = false,
  onTitleChange,
  onTitleBlur,
  onDateChange,
}: CoachProgramDayHeaderProps) {
  return (
    <div className="coach-program-day-header">
      {editable ? (
        <div className="coach-program-day-header-row-inner">
          <input
            value={title}
            onChange={(event) => onTitleChange?.(event.target.value)}
            onBlur={onTitleBlur}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
            className="coach-program-day-pill coach-program-day-pill-title"
            aria-label="Dagnaam"
          />
          <input
            type="date"
            value={dateInputValue}
            onChange={(event) => onDateChange?.(event.target.value)}
            className="coach-program-day-pill coach-program-day-pill-date"
            aria-label="Datum van deze dag"
          />
        </div>
      ) : (
        <div className="coach-program-day-header-row-inner">
          <h2 className="coach-program-day-title">{title}</h2>
          <p className="coach-program-day-date">{dateLabel}</p>
        </div>
      )}
    </div>
  );
}
