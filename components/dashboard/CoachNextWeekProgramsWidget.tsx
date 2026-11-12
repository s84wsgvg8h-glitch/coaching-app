"use client";

import Link from "next/link";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useNextWeekProgramsNeeded } from "@/hooks/useNextWeekProgramsNeeded";
import { isAdminRole } from "@/lib/authRoles";

type CoachNextWeekProgramsWidgetProps = {
  coachId: string;
  role: string;
};

export default function CoachNextWeekProgramsWidget({
  coachId,
  role,
}: CoachNextWeekProgramsWidgetProps) {
  const { data: needs = [], isPending } = useNextWeekProgramsNeeded(
    coachId,
    isAdminRole(role),
  );

  const count = needs.length;

  if (isPending) {
    return (
      <div className="dashboard-next-week-programs-widget">
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="dashboard-next-week-programs-widget ui-panel-compact">
      <div className="flex items-center gap-3">
        <div
          className="dashboard-next-week-programs-icon"
          aria-label={`${count} programma’s`}
        >
          <span className="tabular-nums">{count}</span>
        </div>
        <p className="min-w-0 flex-1 leading-none text-[15px] font-semibold text-app-text">
          {count === 0
            ? "Geen programma’s nodig"
            : count === 1
              ? "Programma nodig"
              : "Programma’s nodig"}
        </p>
      </div>
      {count > 0 ? (
        <ul className="dashboard-next-week-programs-list mt-2.5 space-y-1">
          {needs.map((item) => (
            <li key={item.athleteId}>
              <Link
                href={`/programs?athlete=${item.athleteId}`}
                className="block truncate text-[12px] font-medium text-app-text hover:text-app-accent"
              >
                {item.athleteName}
                <span
                  className={`ml-1 font-normal ${
                    item.dueTone === "overdue"
                      ? "font-semibold text-red-400"
                      : item.dueTone === "today"
                        ? "text-app-text"
                        : "text-app-muted"
                  }`}
                >
                  · {item.dueLabel}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
