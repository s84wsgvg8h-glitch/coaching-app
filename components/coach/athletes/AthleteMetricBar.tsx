"use client";

import { useEffect, useRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { athletesGlassBar } from "@/components/coach/athletes/athletesCrmClasses";

type AthleteMetricBarProps = {
  athleteCount: number;
  revenueLabel: string;
  avgFillScoreLabel: string;
  scoresLoading?: boolean;
};

const REVENUE_HIDE_MS = 4500;

function MetricSegment({
  value,
  label,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
}) {
  return (
    <div className="athletes-metric-segment flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-2 py-2.5 text-center sm:px-4 sm:py-3.5">
      <p className="athletes-metric-value truncate">{value}</p>
      <div className="flex min-w-0 items-center justify-center gap-1 athletes-metric-label-row">
        {label}
      </div>
    </div>
  );
}

export default function AthleteMetricBar({
  athleteCount,
  revenueLabel,
  avgFillScoreLabel,
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
      className={`${athletesGlassBar} athletes-metric-bar mb-2 grid grid-cols-3 gap-px overflow-hidden rounded-2xl lg:mb-5`}
    >
      <MetricSegment
        value={String(athleteCount)}
        label={<p className="athletes-metric-label truncate">atleten</p>}
      />
      <MetricSegment
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
              className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-app-subtle transition hover:bg-app-accent/10 hover:text-app-accent app-focus-ring"
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
        value={scoresLoading ? "…" : avgFillScoreLabel}
        label={<p className="athletes-metric-label truncate">gem. invulscore</p>}
      />
    </div>
  );
}
