"use client";

import { formatShortDate, type BwWeekOption } from "@/lib/chatBwData";

type ChatWeekRangeFiltersProps = {
  weekOptions: BwWeekOption[];
  formatWeekLabel: (week: BwWeekOption) => string;
  beginWeekId: string;
  endWeekId: string;
  startDate: string;
  endDate: string;
  minDate?: string;
  maxDate?: string;
  onWeekChange: (beginWeekId: string, endWeekId: string) => void;
  onDateChange: (startDate: string, endDate: string) => void;
  className?: string;
};

export default function ChatWeekRangeFilters({
  weekOptions,
  formatWeekLabel,
  beginWeekId,
  endWeekId,
  startDate,
  endDate,
  minDate,
  maxDate,
  onWeekChange,
  onDateChange,
  className = "",
}: ChatWeekRangeFiltersProps) {
  function handleBeginWeekChange(nextBeginWeekId: string) {
    onWeekChange(nextBeginWeekId, endWeekId);
  }

  function handleEndWeekChange(nextEndWeekId: string) {
    onWeekChange(beginWeekId, nextEndWeekId);
  }

  function handleStartDateChange(nextStartDate: string) {
    onDateChange(nextStartDate, endDate);
  }

  function handleEndDateChange(nextEndDate: string) {
    onDateChange(startDate, nextEndDate);
  }

  function handleClearFilters() {
    onWeekChange("", "");
    if (minDate && maxDate) {
      onDateChange(minDate, maxDate);
    }
  }

  const hasActiveFilter = Boolean(beginWeekId || endWeekId);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-app-subtle">
            Begin week
          </label>
          <select
            value={beginWeekId}
            onChange={(event) => handleBeginWeekChange(event.target.value)}
            className="w-full rounded-xl border border-app-border bg-app-surface-muted px-2 py-2.5 text-sm font-semibold text-app-text outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
          >
            <option value="">Alle weken</option>
            {weekOptions.map((week) => (
              <option key={`begin-${week.id}`} value={week.id}>
                {formatWeekLabel(week)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-app-subtle">
            Eind week
          </label>
          <select
            value={endWeekId}
            onChange={(event) => handleEndWeekChange(event.target.value)}
            className="w-full rounded-xl border border-app-border bg-app-surface-muted px-2 py-2.5 text-sm font-semibold text-app-text outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
          >
            <option value="">Alle weken</option>
            {weekOptions.map((week) => (
              <option key={`end-${week.id}`} value={week.id}>
                {formatWeekLabel(week)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-app-subtle">
            Van datum
          </label>
          <input
            type="date"
            value={startDate}
            min={minDate}
            max={maxDate}
            onChange={(event) => handleStartDateChange(event.target.value)}
            className="w-full rounded-xl border border-app-border bg-app-surface px-2 py-1.5 text-xs font-semibold text-app-text outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-app-subtle">
            Tot datum
          </label>
          <input
            type="date"
            value={endDate}
            min={minDate}
            max={maxDate}
            onChange={(event) => handleEndDateChange(event.target.value)}
            className="w-full rounded-xl border border-app-border bg-app-surface px-2 py-1.5 text-xs font-semibold text-app-text outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
          />
        </div>
      </div>

      {startDate && endDate && (
        <p className="text-center text-xs text-app-muted">
          {formatShortDate(startDate)} – {formatShortDate(endDate)}
        </p>
      )}

      {hasActiveFilter && minDate && maxDate && (
        <button
          type="button"
          onClick={handleClearFilters}
          className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs font-bold text-app-muted transition hover:bg-app-surface-muted"
        >
          Reset naar alle weken
        </button>
      )}
    </div>
  );
}
