"use client";

import type { ProgramWeek } from "@/lib/programWeek/types";

type CoachProgramRawWeekTabsProps = {
  weeks: ProgramWeek[];
  currentWeekId: string;
  onSelectWeek: (weekId: string) => void | Promise<void>;
};

export default function CoachProgramRawWeekTabs({
  weeks,
  currentWeekId,
  onSelectWeek,
}: CoachProgramRawWeekTabsProps) {
  const sortedWeeks = [...weeks].sort(
    (a, b) => a.week_number - b.week_number,
  );

  if (sortedWeeks.length === 0) {
    return (
      <div
        className="coach-program-raw-week-tabs coach-program-raw-week-tabs--placeholder"
        aria-hidden
      >
        <span className="coach-program-raw-week-tab is-placeholder" />
        <span className="coach-program-raw-week-tab is-placeholder" />
        <span className="coach-program-raw-week-tab is-placeholder" />
        <span className="coach-program-raw-week-tab is-placeholder" />
      </div>
    );
  }

  return (
    <div className="coach-program-raw-week-tabs">
      {sortedWeeks.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`coach-program-raw-week-tab ${
            item.id === currentWeekId ? "is-active" : ""
          }`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (item.id === currentWeekId) return;
            void onSelectWeek(item.id);
          }}
        >
          {item.title}
        </button>
      ))}
    </div>
  );
}
