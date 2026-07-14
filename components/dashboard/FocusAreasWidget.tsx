"use client";

import { Activity, MessageCircle, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/design-system";
import { useTeamEngagementScore } from "@/hooks/useTeamEngagementScore";
import type { TeamEngagementBreakdown } from "@/lib/teamEngagementScore";

type FocusAreasWidgetProps = {
  coachId: string;
  role: string;
};

const AREA_META: Array<{
  key: keyof TeamEngagementBreakdown;
  label: string;
  hint: string;
  icon: React.ReactNode;
  tone: "accent" | "success" | "warning";
}> = [
  {
    key: "program",
    label: "Programma",
    hint: "Invulscore & logging",
    icon: <Target className="h-4 w-4" strokeWidth={1.75} />,
    tone: "accent",
  },
  {
    key: "checkin",
    label: "Check-ins",
    hint: "Dagelijkse compliance",
    icon: <Activity className="h-4 w-4" strokeWidth={1.75} />,
    tone: "success",
  },
  {
    key: "communication",
    label: "Communicatie",
    hint: "Chat & contact",
    icon: <MessageCircle className="h-4 w-4" strokeWidth={1.75} />,
    tone: "warning",
  },
];

function barToneClass(score: number, tone: "accent" | "success" | "warning") {
  if (score >= 7) {
    return tone === "success"
      ? "bg-emerald-500"
      : tone === "warning"
        ? "bg-amber-400"
        : "bg-app-accent";
  }
  if (score >= 5) return "bg-amber-400";
  return "bg-red-500";
}

export default function FocusAreasWidget({
  coachId,
  role,
}: FocusAreasWidgetProps) {
  const { data, isPending } = useTeamEngagementScore(coachId, role);
  const breakdown = data?.breakdown ?? null;
  const loading = isPending && !data;

  return (
    <div className="ui-panel dashboard-widget-panel">
      <SectionHeader
        title="Focusgebieden"
        description="Team breakdown op basis van engagement"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-12 rounded-xl" />
          ))}
        </div>
      ) : !breakdown ? (
        <p className="text-[13px] text-app-muted">Geen data beschikbaar.</p>
      ) : (
        <ul className="dashboard-focus-areas-list">
          {AREA_META.map((area) => {
            const score = breakdown[area.key];
            const percent = Math.max(0, Math.min(100, (score / 10) * 100));
            return (
              <li key={area.key} className="dashboard-focus-area-row">
                <span className="dashboard-focus-area-icon">{area.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-app-text">
                      {area.label}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums text-app-text">
                      {score.toFixed(1)}
                      <span className="text-[11px] font-medium text-app-muted">
                        /10
                      </span>
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[11px] text-app-muted">
                    {area.hint}
                  </span>
                  <span className="dashboard-focus-area-bar mt-2 block">
                    <span
                      className={`dashboard-focus-area-bar-fill ${barToneClass(score, area.tone)}`}
                      style={{ width: `${percent}%` }}
                    />
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
