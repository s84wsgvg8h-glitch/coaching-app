"use client";

import { useMemo } from "react";
import { formatCompetitionDateRange, type Competition } from "@/lib/competitions";

const ATHLETE_COLORS = [
  "border-app-accent/30 bg-app-accent/10 text-app-accent",
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  "border-amber-500/30 bg-amber-500/10 text-amber-400",
  "border-rose-500/30 bg-rose-500/10 text-rose-400",
  "border-cyan-500/30 bg-cyan-500/10 text-cyan-400",
  "border-violet-500/30 bg-violet-500/10 text-violet-400",
];

type Assignment = {
  athleteId: string;
  athleteName: string;
  competitionId: string;
};

type SeasonPlannerViewProps = {
  competitions: Competition[];
  assignments: Assignment[];
  monthOffset?: number;
};

function monthKey(dateStr: string) {
  return dateStr.slice(0, 7);
}

function competitionStatus(linkedCount: number) {
  if (linkedCount === 0) {
    return { label: "Gepland", variant: "ui-badge-muted" as const };
  }
  return {
    label: `${linkedCount} atleet${linkedCount > 1 ? "en" : ""}`,
    variant: "ui-badge-success" as const,
  };
}

export default function SeasonPlannerView({
  competitions,
  assignments,
  monthOffset = 0,
}: SeasonPlannerViewProps) {
  const athleteColorMap = useMemo(() => {
    const ids = [...new Set(assignments.map((a) => a.athleteId))];
    return Object.fromEntries(
      ids.map((id, index) => [id, ATHLETE_COLORS[index % ATHLETE_COLORS.length]]),
    );
  }, [assignments]);

  const months = useMemo(() => {
    const today = new Date();
    today.setMonth(today.getMonth() + monthOffset);
    const keys = new Set<string>();

    for (let i = 0; i < 3; i += 1) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      keys.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }

    for (const comp of competitions) {
      keys.add(monthKey(comp.start_date));
    }

    return [...keys].sort().slice(0, 3);
  }, [competitions, monthOffset]);

  const competitionsByMonth = useMemo(() => {
    const map = new Map<string, Competition[]>();
    for (const comp of competitions) {
      const key = monthKey(comp.start_date);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(comp);
    }
    return map;
  }, [competitions]);

  const assignmentsByCompetition = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const row of assignments) {
      if (!map.has(row.competitionId)) map.set(row.competitionId, []);
      map.get(row.competitionId)!.push(row);
    }
    return map;
  }, [assignments]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {months.map((month) => {
        const label = new Date(`${month}-01T12:00:00`).toLocaleDateString(
          "nl-NL",
          { month: "long", year: "numeric" },
        );
        const monthComps = competitionsByMonth.get(month) || [];

        return (
          <div key={month} className="ui-panel p-4">
            <h3 className="text-[13px] font-semibold capitalize text-app-text">
              {label}
            </h3>
            {monthComps.length === 0 ? (
              <p className="mt-3 text-[12px] text-app-muted">Geen wedstrijden</p>
            ) : (
              <ul className="mt-3 space-y-2.5">
                {monthComps.map((comp) => {
                  const rows = assignmentsByCompetition.get(comp.id) || [];
                  const status = competitionStatus(rows.length);

                  return (
                    <li
                      key={comp.id}
                      className="rounded-xl border border-app-border bg-app-surface-muted p-3 transition hover:border-app-border-strong hover:bg-app-surface-hover"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13px] font-semibold text-app-text">
                          {comp.naam}
                        </p>
                        <span className={`ui-badge shrink-0 ${status.variant}`}>
                          {status.label}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-app-muted">
                        {formatCompetitionDateRange(
                          comp.start_date,
                          comp.end_date,
                        )}
                      </p>
                      {rows.length > 0 ? (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {rows.map((row) => (
                            <span
                              key={`${comp.id}-${row.athleteId}`}
                              className={`rounded-md border px-2 py-0.5 text-[10px] font-medium ${athleteColorMap[row.athleteId]}`}
                            >
                              {row.athleteName}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-app-subtle">
                          Nog geen atleten gekoppeld
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
