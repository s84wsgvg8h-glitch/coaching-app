"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  CalendarDays,
  CreditCard,
  Dumbbell,
  Home,
  LineChart,
  ListChecks,
  MessageCircle,
  Shirt,
  Trophy,
  Users,
  Library,
  Video,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useCoachNavBadges } from "@/hooks/useCoachNavBadges";
import { isCoachLikeRole } from "@/lib/authRoles";
import { isActiveNavPath } from "@/lib/navigation";
import {
  dashboardFirstName,
  formatDashboardDate,
} from "@/lib/dashboardGreeting";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

type SidebarSection = {
  label: string;
  links: SidebarLink[];
};

export default function CoachAppSidebar() {
  const pathname = usePathname();
  const { userId, role, profile } = useAuth();
  const badges = useCoachNavBadges(userId, role || "");

  if (!userId || !isCoachLikeRole(role)) return null;

  const fullName = profile?.full_name || "Coach";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const sections: SidebarSection[] = [
    {
      label: "Main",
      links: [
        {
          href: "/dashboard",
          label: "Dashboard",
          icon: <Home className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/athletes",
          label: "Atleten",
          icon: <Users className="h-[18px] w-[18px]" strokeWidth={1.75} />,
          badge: badges.pendingAthletes > 0 ? badges.pendingAthletes : undefined,
        },
        {
          href: "/chat",
          label: "Chat",
          icon: <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />,
          badge: badges.chat > 0 ? badges.chat : undefined,
        },
        {
          href: "/todo",
          label: "To-do",
          icon: <ListChecks className="h-[18px] w-[18px]" strokeWidth={1.75} />,
          badge: badges.todo > 0 ? badges.todo : undefined,
        },
        {
          href: "/programs",
          label: "Programma's",
          icon: <Dumbbell className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
      ],
    },
    {
      label: "Coaching",
      links: [
        {
          href: "/agenda",
          label: "Agenda",
          icon: <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/kennisbank",
          label: "Kennisbank",
          icon: <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/wedstrijd-kalender",
          label: "Wedstrijden",
          icon: <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
      ],
    },
    {
      label: "Data",
      links: [
        {
          href: "/data",
          label: "Data",
          icon: <LineChart className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/video-review",
          label: "Video review",
          icon: <Video className="h-[18px] w-[18px]" strokeWidth={1.75} />,
          badge: badges.videoReview > 0 ? badges.videoReview : undefined,
        },
        {
          href: "/leaderboard",
          label: "Leaderboard",
          icon: <Trophy className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/oefeningenbibliotheek",
          label: "Bibliotheek",
          icon: <Library className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/merch",
          label: "Merch",
          icon: <Shirt className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/organisatie",
          label: "Organisatie",
          icon: <Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
        {
          href: "/coach/subscriptions",
          label: "Abonnementen",
          icon: <CreditCard className="h-[18px] w-[18px]" strokeWidth={1.75} />,
        },
      ],
    },
  ];

  return (
    <aside className="coach-app-sidebar" aria-label="Coach navigatie">
      <p className="coach-app-sidebar-brand">
        <span className="coach-app-sidebar-brand-mark" aria-hidden="true">
          ∞
        </span>
        <span className="coach-app-sidebar-brand-text">Limitless Coaching</span>
      </p>
      <nav className="coach-app-sidebar-nav-root flex-1">
        {sections.map((section) => (
          <div key={section.label} className="coach-app-sidebar-section">
            <p className="coach-app-sidebar-section-label">{section.label}</p>
            <ul className="coach-app-sidebar-nav">
              {section.links.map((link) => {
                const active = isActiveNavPath(pathname, link.href);
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      prefetch
                      aria-current={active ? "page" : undefined}
                      className={`coach-app-sidebar-link app-focus-ring ${
                        active ? "is-active" : ""
                      }`}
                    >
                      <span className="coach-app-sidebar-link-icon">
                        {link.icon}
                      </span>
                      <span className="coach-app-sidebar-link-label min-w-0 truncate">
                        {link.label}
                      </span>
                      {link.badge && link.badge > 0 ? (
                        <span className="coach-app-sidebar-badge">
                          {link.badge > 99 ? "99+" : link.badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="coach-app-sidebar-footer">
        <Link href="/profile" className="coach-app-sidebar-profile app-focus-ring">
          <span className="coach-app-sidebar-profile-avatar">{initials || "LC"}</span>
          <span className="coach-app-sidebar-footer-text min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-app-text">
              {dashboardFirstName(fullName)}
            </span>
            <span className="block truncate text-[11px] text-app-muted">
              {formatDashboardDate()}
            </span>
          </span>
        </Link>
        <Link href="/betalingen" className="coach-app-sidebar-plan app-focus-ring">
          <CreditCard className="h-4 w-4 shrink-0 text-app-accent" strokeWidth={1.75} />
          <span className="coach-app-sidebar-footer-text min-w-0 flex-1">
            <span className="block text-[12px] font-semibold text-app-text">
              Betalingen
            </span>
            <span className="block text-[10px] text-app-muted">
              Stripe & abonnement
            </span>
          </span>
        </Link>
      </div>
    </aside>
  );
}
