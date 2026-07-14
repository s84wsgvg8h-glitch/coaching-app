"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  dismissPeriodizationAlert,
  loadActivePeriodizationAlerts,
  type PeriodizationAlert,
} from "@/lib/periodizationAlerts";

type CoachAlertsWidgetProps = {
  coachId: string;
  role: string;
};

export default function CoachAlertsWidget({
  coachId,
  role,
}: CoachAlertsWidgetProps) {
  const [alerts, setAlerts] = useState<PeriodizationAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const rows = await loadActivePeriodizationAlerts(coachId, role);
      setAlerts(rows);
      setLoading(false);
    }

    void load();
  }, [coachId, role]);

  async function handleDismiss(id: string) {
    await dismissPeriodizationAlert(id);
    setAlerts((current) => current.filter((a) => a.id !== id));
  }

  if (loading) {
    return (
      <div className="app-card">
        <p className="text-sm text-app-muted">Alerts laden...</p>
      </div>
    );
  }

  if (alerts.length === 0) return null;

  return (
    <div className="app-card">
      <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
        Periodisatie alerts
      </p>
      <ul className="mt-3 space-y-2">
        {alerts.slice(0, 5).map((alert) => (
          <li
            key={alert.id}
            className="flex items-start gap-2 rounded-xl border border-app-border bg-app-surface px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <Link
                href={`/profile/${alert.athlete_id}`}
                className="text-sm font-semibold text-app-text hover:text-app-accent"
              >
                {alert.athlete_name || "Atleet"}
              </Link>
              <p className="text-xs text-app-muted">{alert.message}</p>
            </div>
            <button
              type="button"
              onClick={() => void handleDismiss(alert.id)}
              className="shrink-0 rounded p-1 text-app-muted hover:text-app-text app-focus-ring"
              aria-label="Sluiten"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
