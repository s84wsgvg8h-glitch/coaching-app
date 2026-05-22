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
      href: "/athletes",
      icon: "👥",
      title: "Atleten beheren",
      description: "Bekijk en accepteer atleten.",
      badge: pendingCount,
    },
    {
      href: "/profile",
      icon: "📋",
      title: "Atleten profielen",
      description: "Bekijk profielen en lichaamsgebieden.",
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
      href: "/statistics",
      icon: "📈",
      title: "Statistics",
      description: "Bekijk statistieken en grafieken.",
    },
    {
      href: "/raw-data",
      icon: "🧾",
      title: "Raw Data",
      description: "Bekijk ruwe data.",
    },
    {
      href: "/rpe-tabel",
      icon: "📊",
      title: "RPE tabel",
      description: "Load/RIR chart.",
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
      href: "/statistics",
      icon: "📈",
      title: "Voortgang",
      description: "Bekijk je statistieken.",
    },
    {
      href: "/rpe-tabel",
      icon: "📊",
      title: "RPE tabel",
      description: "Load/RIR chart.",
    },
    {
      href: "/chat",
      icon: "💬",
      title: "Chat met coach",
      description: "Stel vragen aan je coach.",
      badge: chatUnreadCount,
    },
    {
      href: "/wedstrijd-kalender",
      icon: "📅",
      title: "Wedstrijd kalender",
      description: "Bekijk je aankomende wedstrijden.",
    },
    {
      href: "/profile",
      icon: "👤",
      title: "Profiel",
      description: "Bekijk en pas je profiel aan.",
    },
    {
      href: "/leaderboard",
      icon: "🏆",
      title: "Leaderboard",
      description: "Bekijk rankings en prestaties.",
    },
  ];

  return role === "coach" ? coachLinks : athleteLinks;
}

export function isActiveNavPath(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
