"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildProgramWeekPath, resolveProgramEntryForAthlete } from "@/lib/programNavigation";

type FillTodayCtaProps = {
  athleteId: string;
};

export default function FillTodayCta({ athleteId }: FillTodayCtaProps) {
  const [href, setHref] = useState<string | null>(null);
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
      } else {
        setHref("/programs");
      }
      setLoading(false);
    }

    void resolveToday();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="app-card animate-pulse">
        <div className="h-12 rounded-xl bg-app-surface-hover" />
      </div>
    );
  }

  return (
    <Link
      href={href || "/programs"}
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
