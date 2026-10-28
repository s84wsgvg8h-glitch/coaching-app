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
      description: "Kies een atleet en start met coachen.",
    },
    {
      href: "/kennisbank",
      icon: "📚",
      title: "Kennisbank & AI-vragen",
      description: "Curated kennis en atleten-AI vragen.",
    },
    {
      href: "/agenda",
      icon: "🗓️",
      title: "Agenda",
      description: "Afspraken en planning.",
    },
    {
      href: "/wedstrijd-kalender",
      icon: "📅",
      title: "Wedstrijd kalender",
      description: "Bekijk en beheer wedstrijden.",
    },
    {
      href: "/data",
      icon: "📈",
      title: "Data",
      description: "Statistieken, grafieken en ruwe data.",
    },
    {
      href: "/leaderboard",
      icon: "🏆",
      title: "Leaderboard",
      description: "Bekijk rankings en prestaties.",
    },
    {
      href: "/oefeningenbibliotheek",
      icon: "📖",
      title: "Oefeningenbibliotheek",
      description: "Uitlegvideo's per oefening.",
    },
    {
      href: "/betalingen",
      icon: "💳",
      title: "Betalingen",
      description: "Maandprijzen en Stripe-abonnementen per atleet.",
    },
    {
      href: "/organisatie",
      icon: "🏢",
      title: "Organisatie",
      description: "Geboortedata en lidnummers van alle atleten.",
    },
    {
      href: "/merch",
      icon: "👕",
      title: "Merch",
      description: "Teamkleding en merchandise.",
    },
    {
      href: "/limitless-data",
      icon: "📊",
      title: "Limitless Data",
      description: "Voeg atleten toe en beheer lidgegevens.",
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
      href: "/data",
      icon: "📈",
      title: "Voortgang & video's",
      description: "Statistieken en trainingsvideo's.",
    },
    {
      href: "/meet-week",
      icon: "🏁",
      title: "Meet-week",
      description: "Countdown, checklist en wedstrijdinfo.",
    },
    {
      href: "/merch",
      icon: "👕",
      title: "Merch",
      description: "Teamkleding bestellen.",
    },
    {
      href: "/chat",
      icon: "💬",
      title: "Chat met coach",
      description: "Stel vragen aan je coach.",
      badge: chatUnreadCount,
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
      "/data",
      "/merch",
      "/athletes",
      "/oefeningenbibliotheek",
      "/video-review",
      "/leaderboard",
      "/meet-week",
    ]);

    return [
      ...coachLinks.filter((link) => !adminExcluded.has(link.href)),
      ...adminLinks,
    ];
  }

  return isCoachLikeRole(role) ? coachLinks : athleteLinks;
}

export type NavGroup = {
  label: string;
  links: NavLink[];
};

const COACH_GROUP_MAP: Record<string, NavGroup["label"]> = {
  "/dashboard": "Main",
  "/kennisbank": "Coaching",
  "/wedstrijd-kalender": "Coaching",
  "/planning": "Coaching",
  "/meet-week": "Coaching",
  "/data": "Data",
  "/leaderboard": "Data",
  "/oefeningenbibliotheek": "Data",
  "/video-review": "Data",
  "/video-gallery": "Data",
  "/programs": "Data",
  "/merch": "Admin",
  "/betalingen": "Admin",
  "/organisatie": "Admin",
  "/limitless-data": "Admin",
  "/admin": "Admin",
};

export function getNavGroups(
  role: string,
  pendingCount = 0,
  chatUnreadCount = 0,
): NavGroup[] {
  const links = getNavLinks(role, pendingCount, chatUnreadCount);
  const order: NavGroup["label"][] = ["Main", "Coaching", "Data", "Admin"];
  const buckets = new Map<NavGroup["label"], NavLink[]>();

  for (const link of links) {
    const label = COACH_GROUP_MAP[link.href] || "Main";
    if (!buckets.has(label)) buckets.set(label, []);
    buckets.get(label)!.push(link);
  }

  if (!isCoachLikeRole(role)) {
    return [{ label: "Main", links }];
  }

  return order
    .filter((label) => (buckets.get(label)?.length || 0) > 0)
    .map((label) => ({ label, links: buckets.get(label)! }));
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
      pathname.startsWith("/athletes/") ||
      pathname === "/atleten-overzicht" ||
      pathname === "/athlete-profiles" ||
      pathname.startsWith("/profile/")
    );
  }

  if (href === "/kennisbank") {
    return pathname === "/kennisbank" || pathname === "/ai-vragen";
  }

  if (href === "/data") {
    return (
      pathname === "/data" ||
      pathname === "/statistics" ||
      pathname === "/raw-data" ||
      pathname === "/video-gallery" ||
      pathname === "/video-review" ||
      pathname === "/programs" ||
      pathname.startsWith("/programs/")
    );
  }

  if (href === "/agenda") {
    return pathname === "/agenda" || pathname.startsWith("/agenda/");
  }

  if (href === "/meet-week") {
    return (
      pathname === "/meet-week" ||
      pathname === "/wedstrijd-kalender" ||
      pathname === "/wedstrijd-checklist"
    );
  }

  if (href === "/programs") {
    return pathname === "/programs" || pathname.startsWith("/programs/");
  }

  if (href === "/betalingen") {
    return pathname === "/betalingen" || pathname === "/coach/subscriptions";
  }

  if (href === "/settings/competition-checklist") {
    return (
      pathname === "/settings/competition-checklist" ||
      pathname === "/wedstrijd-checklist"
    );
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

const PAGE_TITLE_OVERRIDES: Record<string, string> = {
  "/intake": "Intake",
  "/signup": "Account",
  "/login": "Inloggen",
  "/agenda": "Agenda",
  "/invulscore": "Invulscore",
  "/doelen": "Doelen",
  "/planning": "Planning",
  "/atleten-overzicht": "Atleten overzicht",
  "/athlete-profiles": "Atleten profielen",
  "/organisatie": "Organisatie",
  "/coach/subscriptions": "Betalingen",
  "/ai-vragen": "AI-vragen",
  "/statistics": "Statistieken",
  "/raw-data": "Ruwe data",
};

export function getPageTitle(pathname: string, role: string) {
  const links = getNavLinks(role);
  const match = links.find((link) => isActiveNavPath(pathname, link.href));
  if (match) return match.title;

  for (const [prefix, title] of Object.entries(PAGE_TITLE_OVERRIDES)) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return title;
    }
  }

  if (pathname.startsWith("/profile/")) return "Atleet profiel";
  if (pathname.startsWith("/programs/")) return "Programma";
  if (pathname.startsWith("/athletes/")) return "Atleet hub";

  return "Dashboard";
}
