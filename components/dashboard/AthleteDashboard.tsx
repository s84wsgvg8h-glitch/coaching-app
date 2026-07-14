"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";
import {
  Activity,
  BarChart3,
  BookOpen,
  CalendarDays,
  ChevronRight,
  Shirt,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import "@/styles/athlete-dashboard.css";
import DashboardAgenda from "@/components/DashboardAgenda";
import FillTodayCta from "@/components/dashboard/FillTodayCta";
import GoalsProgressWidget from "@/components/dashboard/GoalsProgressWidget";
import QuickBodyweightLog from "@/components/dashboard/QuickBodyweightLog";
import AthleteWeeklyFillScoreCard from "@/components/dashboard/AthleteWeeklyFillScoreCard";
import AthleteChatWidget from "@/components/dashboard/AthleteChatWidget";
import AthleteTodosHabitsWidget from "@/components/dashboard/AthleteTodosHabitsWidget";
import AthleteDashboardKpiRow from "@/components/dashboard/AthleteDashboardKpiRow";
import AthleteInboxPanel from "@/components/dashboard/AthleteInboxPanel";

type MobileQuickNavItem = {
  href: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

type DesktopQuickLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const MOBILE_QUICK_NAV: MobileQuickNavItem[] = [
  {
    href: "/data",
    icon: BarChart3,
    title: "Data",
    description: "Statistieken & inzichten",
  },
  {
    href: "/leaderboard",
    icon: Trophy,
    title: "Leaderboard",
    description: "Ranglijsten & records",
  },
  {
    href: "/merch",
    icon: Shirt,
    title: "Merch",
    description: "Teamkleding & gear",
  },
  {
    href: "/meet-week",
    icon: CalendarDays,
    title: "Meet-week",
    description: "Wedstrijden & planning",
  },
];

const DESKTOP_QUICK_LINKS: DesktopQuickLink[] = [
  { href: "/data", icon: BarChart3, label: "Data" },
  { href: "/invulscore", icon: Activity, label: "Invulscore" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/merch", icon: Shirt, label: "Merch" },
  { href: "/meet-week", icon: CalendarDays, label: "Meet-week" },
  { href: "/kennisbank", icon: BookOpen, label: "Kennisbank" },
];

type AthleteDashboardProps = {
  userId: string;
  fullName: string;
  role: string;
  weeklyFillScore: number | null;
  fillScoreLoading?: boolean;
  programHref?: string | null;
  programLoading?: boolean;
  hasProgram?: boolean;
};

export default function AthleteDashboard({
  userId,
  role,
  weeklyFillScore,
  fillScoreLoading = false,
  programHref = null,
  programLoading = false,
  hasProgram = true,
}: AthleteDashboardProps) {
  const programLabel = hasProgram ? "Week actief" : "Geen programma";

  useEffect(() => {
    trackEvent("dashboard_view", { role: "atleet" });
  }, []);

  return (
    <div className="athlete-dashboard athlete-dashboard--mobile-fit w-full">
      <div className="flex min-h-0 flex-1 flex-col lg:hidden">
        <div className="athlete-dashboard-bento">
          <div className="athlete-dashboard-bento-metrics">
            <AthleteWeeklyFillScoreCard
              percentage={weeklyFillScore}
              loading={fillScoreLoading}
            />
            <QuickBodyweightLog athleteId={userId} variant="athlete" />
          </div>

          <div className="athlete-dashboard-bento-cta">
            <FillTodayCta
              athleteId={userId}
              variant="athlete"
              surface="mobile"
              programHref={programHref}
              programLoading={programLoading}
              hasProgram={hasProgram}
            />
          </div>

          <div className="athlete-dashboard-bento-chat">
            <AthleteChatWidget athleteId={userId} />
          </div>

          <div className="athlete-dashboard-bento-agenda">
            <DashboardAgenda role={role} userId={userId} variant="athlete" />
          </div>
        </div>

        <div className="athlete-dashboard-bottom-dock max-lg:flex max-lg:flex-col max-lg:gap-3">
          <div className="athlete-dashboard-bento-todos max-lg:flex max-lg:flex-col">
            <AthleteTodosHabitsWidget athleteId={userId} />
          </div>

          <section className="athlete-dashboard-quicklinks athlete-dashboard-quicklinks--mobile max-lg:block">
            <div className="athlete-dashboard-quicklinks-scroll">
              {MOBILE_QUICK_NAV.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="athlete-dashboard-quicknav-card app-focus-ring"
                  >
                    <Icon className="athlete-dashboard-quicknav-icon" aria-hidden="true" />
                    <span className="sr-only">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="athlete-dashboard-cockpit hidden lg:flex">
        <div className="athlete-dashboard-cockpit-kpi">
          <AthleteDashboardKpiRow
            athleteId={userId}
            weeklyFillScore={weeklyFillScore}
            fillScoreLoading={fillScoreLoading}
            activeProgramLabel={programLabel}
            hasProgram={hasProgram}
          />
        </div>

        <div className="athlete-dashboard-cockpit-grid">
          <div className="athlete-dashboard-cockpit-cta">
            <FillTodayCta
              athleteId={userId}
              variant="athlete"
              surface="desktop"
              programHref={programHref}
              programLoading={programLoading}
              hasProgram={hasProgram}
            />
          </div>

          <div className="athlete-dashboard-cockpit-inbox">
            <AthleteInboxPanel athleteId={userId} />
          </div>

          <div className="athlete-dashboard-cockpit-agenda">
            <DashboardAgenda role={role} userId={userId} variant="athlete" />
          </div>

          <div className="athlete-dashboard-cockpit-goals">
            <GoalsProgressWidget athleteId={userId} variant="athlete" />
          </div>

          <div className="athlete-dashboard-cockpit-todos">
            <AthleteTodosHabitsWidget athleteId={userId} />
          </div>
        </div>

        <section className="athlete-dashboard-cockpit-apps" aria-label="Meer in de app">
          <p className="athlete-dashboard-cockpit-apps-label">Meer in de app</p>
          <div className="athlete-dashboard-app-pills">
            {DESKTOP_QUICK_LINKS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="athlete-dashboard-app-pill app-focus-ring"
                >
                  <Icon aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
