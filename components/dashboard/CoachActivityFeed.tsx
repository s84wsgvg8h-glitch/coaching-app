"use client";

import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import { SectionHeader } from "@/components/ui/design-system";
import type { DashboardActivityItem } from "@/lib/coachDashboardFeed";

const iconMap: Record<DashboardActivityItem["icon"], string> = {
  checkin: "✓",
  video: "▶",
  message: "💬",
  program: "📋",
  intake: "📝",
  signup: "👤",
  approval: "✓",
};

type CoachActivityFeedProps = {
  items: DashboardActivityItem[];
};

export default function CoachActivityFeed({ items }: CoachActivityFeedProps) {
  const grouped = items.reduce<Record<string, DashboardActivityItem[]>>(
    (acc, item) => {
      if (!acc[item.dayLabel]) acc[item.dayLabel] = [];
      acc[item.dayLabel].push(item);
      return acc;
    },
    {},
  );

  return (
    <div className="dashboard-panel">
      <SectionHeader
        title="Recente activiteit"
        description="Laatste bewegingen in je team"
      />

      {items.length === 0 ? (
        <EmptyState
          icon="generic"
          title="Nog geen activiteit"
          description="Check-ins, video's en berichten verschijnen hier."
        />
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([day, dayItems]) => (
            <div key={day}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                {day}
              </p>
              <ul className="space-y-1">
                {dayItems.map((item) => {
                  const content = (
                    <>
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-app-surface-hover text-[13px]">
                        {iconMap[item.icon]}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-normal text-app-text">
                          {item.label}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-normal tabular-nums text-app-subtle">
                        {item.timeLabel}
                      </span>
                    </>
                  );

                  return (
                    <li key={item.id}>
                      {item.href ? (
                        <Link href={item.href} className="ui-activity-row app-focus-ring">
                          {content}
                        </Link>
                      ) : (
                        <div className="ui-activity-row">{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
