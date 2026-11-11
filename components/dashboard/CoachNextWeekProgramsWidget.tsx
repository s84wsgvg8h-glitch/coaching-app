"use client";

import Link from "next/link";
import { CalendarPlus } from "lucide-react";
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
        <div className="dashboard-next-week-programs-icon" aria-hidden="true">
          <CalendarPlus className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
            Volgende week
          </p>
          <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-app-text">
            {count === 0
              ? "Geen nieuwe programma’s nodig"
              : count === 1
                ? "1 nieuw programma nodig"
                : `${count} nieuwe programma’s nodig`}
          </p>
          <p className="mt-1 text-[11px] text-app-muted">
            Blocks die deze week aflopen of zonder planning staan.
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
        {count > 0 ? (
          <span className="shrink-0 rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
            {count}
          </span>
        ) : null}
      </div>
    </div>
  );
}
