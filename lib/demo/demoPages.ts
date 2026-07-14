import {
  DEMO_ATHLETE_1,
  DEMO_ATHLETE_2,
  DEMO_ATHLETE_3,
} from "@/lib/demo/constants";
import type { DemoPersona } from "@/lib/demo/constants";
import {
  DEMO_PROGRAM_BLOCK,
  DEMO_PROGRAM_WEEK,
} from "@/lib/demo/demoProgramGenerator";

export type DemoPageLink = {
  href: string;
  label: string;
  group: string;
  description?: string;
};

const COACH_PROGRAM_WEEK = `/programs/${DEMO_PROGRAM_BLOCK}/weeks/${DEMO_PROGRAM_WEEK}?athlete=${DEMO_ATHLETE_1}`;

const COACH_DEMO_PAGES: DemoPageLink[] = [
  { group: "Hoofd", href: "/dashboard", label: "Dashboard" },
  { group: "Hoofd", href: "/athletes", label: "Atleten" },
  { group: "Hoofd", href: "/chat", label: "Chat" },
  { group: "Hoofd", href: "/todo", label: "To-do" },
  { group: "Atleten", href: `/athletes/${DEMO_ATHLETE_1}`, label: "Sophie van Dijk — hub" },
  { group: "Atleten", href: `/athletes/${DEMO_ATHLETE_2}`, label: "Noah Bakker — hub" },
  { group: "Atleten", href: `/athletes/${DEMO_ATHLETE_3}`, label: "Emma Jansen — hub" },
  { group: "Atleten", href: `/chat/${DEMO_ATHLETE_1}`, label: "Chat met Sophie" },
  { group: "Programma", href: COACH_PROGRAM_WEEK, label: "Programma — Sophie (week)" },
  { group: "Programma", href: `/planning?athlete=${DEMO_ATHLETE_1}`, label: "Planning — Sophie" },
  { group: "Coaching", href: "/kennisbank", label: "Kennisbank" },
  { group: "Coaching", href: "/kennisbank?tab=vragen", label: "AI-vragen" },
  { group: "Coaching", href: "/agenda", label: "Agenda" },
  { group: "Coaching", href: "/meet-week?athlete=${DEMO_ATHLETE_1}", label: "Meet-week — Sophie" },
  { group: "Coaching", href: "/wedstrijd-kalender", label: "Wedstrijd kalender" },
  { group: "Coaching", href: "/video-review", label: "Video review" },
  { group: "Data", href: "/data", label: "Data overzicht" },
  { group: "Data", href: "/statistics", label: "Statistieken" },
  { group: "Data", href: "/raw-data", label: "Ruwe data" },
  { group: "Data", href: "/leaderboard", label: "Leaderboard" },
  { group: "Data", href: "/oefeningenbibliotheek", label: "Oefeningenbibliotheek" },
  { group: "Data", href: "/video-gallery", label: "Video galerij" },
  { group: "Admin", href: "/betalingen", label: "Betalingen" },
  { group: "Admin", href: "/organisatie", label: "Organisatie" },
  { group: "Admin", href: "/merch", label: "Merch shop" },
  { group: "Admin", href: "/limitless-data", label: "Limitless Data" },
  { group: "Account", href: "/profile", label: "Profiel & instellingen" },
];

const ATHLETE_PROGRAM_WEEK = `/programs/${DEMO_PROGRAM_BLOCK}/weeks/${DEMO_PROGRAM_WEEK}`;

const ATHLETE_DEMO_PAGES: DemoPageLink[] = [
  { group: "Hoofd", href: "/dashboard", label: "Dashboard" },
  { group: "Hoofd", href: "/programs", label: "Training / programma" },
  { group: "Hoofd", href: ATHLETE_PROGRAM_WEEK, label: "Programma week (direct)" },
  { group: "Hoofd", href: "/chat", label: "Chat met coach" },
  { group: "Hoofd", href: "/data", label: "Voortgang & data" },
  { group: "Wedstrijd", href: "/meet-week", label: "Meet-week" },
  { group: "Wedstrijd", href: "/wedstrijd-checklist", label: "Wedstrijd checklist" },
  { group: "Wedstrijd", href: "/leaderboard", label: "Leaderboard" },
  { group: "Extra", href: "/merch", label: "Merch shop" },
  { group: "Extra", href: "/video-gallery", label: "Video galerij" },
  { group: "Extra", href: "/statistics", label: "Statistieken" },
  { group: "Account", href: "/profile", label: "Profiel" },
  { group: "Account", href: "/profile?section=athlete", label: "Doelen & atleetprofiel" },
];

export function getDemoPages(persona: DemoPersona): DemoPageLink[] {
  return persona === "atleet" ? ATHLETE_DEMO_PAGES : COACH_DEMO_PAGES;
}

export function groupDemoPages(pages: DemoPageLink[]) {
  const groups = new Map<string, DemoPageLink[]>();
  for (const page of pages) {
    if (!groups.has(page.group)) groups.set(page.group, []);
    groups.get(page.group)!.push(page);
  }
  return [...groups.entries()];
}
