"use client";

import Link from "next/link";
import {
  CalendarDays,
  MessageCircle,
  Users,
  Dumbbell,
} from "lucide-react";

export default function CoachDashboardQuickActions({
  variant = "footer",
}: {
  variant?: "footer" | "cockpit";
}) {
  const actions = [
    {
      href: "/athletes",
      label: "Atleten",
      icon: <Users className="h-4 w-4" strokeWidth={1.75} />,
    },
    {
      href: "/chat",
      label: "Chat",
      icon: <MessageCircle className="h-4 w-4" strokeWidth={1.75} />,
    },
    {
      href: "/agenda",
      label: "Agenda",
      icon: <CalendarDays className="h-4 w-4" strokeWidth={1.75} />,
    },
    {
      href: "/programs",
      label: "Programma",
      icon: <Dumbbell className="h-4 w-4" strokeWidth={1.75} />,
    },
  ];

  return (
    <nav
      className={`dashboard-quick-actions ${
        variant === "cockpit" ? "dashboard-quick-actions--cockpit" : ""
      }`}
      aria-label="Snelle acties"
    >
      {actions.map((action) => (
        <Link
          key={action.href + action.label}
          href={action.href}
          className="dashboard-quick-action-btn app-focus-ring"
        >
          {action.icon}
          {action.label}
        </Link>
      ))}
    </nav>
  );
}
