"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  buildProgramWeekPath,
  resolveProgramEntryForAthlete,
} from "@/lib/programNavigation";

type FillTodayCtaProps = {
  athleteId: string;
  variant?: "default" | "athlete";
};

export default function FillTodayCta({
  athleteId,
  variant = "default",
}: FillTodayCtaProps) {
  const [href, setHref] = useState<string | null>(null);
  const [hasProgram, setHasProgram] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveToday() {
      setLoading(true);
      const { data: entry } = await resolveProgramEntryForAthlete(
        athleteId,
        athleteId,
      );

      if (entry) {
        setHref(buildProgramWeekPath(entry));
        setHasProgram(true);
      } else {
        setHref("/programs");
        setHasProgram(false);
      }
      setLoading(false);
    }

    void resolveToday();
  }, [athleteId]);

  if (variant === "athlete") {
    if (loading) {
      return (
        <div className="athlete-dashboard-card athlete-dashboard-card--cta animate-pulse">
          <div className="h-20 rounded-xl bg-white/5" />
        </div>
      );
    }

    return (
      <div className="athlete-dashboard-card athlete-dashboard-card--cta">
        <div className="flex min-w-0 flex-1 flex-col justify-center">
          <p className="athlete-dashboard-eyebrow">Vandaag invullen</p>
          <p className="mt-2 text-[17px] font-semibold leading-snug text-app-text">
            Log je training van vandaag
          </p>
          <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-app-muted">
            {hasProgram
              ? "Houd je progressie op koers door je training van vandaag in te vullen."
              : "Vraag je coach om je programma in te zetten."}
          </p>
        </div>
        {hasProgram ? (
          <Link href={href || "/programs"} className="athlete-dashboard-start-btn">
            Start →
          </Link>
        ) : (
          <span className="athlete-dashboard-start-btn pointer-events-none opacity-50">
            Nog geen programma
          </span>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-card animate-pulse">
        <div className="h-12 rounded-xl bg-app-surface-hover" />
      </div>
    );
  }

  return (
    <Link
      href={href || "/dashboard"}
      className="app-focus-ring app-card flex items-center justify-between gap-4 border-2 border-brand-purple bg-gradient-to-r from-brand-purple/10 to-transparent transition hover:from-brand-purple/15"
    >
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-purple">
          Vandaag invullen
        </p>
        <p className="mt-1 text-lg font-bold text-app-text">
          Log je training van vandaag
        </p>
      </div>
      <span className="app-btn-primary shrink-0">Start →</span>
    </Link>
  );
}
