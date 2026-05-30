import { isCoachLikeRole } from "@/lib/authRoles";

export type NavLink = {
  href: string;
  icon: string;
  title: string;
  description: string;
  badge?: number;
};

export function getNavLinks(
  role: string,
  pendingCount = 0,
  chatUnreadCount = 0,
): NavLink[] {
  const coachLinks: NavLink[] = [
    {
      href: "/dashboard",
      icon: "🏠",
      title: "Dashboard",
      description: "Ga terug naar het dashboard.",
    },
    {
      href: "/kennisbank",
      icon: "📚",
      title: "Kennisbank",
      description: "Bekijk alle AI-kennis chunks.",
    },
    {
      href: "/ai-vragen",
      icon: "✨",
      title: "AI-vragen",
      description: "Bekijk atleten-AI vragen en ontbrekende kennis.",
    },
    {
      href: "/atleten-overzicht",
      icon: "📋",
      title: "Atleten overzicht",
      description: "Filter atleten op invulscore en bodyweight.",
    },
    {
      href: "/todo",
      icon: "✅",
      title: "To-do",
      description: "Taken en programma-meldingen.",
    },
    {
      href: "/athletes",
      icon: "👥",
      title: "Atleten",
      description: "Beheer atleten, profielen en uitnodigingen.",
      badge: pendingCount,
    },
    {
      href: "/programs",
      icon: "🏋️",
      title: "Programma's",
      description: "Maak trainingsschema's aan.",
    },
    {
      href: "/video-gallery",
      icon: "🎥",
      title: "Video gallery",
      description: "Bekijk alle video's.",
    },
    {
      href: "/oefeningenbibliotheek",
      icon: "📖",
      title: "Oefeningenbibliotheek",
      description: "Uitlegvideo's per oefening.",
    },
    {
      href: "/data",
      icon: "📈",
      title: "Data",
      description: "Statistieken, grafieken en ruwe data.",
    },
    {
      href: "/merch",
      icon: "👕",
      title: "Merch",
      description: "Teamkleding en merchandise.",
    },
    {
      href: "/chat",
      icon: "💬",
      title: "Chat",
      description: "Stuur berichten naar atleten.",
      badge: chatUnreadCount,
    },
    {
      href: "/wedstrijd-kalender",
      icon: "📅",
      title: "Wedstrijd kalender",
      description: "Bekijk en beheer wedstrijden.",
    },
    {
      href: "/limitless-data",
      icon: "📊",
      title: "Limitless Data",
      description: "Voeg atleten toe en beheer lidgegevens.",
    },
    {
      href: "/leaderboard",
      icon: "🏆",
      title: "Leaderboard",
      description: "Bekijk rankings en prestaties.",
    },
    {
      href: "/invulscore",
      icon: "📊",
      title: "Invulscore",
      description: "Programma invulscore per atleet.",
    },
  ];

  const athleteLinks: NavLink[] = [
    {
      href: "/dashboard",
      icon: "🏠",
      title: "Dashboard",
      description: "Ga terug naar het dashboard.",
    },
    {
      href: "/programs",
      icon: "🏋️",
      title: "Programma's",
      description: "Bekijk je trainingsprogramma's.",
    },
    {
      href: "/video-gallery",
      icon: "🎥",
      title: "Video gallery",
      description: "Bekijk je video's.",
    },
    {
      href: "/oefeningenbibliotheek",
      icon: "📖",
      title: "Oefening uitleg",
      description: "Bekijk uitlegvideo's van oefeningen.",
    },
    {
      href: "/data",
      icon: "📈",
      title: "Voortgang",
      description: "Bekijk je statistieken.",
    },
    {
      href: "/doelen",
      icon: "🎯",
      title: "Doelen",
      description: "Stel liftdoelen en volg je voortgang.",
    },
    {
      href: "/wedstrijd-checklist",
      icon: "✅",
      title: "Wedstrijd checklist",
      description: "Paklijst voor powerlifting wedstrijden.",
    },
    {
      href: "/merch",
      icon: "👕",
      title: "Merch",
      description: "Teamkleding en merchandise.",
    },
    {
      href: "/chat",
      icon: "💬",
      title: "Chat met coach",
      description: "Stel vragen aan je coach.",
      badge: chatUnreadCount,
    },
    {
      href: "/kennisbank",
      icon: "📚",
      title: "Kennisbank",
      description: "Onderwerpen voor de AI-assistent in chat.",
    },
    {
      href: "/wedstrijd-kalender",
      icon: "📅",
      title: "Wedstrijd kalender",
      description: "Bekijk je aankomende wedstrijden.",
    },
    {
      href: "/leaderboard",
      icon: "🏆",
      title: "Leaderboard",
      description: "Bekijk rankings en prestaties.",
    },
  ];

  const adminLinks: NavLink[] = [
    {
      href: "/admin",
      icon: "🛡️",
      title: "Admin",
      description: "Bekijk alle geregistreerde gebruikers.",
    },
  ];

  if (role === "admin") {
    const adminExcluded = new Set([
      "/video-gallery",
      "/limitless-data",
      "/programs",
      "/invulscore",
      "/atleten-overzicht",
      "/data",
      "/merch",
      "/athletes",
    ]);

    return [
      ...coachLinks.filter((link) => !adminExcluded.has(link.href)),
      ...adminLinks,
    ];
  }

  return isCoachLikeRole(role) ? coachLinks : athleteLinks;
}

export function isActiveNavPath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  if (href === "/profile") {
    return (
      pathname === "/profile" ||
      pathname.startsWith("/profile?") ||
      pathname.startsWith("/settings/")
    );
  }

  if (href === "/athletes") {
    return (
      pathname === "/athletes" ||
      pathname === "/athlete-profiles" ||
      pathname.startsWith("/profile/")
    );
  }

  if (href === "/data") {
    return (
      pathname === "/data" ||
      pathname === "/statistics" ||
      pathname === "/raw-data"
    );
  }

  if (href === "/settings/competition-checklist") {
    return (
      pathname === "/settings/competition-checklist" ||
      pathname === "/wedstrijd-checklist"
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
