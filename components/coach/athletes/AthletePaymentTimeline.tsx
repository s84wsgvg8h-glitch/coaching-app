"use client";

import { AlertCircle, Check, Clock } from "lucide-react";
import type { MonthlyPaymentEntry, MonthlyPaymentStatus } from "@/lib/athletePayments";

function shortMonth(isoDate: string) {
  return new Date(`${isoDate}T12:00:00`)
    .toLocaleDateString("nl-NL", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function statusLabel(status: MonthlyPaymentStatus) {
  switch (status) {
    case "paid":
      return "Betaald";
    case "overdue":
      return "Overdue";
    default:
      return "Gepland";
  }
}

function cardStyles(status: MonthlyPaymentStatus) {
  switch (status) {
    case "paid":
      return {
        className:
          "athletes-payment-card athletes-payment-card--paid border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
        icon: Check,
        iconClass: "text-emerald-400",
      };
    case "overdue":
      return {
        className:
          "athletes-payment-card athletes-payment-card--overdue border-red-500/30 bg-red-500/15 text-red-400",
        icon: AlertCircle,
        iconClass: "text-red-400",
      };
    default:
      return {
        className:
          "athletes-payment-card athletes-payment-card--planned border-app-border bg-app-surface-muted text-app-muted",
        icon: Clock,
        iconClass: "text-app-subtle",
      };
  }
}

type AthletePaymentTimelineProps = {
  entries: MonthlyPaymentEntry[];
  emptyMessage?: string;
};

export default function AthletePaymentTimeline({
  entries,
  emptyMessage = "Geen betalingsgegevens ingesteld.",
}: AthletePaymentTimelineProps) {
  if (entries.length === 0) {
    return <p className="px-1 py-2 text-[12px] text-app-muted">{emptyMessage}</p>;
  }

  return (
    <div className="flex items-stretch gap-1.5 overflow-x-auto px-1 py-2">
      {entries.map((entry) => {
        const styles = cardStyles(entry.status);
        const Icon = styles.icon;
        const month = shortMonth(entry.isoDate);

        return (
          <div
            key={entry.isoDate}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2 py-1.5 ${styles.className}`}
          >
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-app-bg/40 ${styles.iconClass}`}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="min-w-0 whitespace-nowrap">
              <p className="text-[10px] font-semibold leading-none">{statusLabel(entry.status)}</p>
              <p className="mt-0.5 text-[9px] uppercase tracking-wide opacity-75">{month}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
