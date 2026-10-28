"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Dumbbell,
  Home,
  LineChart,
  ListChecks,
  MessageCircle,
  Settings,
  Shirt,
  Trophy,
  Video,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useAthleteTrainingHref } from "@/hooks/useAthleteProgramEntry";
import { getUnreadMessageCount } from "@/lib/chatUnread";
import { isActiveNavPath } from "@/lib/navigation";
import { useEffect, useState } from "react";

type SidebarLink = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export default function AthleteAppSidebar() {
  const pathname = usePathname();
  const { userId, role, profile } = useAuth();
  const { href: trainingHref } = useAthleteTrainingHref(
    userId,
    role === "atleet" && Boolean(userId),
  );
  const [chatUnread, setChatUnread] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void getUnreadMessageCount(userId).then((count) => {
      if (!cancelled) setChatUnread(count);
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (role !== "atleet" || !userId) return null;

  const fullName = profile?.full_name || "Atleet";
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  const links: SidebarLink[] = [
    {
      href: "/dashboard",
      label: "Home",
      icon: <Home className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: trainingHref || "/programs",
      label: "Training",
      icon: <Dumbbell className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/chat",
      label: "Chat",
      icon: <MessageCircle className="h-[18px] w-[18px]" strokeWidth={1.75} />,
      badge: chatUnread > 0 ? chatUnread : undefined,
    },
    {
      href: "/todo",
      label: "Taken",
      icon: <ListChecks className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/meet-week",
      label: "Agenda",
      icon: <CalendarDays className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/kennisbank",
      label: "Kennisbank",
      icon: <BookOpen className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/data",
      label: "Data",
      icon: <BarChart3 className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/statistics",
      label: "Statistieken",
      icon: <LineChart className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/video-gallery",
      label: "Video",
      icon: <Video className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/leaderboard",
      label: "Leaderboard",
      icon: <Trophy className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
    {
      href: "/merch",
      label: "Merch",
      icon: <Shirt className="h-[18px] w-[18px]" strokeWidth={1.75} />,
    },
  ];

  return (
    <aside className="athlete-app-sidebar coach-app-sidebar coach-app-sidebar--pinned hidden lg:flex">
      <div className="coach-app-sidebar-brand">
        <span className="coach-app-sidebar-brand-mark" aria-hidden="true">
          A
        </span>
        <span className="coach-app-sidebar-brand-text">Limitless</span>
      </div>

      <nav className="coach-app-sidebar-nav" aria-label="Athlete navigatie">
        {links.map((link) => {
          const active = isActiveNavPath(pathname, link.href);
          return (
            <Link
              key={link.href + link.label}
              href={link.href}
              prefetch
              className={`coach-app-sidebar-link app-focus-ring${active ? " is-active" : ""}`}
              aria-current={active ? "page" : undefined}
            >
              <span className="coach-app-sidebar-link-icon">{link.icon}</span>
              <span className="coach-app-sidebar-link-label">{link.label}</span>
              {link.badge ? (
                <span className="coach-app-sidebar-badge">{link.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="coach-app-sidebar-footer">
        <Link
          href="/profile?section=settings"
          className="coach-app-sidebar-plan app-focus-ring"
        >
          <Settings className="coach-app-sidebar-link-icon" strokeWidth={1.75} />
          <span className="coach-app-sidebar-footer-text">Instellingen</span>
        </Link>
        <Link href="/profile" className="coach-app-sidebar-profile app-focus-ring">
          <span className="coach-app-sidebar-profile-avatar">{initials || "A"}</span>
          <span className="coach-app-sidebar-footer-text truncate">{fullName}</span>
        </Link>
      </div>
    </aside>
  );
}
