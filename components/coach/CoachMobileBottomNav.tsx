"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import {
  Home,
  Users,
  MessageCircle,
  ListChecks,
  Dumbbell,
  Video,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useCoachNavBadges } from "@/hooks/useCoachNavBadges";
import { isActiveNavPath } from "@/lib/navigation";

type NavItem = {
  href: string;
  icon: typeof Home;
  title: string;
  badge?: number;
};

export default function CoachMobileBottomNav() {
  const pathname = usePathname();
  const { userId, role } = useAuth();
  const badges = useCoachNavBadges(userId, role || "");

  const links = useMemo<NavItem[]>(() => {
    const programSlot: NavItem =
      badges.videoReview > 0
        ? {
            href: "/video-review",
            icon: Video,
            title: "Video",
            badge: badges.videoReview,
          }
        : {
            href: "/programs",
            icon: Dumbbell,
            title: "Programma",
          };

    return [
      { href: "/dashboard", icon: Home, title: "Home" },
      { href: "/athletes", icon: Users, title: "Atleten" },
      {
        href: "/chat",
        icon: MessageCircle,
        title: "Chat",
        badge: badges.chat > 0 ? badges.chat : undefined,
      },
      {
        href: "/todo",
        icon: ListChecks,
        title: "Todo",
        badge: badges.todo > 0 ? badges.todo : undefined,
      },
      programSlot,
    ];
  }, [badges.chat, badges.todo, badges.videoReview]);

  return (
    <nav
      className="athlete-mobile-tab-bar fixed inset-x-0 bottom-0 z-40 lg:hidden"
      aria-label="Coach mobiele navigatie"
    >
      <div className="grid grid-cols-5">
        {links.map((item) => {
          const active = isActiveNavPath(pathname, item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href + item.title}
              href={item.href}
              prefetch
              aria-current={active ? "page" : undefined}
              className={`app-focus-ring athlete-mobile-tab-bar__item ${
                active ? "is-active" : ""
              }`}
            >
              <span className="athlete-mobile-tab-bar__icon-wrap relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
                {item.badge && item.badge > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-app-accent px-1 text-[9px] font-bold text-white">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </span>
              <span className="athlete-mobile-tab-bar__label">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
