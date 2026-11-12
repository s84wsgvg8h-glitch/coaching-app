"use client";

import Link from "next/link";

type CoachAthleteHubPanelProps = {
  athleteId: string;
  programHref?: string | null;
};

const hubLinks = (athleteId: string, programHref: string | null | undefined) =>
  [
    {
      href: programHref || `/programs?athlete=${athleteId}`,
      icon: "🏋️",
      title: "Programma",
      description: "Open het trainingsprogramma.",
    },
    {
      href: `/video-gallery?athlete=${athleteId}`,
      icon: "🎥",
      title: "Video's",
      description: "Trainingsvideo's van deze atleet.",
    },
    {
      href: `/video-review?athlete=${athleteId}`,
      icon: "🎬",
      title: "Video review",
      description: "Beoordeel ingediende lifts.",
    },
    {
      href: `/meet-week?athlete=${athleteId}`,
      icon: "🏁",
      title: "Meet-week",
      description: "Countdown, checklist en wedstrijdvoorbereiding.",
    },
    {
      href: `/planning?athlete=${athleteId}`,
      icon: "🗓️",
      title: "Planning",
      description: "Kalender met blocks, weken en macrocycli.",
    },
    {
      href: `/profile/${athleteId}`,
      icon: "👤",
      title: "Profiel",
      description: "Gegevens, doelen en wedstrijden.",
    },
    {
      href: `/chat?athlete=${athleteId}&from=${encodeURIComponent(`/athletes/${athleteId}`)}`,
      icon: "💬",
      title: "Chat",
      description: "Berichten met deze atleet.",
    },
  ] as const;

export default function CoachAthleteHubPanel({
  athleteId,
  programHref,
}: CoachAthleteHubPanelProps) {
  const links = hubLinks(athleteId, programHref);

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="ui-panel app-focus-ring group flex min-h-[44px] items-start gap-3 transition-all duration-200 hover:border-app-border-strong hover:bg-app-surface-hover"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-accent/15 text-xl">
              {item.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-semibold text-app-text">{item.title}</span>
              <span className="mt-0.5 block text-[13px] text-app-muted">{item.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
