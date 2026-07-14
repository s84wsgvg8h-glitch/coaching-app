"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/design-system";
import {
  loadCoachWeeklySessions,
  type WeeklySessionsSummary,
} from "@/lib/coachWeeklySessions";

type WeeklySessionsWidgetProps = {
  coachId: string;
  role: string;
};

export default function WeeklySessionsWidget({
  coachId,
  role,
}: WeeklySessionsWidgetProps) {
  const [data, setData] = useState<WeeklySessionsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const result = await loadCoachWeeklySessions(coachId, role);
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [coachId, role]);

  const maxTotal = useMemo(
    () => Math.max(1, ...(data?.days.map((day) => day.total) || [1])),
    [data],
  );

  return (
    <div className="ui-panel dashboard-widget-panel">
      <SectionHeader
        title="Sessies deze week"
        description="Geplande afspraken en gelogde trainingen"
        action={
          <Link href="/agenda" className="text-[12px] font-medium text-app-accent hover:underline">
            Agenda
          </Link>
        }
      />

      {loading ? (
        <Skeleton className="h-36 rounded-xl" />
      ) : !data ? (
        <p className="text-[13px] text-app-muted">Kon sessies niet laden.</p>
      ) : (
        <>
          <div
            className="dashboard-sessions-chart"
            role="img"
            aria-label="Sessies per dag deze week"
          >
            {data.days.map((day) => {
              const height = Math.max(8, (day.total / maxTotal) * 100);
              return (
                <div key={day.key} className="dashboard-sessions-chart-col">
                  <div className="dashboard-sessions-chart-bar-wrap">
                    <div
                      className={`dashboard-sessions-chart-bar ${
                        day.isToday ? "is-today" : ""
                      }`}
                      style={{ height: `${height}%` }}
                      title={`${day.label}: ${day.total} sessies`}
                    />
                  </div>
                  <span
                    className={`dashboard-sessions-chart-label ${
                      day.isToday ? "is-today" : ""
                    }`}
                  >
                    {day.label}
                  </span>
                  <span className="dashboard-sessions-chart-value">{day.total}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-app-muted">
            Totaal: <strong className="text-app-text">{data.totalSessions}</strong> sessies
            {" · "}
            Gem. <strong className="text-app-text">{data.averagePerDay}</strong>/dag
          </p>
        </>
      )}
    </div>
  );
}
