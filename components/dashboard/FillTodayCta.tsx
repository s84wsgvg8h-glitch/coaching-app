"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, ClipboardList } from "lucide-react";
import {
  buildProgramWeekPath,
  resolveProgramEntryForAthlete,
} from "@/lib/programNavigation";
import { trackEvent } from "@/lib/analytics";

type FillTodayCtaProps = {
  athleteId: string;
  variant?: "default" | "athlete";
  surface?: "mobile" | "desktop" | "both";
  programHref?: string | null;
  programLoading?: boolean;
  hasProgram?: boolean;
};

function AthleteMobileTrainingCta({
  href,
  disabled = false,
  onClick,
}: {
  href?: string;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className="athlete-dashboard-hero-card-header">
        <p className="athlete-dashboard-hero-title">
          Log je training van vandaag
        </p>
      </div>
      <span className="athlete-dashboard-hero-action">
        <span>Vandaag invullen</span>
        <ChevronRight className="h-4 w-4 shrink-0 opacity-90" aria-hidden="true" />
      </span>
    </>
  );

  if (disabled) {
    return (
      <span className="athlete-dashboard-hero-card athlete-dashboard-hero-card--training athlete-dashboard-hero-card--disabled">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={href || "/programs"}
      className="athlete-dashboard-hero-card athlete-dashboard-hero-card--training app-focus-ring"
      onClick={onClick}
    >
      {content}
    </Link>
  );
}

export default function FillTodayCta({
  athleteId,
  variant = "default",
  surface = "both",
  programHref: programHrefProp,
  programLoading: programLoadingProp,
  hasProgram: hasProgramProp,
}: FillTodayCtaProps) {
  const [href, setHref] = useState<string | null>(null);
  const [hasProgram, setHasProgram] = useState(true);
  const [loading, setLoading] = useState(true);

  const resolvedExternally =
    programHrefProp !== undefined || programLoadingProp !== undefined;

  useEffect(() => {
    if (resolvedExternally) return;

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
  }, [athleteId, resolvedExternally]);

  const programHref = resolvedExternally ? programHrefProp : href;
  const programLoading = resolvedExternally ? Boolean(programLoadingProp) : loading;
  const programAvailable = resolvedExternally
    ? hasProgramProp !== false
    : hasProgram;

  const showMobile = surface === "mobile" || surface === "both";
  const showDesktop = surface === "desktop" || surface === "both";

  if (variant === "athlete") {
    if (programLoading) {
      if (showMobile) {
        return (
          <div
            className="athlete-dashboard-hero-card athlete-dashboard-hero-card--training athlete-dashboard-hero-card--loading animate-pulse"
            aria-hidden="true"
          />
        );
      }
      if (showDesktop) {
        return (
          <div className="athlete-dashboard-card athlete-dashboard-card--cta athlete-dashboard-card--cta-desktop animate-pulse">
            <div className="h-24 w-full rounded-xl bg-app-surface-hover" />
          </div>
        );
      }
      return null;
    }

    if (!programAvailable) {
      return (
        <>
          {showMobile ? (
            <AthleteMobileTrainingCta disabled />
          ) : null}
          {showDesktop ? (
            <div className="athlete-dashboard-card athlete-dashboard-card--cta athlete-dashboard-card--cta-desktop">
              <div className="min-w-0 flex-1">
                <p className="athlete-dashboard-eyebrow">Vandaag invullen</p>
                <p className="mt-2 text-[17px] font-semibold leading-snug text-app-text">
                  Nog geen programma
                </p>
              </div>
            </div>
          ) : null}
        </>
      );
    }

    return (
      <>
        {showMobile ? (
          <AthleteMobileTrainingCta
            href={programHref || "/programs"}
            onClick={() => trackEvent("training_log_started", { surface: "mobile" })}
          />
        ) : null}

        {showDesktop ? (
          <div className="athlete-dashboard-card athlete-dashboard-card--cta athlete-dashboard-card--cta-desktop">
            <div className="min-w-0 flex-1">
              <p className="athlete-dashboard-eyebrow">Vandaag invullen</p>
              <p className="mt-2 text-[17px] font-semibold leading-snug text-app-text">
                Log je training van vandaag
              </p>
              <p className="athlete-dashboard-card-desc mt-1.5 max-w-md text-[13px] leading-relaxed text-app-muted">
                Houd je progressie op koers door je training van vandaag in te vullen.
              </p>
              <Link
                href={programHref || "/programs"}
                className="athlete-dashboard-start-btn mt-4 inline-flex"
                onClick={() => trackEvent("training_log_started", { surface: "desktop" })}
              >
                Start invullen →
              </Link>
            </div>
            <div className="athlete-dashboard-cta-clipboard" aria-hidden="true">
              <ClipboardList className="h-[72px] w-[72px]" strokeWidth={1.25} />
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (programLoading) {
    return (
      <div className="app-card animate-pulse">
        <div className="h-12 rounded-xl bg-app-surface-hover" />
      </div>
    );
  }

  return (
    <Link
      href={programHref || "/dashboard"}
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
