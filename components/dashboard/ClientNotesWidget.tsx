"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { SectionHeader } from "@/components/ui/design-system";
import {
  formatCoachNoteRelativeTime,
  loadCoachClientNotes,
  type CoachClientNoteRow,
} from "@/lib/coachClientNotes";

type ClientNotesWidgetProps = {
  coachId: string;
  role: string;
};

function athleteInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

export default function ClientNotesWidget({
  coachId,
  role,
}: ClientNotesWidgetProps) {
  const [rows, setRows] = useState<CoachClientNoteRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const notes = await loadCoachClientNotes(coachId, role, 5);
      if (!cancelled) {
        setRows(notes);
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [coachId, role]);

  return (
    <div className="ui-panel dashboard-widget-panel">
      <SectionHeader
        title="Recente cliëntnotities"
        description="Laatste oefening- en check-in notities"
      />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-[13px] text-app-muted">
          Geen recente notities van je atleten.
        </p>
      ) : (
        <ul className="dashboard-client-notes-list">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={row.href} className="dashboard-client-note-row app-focus-ring">
                <span className="dashboard-client-note-avatar">
                  {athleteInitials(row.athleteName)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-[13px] font-semibold text-app-text">
                      {row.athleteName}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-app-muted">
                      {formatCoachNoteRelativeTime(row.updatedAt)}
                    </span>
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-app-muted">
                    {row.snippet}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
