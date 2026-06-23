"use client";

import Link from "next/link";
import EmptyState from "@/components/ui/EmptyState";
import type { CoachInboxItem } from "@/lib/coachDashboardFeed";

const toneDot: Record<CoachInboxItem["tone"], string> = {
  red: "bg-red-500",
  amber: "bg-amber-400",
  blue: "bg-app-accent",
  green: "bg-emerald-500",
};

const typeLabel: Record<CoachInboxItem["type"], string> = {
  checkin: "Check-in",
  message: "Bericht",
  video: "Video",
  competition: "Wedstrijd",
  approval: "Goedkeuring",
};

type CoachInboxPanelProps = {
  items: CoachInboxItem[];
  compact?: boolean;
};

export default function CoachInboxPanel({
  items,
  compact = false,
}: CoachInboxPanelProps) {
  return (
    <div className={compact ? "dashboard-panel h-full" : "ui-panel-compact h-full"}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-app-text">
            Inbox
          </h2>
          <p className="text-[11px] text-app-muted">
            {compact ? "Snelle acties" : "Acties die vandaag aandacht vragen"}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon="chat"
          title="Inbox is leeg"
          description="Geen open check-ins, berichten of reviews."
          compact
        />
      ) : (
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <div className="dashboard-inbox-item">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-1.5 w-1.5 shrink-0 rounded-full ${toneDot[item.tone]}`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-app-text">
                      {typeLabel[item.type]}{" "}
                      <span className="tabular-nums text-app-muted">{item.count}</span>
                    </p>
                    <p className="truncate text-[11px] text-app-subtle">{item.label}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="dashboard-inbox-action app-focus-ring"
                  >
                    {item.actionLabel}
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
