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
  const { data: needs = [], isLoading } = useNextWeekProgramsNeeded(
    coachId,
    isAdminRole(role),
  );

  const count = needs.length;

  if (isLoading) {
    return (
      <div className="dashboard-next-week-programs-widget">
        <SkeletonCard />
      </div>
    );
  }

  return (
    <div className="dashboard-next-week-programs-widget ui-panel-compact">
      <div className="flex items-start gap-3">
        <div
          className="dashboard-next-week-programs-icon"
          aria-label={`${count} programma’s`}
        >
          <span className="tabular-nums">{count}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-app-text">
            {count === 0
              ? "Geen nieuwe programma’s nodig"
              : count === 1
                ? "Nieuw programma nodig"
                : "Nieuwe programma’s nodig"}
          </p>
          {count > 0 ? (
            <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto">
              {needs.slice(0, 5).map((item) => (
                <li key={item.athleteId}>
                  <Link
                    href={`/athletes/${item.athleteId}`}
                    className="block truncate text-[12px] font-medium text-app-text hover:text-app-accent"
                  >
                    {item.athleteName}
                    <span className="ml-1 font-normal text-app-muted">
                      {item.reason === "ending_this_week"
                        ? "· loopt af"
                        : "· geen week"}
                    </span>
                  </Link>
                </li>
              ))}
              {count > 5 ? (
                <li className="text-[11px] text-app-muted">+{count - 5} meer</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}
