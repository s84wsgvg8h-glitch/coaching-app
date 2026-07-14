"use client";

import { MessageCircle, ListChecks, Users } from "lucide-react";
import DashboardKpiCard from "@/components/dashboard/DashboardKpiCard";
import TeamEngagementWidget from "@/components/dashboard/TeamEngagementWidget";

type CoachDashboardKpiRowProps = {
  coachId: string;
  role: string;
  athleteCount: number;
  activeAthleteCount: number;
  openTodoCount: number;
  unreadMessages: number;
};

export default function CoachDashboardKpiRow({
  coachId,
  role,
  athleteCount,
  activeAthleteCount,
  openTodoCount,
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
      <DashboardKpiCard
        label="Taken vandaag"
        value={openTodoCount}
        hint={openTodoCount > 0 ? "Openstaand vandaag" : "Alles bij"}
        href="/todo"
        ariaLabel="Naar to-do"
        tone="orange"
        icon={<ListChecks className="h-[18px] w-[18px]" strokeWidth={1.75} />}
      />
      <TeamEngagementWidget coachId={coachId} role={role} variant="kpi" />
    </div>
  );
}
