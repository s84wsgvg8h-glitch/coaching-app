"use client";

import { useEffect, useRef, useState } from "react";
import { CreditCard, Eye, EyeOff, Euro, LineChart, Users } from "lucide-react";
import { athletesGlassBar } from "@/components/coach/athletes/athletesCrmClasses";

type AthleteMetricBarProps = {
  athleteCount: number;
  revenueLabel: string;
  avgFillScoreLabel: string;
  overdueCount: number;
  scoresLoading?: boolean;
};

const REVENUE_HIDE_MS = 4500;

function MetricSegment({
  icon,
  value,
  label,
  isLast = false,
}: {
  icon: React.ReactNode;
  value: React.ReactNode;
  label: React.ReactNode;
  isLast?: boolean;
}) {
  return (
    <div
      className={`athletes-metric-segment flex min-w-0 flex-1 items-center gap-3.5 px-4 py-3.5 sm:px-5 sm:py-4 ${
        isLast ? "" : "sm:border-r sm:border-white/[0.08]"
      }`}
    >
      <span className="athletes-metric-icon">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="athletes-metric-value truncate">{value}</p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">{label}</div>
      </div>
    </div>
  );
}

export default function AthleteMetricBar({
  athleteCount,
  revenueLabel,
  avgFillScoreLabel,
  overdueCount,
  scoresLoading = false,
}: AthleteMetricBarProps) {
  const [revenueVisible, setRevenueVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  function revealRevenue() {
    setRevenueVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setRevenueVisible(false);
      hideTimerRef.current = null;
    }, REVENUE_HIDE_MS);
  }

  function toggleRevenueVisibility() {
    if (revenueVisible) {
      setRevenueVisible(false);
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
      return;
    }
    revealRevenue();
  }

  return (
    <div
      className={`${athletesGlassBar} mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl md:grid-cols-4`}
    >
      <MetricSegment
        icon={<Users className="h-5 w-5" />}
        value={String(athleteCount)}
        label={
          <p className="athletes-metric-label truncate">atleten</p>
        }
      />
      <MetricSegment
        icon={<Euro className="h-5 w-5" />}
        value={
          revenueVisible ? (
            revenueLabel
          ) : (
            <span className="tracking-[0.2em] text-app-subtle">•••••</span>
          )
        }
        label={
          <>
            <p className="athletes-metric-label truncate">omzet</p>
            <button
              type="button"
              onClick={toggleRevenueVisibility}
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-app-subtle transition hover:bg-app-accent/10 hover:text-app-accent app-focus-ring"
              title={revenueVisible ? "Omzet verbergen" : "Omzet tonen"}
              aria-label={revenueVisible ? "Omzet verbergen" : "Omzet tonen"}
            >
              {revenueVisible ? (
                <EyeOff className="h-3 w-3" />
              ) : (
                <Eye className="h-3 w-3" />
              )}
            </button>
          </>
        }
      />
      <MetricSegment
        icon={<LineChart className="h-5 w-5" />}
        value={scoresLoading ? "…" : avgFillScoreLabel}
        label={
          <p className="athletes-metric-label truncate">gem. invulscore</p>
        }
      />
      <MetricSegment
        icon={<CreditCard className="h-5 w-5" />}
        value={String(overdueCount)}
        label={
          <p className="athletes-metric-label truncate">overdue betalingen</p>
        }
        isLast
      />
    </div>
  );
}
