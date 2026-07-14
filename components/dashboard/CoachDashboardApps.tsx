"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  LineChart,
  MessageCircle,
  Shirt,
  Trophy,
  Users,
  Library,
} from "lucide-react";
import {
  CHAT_UNREAD_CHANGED_EVENT,
  getUnopenedConversationCount,
} from "@/lib/chatUnread";

type CoachDashboardAppsProps = {
  userId: string;
  openTodoCount?: number;
  pendingAthleteCount?: number;
};

type DashboardApp = {
  href: string;
  label: string;
  icon: React.ReactNode;
  tone: string;
  badge?: number;
};

export default function CoachDashboardApps({
  userId,
  openTodoCount = 0,
  pendingAthleteCount = 0,
}: CoachDashboardAppsProps) {
  const [chatBadge, setChatBadge] = useState(0);

  useEffect(() => {
    if (!userId) return;

    async function refreshChatBadge() {
      setChatBadge(await getUnopenedConversationCount(userId));
    }

    void refreshChatBadge();
    window.addEventListener(CHAT_UNREAD_CHANGED_EVENT, refreshChatBadge);

    return () => {
      window.removeEventListener(CHAT_UNREAD_CHANGED_EVENT, refreshChatBadge);
    };
  }, [userId]);

  const apps: DashboardApp[] = [
    {
      href: "/chat?from=%2Fdashboard",
      label: "Chat",
      icon: <MessageCircle className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-emerald-500/20 to-emerald-500/5 text-emerald-300",
      badge: chatBadge,
    },
    {
      href: "/todo",
      label: "To-do",
      icon: <ClipboardList className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-sky-500/20 to-sky-500/5 text-sky-300",
      badge: openTodoCount,
    },
    {
      href: "/athletes",
      label: "Atleten",
      icon: <Users className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-violet-500/20 to-violet-500/5 text-violet-300",
      badge: pendingAthleteCount,
    },
    {
      href: "/kennisbank",
      label: "Kennisbank",
      icon: <BookOpen className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-amber-500/20 to-amber-500/5 text-amber-300",
    },
    {
      href: "/agenda",
      label: "Agenda",
      icon: <CalendarDays className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-rose-500/20 to-rose-500/5 text-rose-300",
    },
    {
      href: "/wedstrijd-kalender",
      label: "Wedstrijden",
      icon: <CalendarDays className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-orange-500/20 to-orange-500/5 text-orange-300",
    },
    {
      href: "/data",
      label: "Data",
      icon: <LineChart className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-cyan-500/20 to-cyan-500/5 text-cyan-300",
    },
    {
      href: "/leaderboard",
      label: "Leaderboard",
      icon: <Trophy className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-yellow-500/20 to-yellow-500/5 text-yellow-300",
    },
    {
      href: "/oefeningenbibliotheek",
      label: "Bibliotheek",
      icon: <Library className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-indigo-500/20 to-indigo-500/5 text-indigo-300",
    },
    {
      href: "/merch",
      label: "Merch",
      icon: <Shirt className="h-[16.5px] w-[16.5px]" strokeWidth={1.8} />,
      tone: "from-fuchsia-500/20 to-fuchsia-500/5 text-fuchsia-300",
    },
  ];

  return (
    <div className="dashboard-apps-grid dashboard-apps-grid--mobile-only">
      {apps.map((app) => (
        <Link
          key={app.href}
          href={app.href}
          className="dashboard-app-tile app-focus-ring"
          aria-label={app.label}
        >
          <span
            className={`dashboard-app-icon bg-gradient-to-br ${app.tone}`}
          >
            {app.icon}
            {app.badge && app.badge > 0 ? (
              <span className="dashboard-app-badge">
                {app.badge > 99 ? "99+" : app.badge}
              </span>
            ) : null}
          </span>
          <span className="dashboard-app-tooltip" aria-hidden="true">
            {app.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
