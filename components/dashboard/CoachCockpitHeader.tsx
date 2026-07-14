"use client";

import {
  dashboardFirstName,
  formatDashboardDate,
  getDashboardGreeting,
} from "@/lib/dashboardGreeting";

type CoachCockpitHeaderProps = {
  fullName: string;
  athleteCount?: number;
};

export default function CoachCockpitHeader({
  fullName,
  athleteCount,
}: CoachCockpitHeaderProps) {
  const subtitleParts = [formatDashboardDate()];
  if (athleteCount !== undefined) {
    subtitleParts.push(
      athleteCount === 1 ? "1 atleet" : `${athleteCount} atleten`,
    );
  }

  return (
    <header className="dashboard-greeting-header dashboard-greeting-header--mobile-only">
      <h1 className="text-[26px] font-semibold tracking-tight text-app-text md:text-[31px] md:leading-[1.1]">
        {getDashboardGreeting()}, {dashboardFirstName(fullName)}
      </h1>
      <p className="mt-1 text-[13px] font-medium text-app-muted">
        {subtitleParts.join(" · ")}
      </p>
    </header>
  );
}
