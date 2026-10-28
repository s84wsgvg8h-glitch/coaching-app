"use client";

import { MessageCircle, Users } from "lucide-react";
import DashboardKpiCard from "@/components/dashboard/DashboardKpiCard";

type CoachDashboardKpiRowProps = {
  athleteCount: number;
  activeAthleteCount: number;
  unreadMessages: number;
};

export default function CoachDashboardKpiRow({
  athleteCount,
  activeAthleteCount,
  unreadMessages,
}: CoachDashboardKpiRowProps) {
  return (
    <div className="dashboard-kpi-row">
      <DashboardKpiCard
        label="Atleten"
        value={athleteCount}
        hint={`${activeAthleteCount} actief`}
        href="/athletes"
        ariaLabel="Naar atleten"
        tone="blue"
        icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.75} />}
      />
      <DashboardKpiCard
        label="Berichten"
        value={unreadMessages}
        hint={
          unreadMessages > 0 ? `${unreadMessages} ongelezen` : "Geen ongelezen berichten"
        }
        href="/chat"
        ariaLabel="Naar chat"
        tone="green"
        icon={<MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />}
      />
    </div>
  );
}
