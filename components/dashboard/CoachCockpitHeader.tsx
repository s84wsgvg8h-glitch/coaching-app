"use client";

import {
  dashboardFirstName,
  formatDashboardDate,
  getDashboardGreeting,
} from "@/lib/dashboardGreeting";

type CoachCockpitHeaderProps = {
  fullName: string;
};

export default function CoachCockpitHeader({
  fullName,
}: CoachCockpitHeaderProps) {
  return (
    <header className="dashboard-search-greeting">
      <h1 className="dashboard-search-greeting-title">
        {getDashboardGreeting()}, {dashboardFirstName(fullName)} 👋
      </h1>
      <p className="dashboard-search-greeting-sub">{formatDashboardDate()}</p>
    </header>
  );
}
