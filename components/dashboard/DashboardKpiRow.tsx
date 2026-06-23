"use client";

import { StatCard } from "@/components/ui/design-system";
import type { CoachDashboardMetrics } from "@/lib/coachDashboardFeed";

const items = [
  {
    key: "athletes",
    label: "Atleten",
    href: "/athletes",
    value: (m: CoachDashboardMetrics) => m.athleteCount,
    trend: (m: CoachDashboardMetrics) => {
      if (m.athleteCount === 0) return undefined;
      if (m.attentionAthletes > 0) {
        return `${m.activeAthletes} actief · ${m.attentionAthletes} aandacht`;
      }
      return `${m.activeAthletes} actief`;
    },
    trendTone: (m: CoachDashboardMetrics) =>
      m.attentionAthletes > 0 ? ("accent" as const) : ("neutral" as const),
  },
  {
    key: "tasks",
    label: "Open tasks",
    href: "/todo",
    value: (m: CoachDashboardMetrics) => m.openCheckIns,
    trend: (m: CoachDashboardMetrics) =>
      m.openCheckIns > 0 ? "Actie vereist vandaag" : "Alles bijgewerkt",
    trendTone: (m: CoachDashboardMetrics) =>
      m.openCheckIns > 0 ? ("accent" as const) : ("neutral" as const),
  },
  {
    key: "messages",
    label: "Ongelezen berichten",
    href: "/chat",
    value: (m: CoachDashboardMetrics) => m.unreadMessages,
    trend: (m: CoachDashboardMetrics) =>
      m.messagesLast24h > 0
        ? `+${m.messagesLast24h} sinds gisteren`
        : m.unreadMessages > 0
          ? "Wacht op antwoord"
          : "Inbox leeg",
    trendTone: (m: CoachDashboardMetrics) =>
      m.unreadMessages > 0 || m.messagesLast24h > 0
        ? ("accent" as const)
        : ("neutral" as const),
  },
] as const;

type DashboardKpiRowProps = {
  metrics: CoachDashboardMetrics;
};

export default function DashboardKpiRow({ metrics }: DashboardKpiRowProps) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-2.5">
      {items.map((item) => (
        <StatCard
          key={item.key}
          label={item.label}
          value={item.value(metrics)}
          href={item.href}
          trend={item.trend(metrics)}
          trendTone={item.trendTone(metrics)}
        />
      ))}
    </div>
  );
}
