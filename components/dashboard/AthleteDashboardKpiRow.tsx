"use client";

import {
  Dumbbell,
  ListChecks,
  MessageCircle,
} from "lucide-react";
import DashboardKpiCard from "@/components/dashboard/DashboardKpiCard";
import QuickBodyweightLog from "@/components/dashboard/QuickBodyweightLog";
import AthleteWeeklyFillScoreCard from "@/components/dashboard/AthleteWeeklyFillScoreCard";
import { useAthleteCoachChatPreview } from "@/hooks/useAthleteCoachChatPreview";
import { useAthleteDashboardItems } from "@/hooks/useAthleteDashboardItems";

type AthleteDashboardKpiRowProps = {
  athleteId: string;
  weeklyFillScore: number | null;
  fillScoreLoading?: boolean;
  activeProgramLabel?: string;
  hasProgram?: boolean;
};

function openTodoCount(items: ReturnType<typeof useAthleteDashboardItems>["data"]) {
  if (!items) return 0;
  return items.filter((item) => !item.completed).length;
}

export default function AthleteDashboardKpiRow({
  athleteId,
  weeklyFillScore,
  fillScoreLoading = false,
  activeProgramLabel = "Actief",
  hasProgram = true,
}: AthleteDashboardKpiRowProps) {
  const { data: preview } = useAthleteCoachChatPreview(athleteId, Boolean(athleteId));
  const { data: items } = useAthleteDashboardItems(athleteId, Boolean(athleteId));

  const unread = preview?.unreadCount ?? 0;
  const todosOpen = openTodoCount(items);

  return (
    <div className="athlete-dashboard-kpi-row">
      <div className="athlete-dashboard-kpi-slot">
        <AthleteWeeklyFillScoreCard
          percentage={weeklyFillScore}
          loading={fillScoreLoading}
        />
      </div>
      <div className="athlete-dashboard-kpi-slot">
        <QuickBodyweightLog athleteId={athleteId} variant="athlete" />
      </div>
      <DashboardKpiCard
        label="Berichten"
        value={unread}
        hint={unread > 0 ? `${unread} ongelezen` : "Geen ongelezen berichten"}
        href="/chat"
        tone="green"
        icon={<MessageCircle className="h-4 w-4" strokeWidth={1.75} />}
        ariaLabel="Naar chat"
      />
      <DashboardKpiCard
        label="Taken vandaag"
        value={todosOpen}
        hint={todosOpen > 0 ? "Openstaand" : "Alles bij"}
        href="/todo"
        tone="orange"
        icon={<ListChecks className="h-4 w-4" strokeWidth={1.75} />}
        ariaLabel="Naar taken"
      />
      <DashboardKpiCard
        label="Programma"
        value={hasProgram ? "Actief" : "—"}
        hint={activeProgramLabel}
        href="/programs"
        tone="blue"
        icon={<Dumbbell className="h-4 w-4" strokeWidth={1.75} />}
        ariaLabel="Naar programma"
      />
    </div>
  );
}
