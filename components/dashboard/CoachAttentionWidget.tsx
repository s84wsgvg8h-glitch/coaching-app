"use client";

import Link from "next/link";
import { ArrowRight, MessageCircle, UserRound } from "lucide-react";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useTeamFillScores } from "@/hooks/useTeamFillScores";
import { isAdminRole } from "@/lib/authRoles";

type CoachAttentionWidgetProps = {
  coachId: string;
  role: string;
  compact?: boolean;
};

function scoreTone(score: number) {
  if (score <= 0) return "text-red-400";
  if (score < 50) return "text-amber-400";
  return "text-orange-300";
}

export default function CoachAttentionWidget({
  coachId,
  role,
  compact = false,
}: CoachAttentionWidgetProps) {
  const { data: rows = [], isLoading } = useTeamFillScores(
    coachId,
    isAdminRole(role),
  );

  const attention = rows
    .filter((row) => row.fillScore < 70)
    .sort((a, b) => a.fillScore - b.fillScore)
    .slice(0, compact ? 4 : 6);

  if (isLoading) {
    return <SkeletonCard />;
  }

  return (
    <div className="coach-attention-panel ui-panel-compact h-full">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-semibold tracking-tight text-app-text">
            Atleten die aandacht nodig hebben
          </h2>
          <p className="text-[11px] text-app-muted">
            Lage invulscore afgelopen 7 dagen
          </p>
        </div>
        {attention.length > 0 ? (
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
            {attention.length}
          </span>
        ) : null}
      </div>

      {attention.length === 0 ? (
        <p className="rounded-xl border border-dashed border-app-border px-3 py-4 text-[12px] text-app-muted">
          Iedereen scoort 70%+ — geen directe follow-ups nodig.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {attention.map((athlete) => (
            <li
              key={athlete.athleteId}
              className="coach-attention-row flex items-center gap-2 rounded-xl border border-app-border bg-app-surface px-2.5 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-app-text">
                  {athlete.athleteName}
                </p>
                <p className="text-[11px] text-app-muted">
                  Invulscore{" "}
                  <span
                    className={`font-semibold tabular-nums ${scoreTone(athlete.fillScore)}`}
                  >
                    {athlete.fillScore}%
                  </span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  href={`/athletes/${athlete.athleteId}`}
                  className="coach-attention-action app-focus-ring"
                  aria-label={`Profiel ${athlete.athleteName}`}
                >
                  <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
                <Link
                  href={`/chat?from=${encodeURIComponent("/dashboard")}`}
                  className="coach-attention-action app-focus-ring"
                  aria-label={`Chat met ${athlete.athleteName}`}
                >
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/athletes"
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-app-accent hover:underline"
      >
        Bekijk alle atleten
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </Link>
    </div>
  );
}
