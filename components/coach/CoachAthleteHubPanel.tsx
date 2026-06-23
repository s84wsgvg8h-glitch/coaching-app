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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="app-card block transition hover:border-brand-purple/40 hover:shadow-md"
          >
            <span className="text-2xl">{item.icon}</span>
            <p className="mt-3 text-base font-bold text-app-text">{item.title}</p>
            <p className="mt-1 text-sm text-app-muted">{item.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
