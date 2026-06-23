"use client";

import Link from "next/link";
import {
  formatDashboardSummary,
  type CoachDashboardMetrics,
} from "@/lib/coachDashboardFeed";

type DashboardWelcomeHeroProps = {
  fullName: string;
  metrics: CoachDashboardMetrics;
};

export default function DashboardWelcomeHero({
  fullName,
  metrics,
}: DashboardWelcomeHeroProps) {
  return (
    <div className="ui-panel-compact">
      <p className="text-[13px] font-normal text-app-muted">Welkom terug</p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-app-text md:text-[22px]">
        {fullName || "Coach"}
      </h1>
      <p className="mt-2 text-[13px] font-normal leading-relaxed text-app-muted">
        {formatDashboardSummary(metrics)}
      </p>
      <div className="mt-4">
        <Link href="/athletes" className="app-btn-primary">
          Atleten kiezen
        </Link>
      </div>
    </div>
  );
}
