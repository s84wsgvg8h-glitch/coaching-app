"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import type {
  CoachDashboardMetrics,
  CoachInboxItem,
} from "@/lib/coachDashboardFeed";

export type AttentionAthleteRow = {
  id: string;
  name: string;
  href: string;
  statusLabel: string;
  priority: "high" | "medium";
};

type TodaysFocusProps = {
  metrics: CoachDashboardMetrics;
  inboxItems: CoachInboxItem[];
  attentionAthletes: AttentionAthleteRow[];
};

const priorityDot = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-app-subtle",
} as const;

type FocusRow = {
  id: string;
  label: string;
  detail: string;
  href: string;
  priority: "high" | "medium" | "low";
  count?: number;
  initials?: string;
};

function athleteInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export function buildFocusRows(
  metrics: CoachDashboardMetrics,
  inboxItems: CoachInboxItem[],
  attentionAthletes: AttentionAthleteRow[],
): FocusRow[] {
  const rows: FocusRow[] = [];

  for (const athlete of attentionAthletes.slice(0, 3)) {
    rows.push({
      id: `athlete-${athlete.id}`,
      label: athlete.name,
      detail: athlete.statusLabel,
      href: athlete.href,
      priority: athlete.priority,
      initials: athleteInitials(athlete.name),
    });
  }

  for (const item of inboxItems) {
    rows.push({
      id: item.id,
      label: item.label,
      detail: item.subtitle,
      href: item.href,
      priority: item.priority,
      count: item.count,
    });
  }

  if (metrics.openCheckIns > 0 && !rows.some((row) => row.id === "checkins")) {
    rows.push({
      id: "checkins-fallback",
      label: "Open check-ins",
      detail: `${metrics.openCheckIns} taken wachten op actie`,
      href: "/todo",
      priority: "high",
      count: metrics.openCheckIns,
    });
  }

  if (
    metrics.unreadMessages > 0 &&
    !rows.some((row) => row.id === "messages")
  ) {
    rows.push({
      id: "messages-fallback",
      label: "Nieuwe berichten",
      detail: `${metrics.unreadMessages} onbeantwoord`,
      href: "/chat",
      priority: "high",
      count: metrics.unreadMessages,
    });
  }

  if (
    metrics.competitionsThisWeek > 0 &&
    !rows.some((row) => row.id === "competitions")
  ) {
    rows.push({
      id: "competitions-fallback",
      label: "Komende wedstrijden",
      detail: `${metrics.competitionsThisWeek} deze week gepland`,
      href: "/wedstrijd-kalender",
      priority: "medium",
      count: metrics.competitionsThisWeek,
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return rows
    .sort((a, b) => order[a.priority] - order[b.priority])
    .slice(0, 8);
}

export default function TodaysFocus({
  metrics,
  inboxItems,
  attentionAthletes,
}: TodaysFocusProps) {
  const rows = buildFocusRows(metrics, inboxItems, attentionAthletes);

  return (
    <section className="dashboard-command-center">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-app-text">
            Today&apos;s Focus
          </h2>
          <p className="text-[11px] text-app-muted">Wat nu je aandacht vraagt</p>
        </div>
        <Link
          href="/todo"
          className="text-[11px] font-medium text-app-accent hover:underline"
        >
          Alle taken
        </Link>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Alles is bij"
          description="Geen urgente acties — je team loopt op schema."
          compact
        />
      ) : (
        <ul className="divide-y divide-app-border/70">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="dashboard-focus-row app-focus-ring">
                {row.initials ? (
                  <span className="ui-focus-avatar">{row.initials}</span>
                ) : (
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${priorityDot[row.priority]}`}
                    aria-hidden="true"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-app-text">
                      {row.label}
                    </span>
                    {row.count !== undefined && row.count > 0 ? (
                      <span className="shrink-0 rounded-md bg-app-surface-hover px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-app-muted">
                        {row.count}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-app-muted">
                    {row.detail}
                  </span>
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-app-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
