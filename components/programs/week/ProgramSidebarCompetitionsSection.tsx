"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import {
  formatWeeksAfterLastBlockLabel,
  type ProgramSidebarCompetitionEntry,
} from "@/lib/programWeek/competitionSidebar";
import { formatWeeksAndDaysUntilMeetLabel } from "@/lib/meetWeekDisplay";

type ProgramSidebarCompetitionsSectionProps = {
  competitions: ProgramSidebarCompetitionEntry[];
  athleteId: string;
  variant?: "coach" | "athlete";
};

function getMeetWeekHref(athleteId: string, competitionId: string) {
  const params = new URLSearchParams({
    athlete: athleteId,
    competition: competitionId,
  });
  return `/meet-week?${params.toString()}`;
}

export default function ProgramSidebarCompetitionsSection({
  competitions,
  athleteId,
  variant = "coach",
}: ProgramSidebarCompetitionsSectionProps) {
  if (competitions.length === 0 || !athleteId) {
    return null;
  }

  const isCoach = variant === "coach";

  return (
    <section
      className={`program-sidebar-competitions mt-5 ${
        isCoach ? "program-sidebar-competitions--coach" : "program-sidebar-competitions--athlete"
      }`}
      aria-label="Komende wedstrijden"
    >
      <div
        className={
          isCoach
            ? "program-sidebar-competitions-divider border-t border-white/10 pt-5"
            : "program-sidebar-competitions-divider border-t border-app-border pt-5"
        }
      />

      <div className="mb-3 flex items-center gap-2">
        <Trophy
          className={`h-4 w-4 shrink-0 ${isCoach ? "text-amber-300" : "text-amber-500"}`}
          aria-hidden
        />
        <h3
          className={`text-xs font-bold uppercase tracking-wide ${
            isCoach ? "text-gray-300" : "text-app-muted"
          }`}
        >
          Wedstrijden
        </h3>
      </div>

      <div className="space-y-2">
        {competitions.map((competition) => (
          <Link
            key={competition.id}
            href={getMeetWeekHref(athleteId, competition.id)}
            className={
              isCoach
                ? "program-sidebar-competition-card block rounded-2xl border border-white/10 bg-white/[0.04] p-3 transition hover:border-amber-300/30 hover:bg-white/[0.07]"
                : "program-sidebar-competition-card block rounded-2xl border border-app-border bg-app-surface/70 p-3 transition hover:border-amber-500/30 hover:bg-app-surface"
            }
          >
            <p
              className={`truncate text-sm font-bold leading-tight ${
                isCoach ? "text-white" : "text-app-text"
              }`}
            >
              {competition.name}
            </p>
            <p
              className={`mt-1 text-[11px] font-semibold ${
                isCoach ? "text-gray-300" : "text-app-muted"
              }`}
            >
              {competition.dateLabel}
            </p>
            <p
              className={`mt-2 text-[11px] font-bold ${
                isCoach ? "text-amber-200" : "text-amber-600"
              }`}
            >
              {formatWeeksAfterLastBlockLabel(competition.weeksAfterLastBlock)}
            </p>
            <p
              className={`mt-0.5 text-[10px] font-medium ${
                isCoach ? "text-gray-400" : "text-app-muted"
              }`}
            >
              {formatWeeksAndDaysUntilMeetLabel(competition.startDate)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
