"use client";

import Link from "next/link";
import "@/styles/athlete-dashboard.css";
import DashboardAgenda from "@/components/DashboardAgenda";
import FillTodayCta from "@/components/dashboard/FillTodayCta";
import GoalsProgressWidget from "@/components/dashboard/GoalsProgressWidget";
import QuickBodyweightLog from "@/components/dashboard/QuickBodyweightLog";
import AthleteWeeklyFillScoreCard from "@/components/dashboard/AthleteWeeklyFillScoreCard";
import AthleteChatWidget from "@/components/dashboard/AthleteChatWidget";

type AthleteDashboardProps = {
  userId: string;
  fullName: string;
  role: string;
  weeklyFillScore: number | null;
};

function welcomeFirstName(fullName: string) {
  const first = fullName.trim().split(/\s+/)[0];
  return first ? first.toLowerCase() : "atleet";
}

export default function AthleteDashboard({
  userId,
  fullName,
  role,
  weeklyFillScore,
}: AthleteDashboardProps) {
  return (
    <div className="athlete-dashboard w-full">
      <header className="athlete-dashboard-header">
        <div>
          <h1 className="athlete-dashboard-title">Dashboard</h1>
          <p className="athlete-dashboard-subtitle">
            Welkom terug, {welcomeFirstName(fullName)}.
          </p>
        </div>
      </header>

      <div className="athlete-dashboard-bento">
        <div className="athlete-dashboard-bento-metrics">
          <AthleteWeeklyFillScoreCard percentage={weeklyFillScore} />
          <QuickBodyweightLog athleteId={userId} variant="athlete" />
        </div>

        <div className="athlete-dashboard-bento-cta">
          <FillTodayCta athleteId={userId} variant="athlete" />
        </div>

        <div className="athlete-dashboard-bento-goals">
          <GoalsProgressWidget athleteId={userId} variant="athlete" />
        </div>

        <div className="athlete-dashboard-bento-chat">
          <AthleteChatWidget athleteId={userId} />
        </div>

        <div className="athlete-dashboard-bento-agenda">
          <DashboardAgenda role={role} userId={userId} variant="athlete" />
        </div>
      </div>

      <section className="athlete-dashboard-quicklinks mt-6">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
          Meer in de app
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/data" className="app-btn-secondary min-h-[44px] text-xs">
            Data
          </Link>
          <Link href="/invulscore" className="app-btn-secondary min-h-[44px] text-xs">
            Invulscore
          </Link>
          <Link href="/leaderboard" className="app-btn-secondary min-h-[44px] text-xs">
            Leaderboard
          </Link>
          <Link href="/merch" className="app-btn-secondary min-h-[44px] text-xs">
            Merch
          </Link>
          <Link href="/meet-week" className="app-btn-secondary min-h-[44px] text-xs">
            Meet-week
          </Link>
          <Link href="/kennisbank" className="app-btn-secondary min-h-[44px] text-xs">
            Kennisbank
          </Link>
        </div>
      </section>
    </div>
  );
}
