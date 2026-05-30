"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import DashboardSearch from "@/components/DashboardSearch";
import DashboardAgenda from "@/components/DashboardAgenda";
import CoachDashboardWidgets from "@/components/dashboard/CoachDashboardWidgets";
import CoachInvitePanel from "@/components/dashboard/CoachInvitePanel";
import FillTodayCta from "@/components/dashboard/FillTodayCta";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { loadTotalAthleteIncome } from "@/lib/athletePayments";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  formatFillScorePercentage,
  getFillScoreColorClass,
} from "@/lib/athleteFillScore";
import { loadAthleteWeeklyFillScore } from "@/lib/athleteWeeklyFillScore";
import { loadCoachTodos } from "@/lib/coachTodos";
import type { CoachSnapshot } from "@/lib/knowledgeSearch";

type DashboardAthlete = {
  id: string;
  full_name: string | null;
  lidnummer?: string | null;
  betaling_prijs?: number | null;
  betaling_dag?: number | null;
};

export default function DashboardPage() {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [pendingCount, setPendingCount] = useState(0);
  const [totalIncome, setTotalIncome] = useState<number | null>(null);
  const [payingAthleteCount, setPayingAthleteCount] = useState(0);
  const [athletes, setAthletes] = useState<DashboardAthlete[]>([]);
  const [coachSnapshot, setCoachSnapshot] = useState<CoachSnapshot | undefined>();
  const [weeklyFillScore, setWeeklyFillScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [dashboardEditing, setDashboardEditing] = useState(false);
  const [openTodoCount, setOpenTodoCount] = useState(0);

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setRole(data.role || "");
      }

      if (isCoachLikeRole(data?.role)) {
        const [{ count }, incomeResult, athletesResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "pending"),
          loadTotalAthleteIncome(),
          supabase
            .from("profiles")
            .select("id, full_name, lidnummer, betaling_prijs, betaling_dag")
            .eq("role", "atleet")
            .order("full_name", { ascending: true }),
        ]);

        const athleteRows = (athletesResult.error
          ? (
              await supabase
                .from("profiles")
                .select("id, full_name, lidnummer")
                .eq("role", "atleet")
                .order("full_name", { ascending: true })
            ).data
          : athletesResult.data) as DashboardAthlete[] | null;

        setPendingCount(count || 0);
        setTotalIncome(incomeResult.total);
        setPayingAthleteCount(incomeResult.payingAthleteCount);
        setAthletes(athleteRows || []);
        setCoachSnapshot({
          totalIncome: incomeResult.total,
          payingAthleteCount: incomeResult.payingAthleteCount,
          pendingCount: count || 0,
          athletes: (athleteRows || []).map((athlete) => ({
            name: athlete.full_name || "Naamloos",
            href: `/profile/${athlete.id}`,
            lidnummer: athlete.lidnummer || null,
            betalingPrijs:
              athlete.betaling_prijs !== null &&
              athlete.betaling_prijs !== undefined
                ? Number(athlete.betaling_prijs)
                : null,
            betalingDag:
              athlete.betaling_dag !== null && athlete.betaling_dag !== undefined
                ? Number(athlete.betaling_dag)
                : null,
          })),
        });

        const { data: todos } = await loadCoachTodos(
          user.id,
          data?.role === "admin",
        );
        setOpenTodoCount(todos.filter((todo) => !todo.completed).length);
      } else if (data?.role === "atleet") {
        const score = await loadAthleteWeeklyFillScore(
          user.id,
          data.full_name || "Atleet",
        );
        setWeeklyFillScore(score.percentage);
      }

      setLoading(false);
    }

    void getProfile();
  }, []);

  if (loading) {
    return (
      <AppShell contentClassName="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </AppShell>
    );
  }

  const athleteContent = userId ? (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="app-card">
        <h1 className="text-3xl font-bold text-app-text">{fullName || "Dashboard"}</h1>
        <p className="mt-2 text-app-muted">Welkom terug.</p>
        <div className="mt-4 rounded-2xl border border-app-border bg-app-surface-muted p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
            Invulscore afgelopen 7 dagen
          </p>
          <p
            className={`mt-2 text-4xl font-bold ${getFillScoreColorClass(weeklyFillScore ?? 100)}`}
          >
            {formatFillScorePercentage(weeklyFillScore ?? 100)}
          </p>
        </div>
      </div>

      <FillTodayCta athleteId={userId} />
      <DashboardAgenda role={role} userId={userId} />
      <div className="app-card">
        <h2 className="mb-4 text-lg font-bold">Zoeken</h2>
        <DashboardSearch
          role={role}
          pendingCount={pendingCount}
          athletes={athletes}
          selfAthlete={{ id: userId, name: fullName || "Atleet" }}
        />
      </div>
    </div>
  ) : null;

  const coachContent = userId ? (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setDashboardEditing((value) => !value)}
          className={
            dashboardEditing ? "app-btn-primary" : "app-btn-secondary"
          }
        >
          {dashboardEditing ? "Klaar met aanpassen" : "Dashboard aanpassen"}
        </button>
      </div>
      <CoachDashboardWidgets
        editing={dashboardEditing}
        widgets={{
          welcome: (
            <div className="app-card">
              <h1 className="text-3xl font-bold text-app-text">
                {fullName || "Dashboard"}
              </h1>
              <p className="mt-2 text-app-muted">
                Overzicht van je coaching dashboard.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href="/profile?section=settings" className="app-btn-secondary">
                  Instellingen
                </Link>
                <Link href="/merch" className="app-btn-secondary">
                  Merch beheren
                </Link>
                <Link href="/athletes" className="app-btn-secondary">
                  Atleten beheren
                </Link>
              </div>
            </div>
          ),
          agenda: <DashboardAgenda role={role} userId={userId} />,
          search: (
            <div className="app-card">
              <h2 className="mb-4 text-lg font-bold">Zoeken</h2>
              <DashboardSearch
                role={role}
                pendingCount={pendingCount}
                athletes={athletes}
                coachSnapshot={coachSnapshot}
              />
            </div>
          ),
          invites: <CoachInvitePanel coachId={userId} />,
          income: totalIncome !== null ? (
            <div className="app-card">
              <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
                Maandelijkse inkomsten
              </p>
              <p className="mt-2 text-3xl font-bold text-brand-purple">
                € {totalIncome.toFixed(2)}
              </p>
              <p className="mt-1 text-sm text-app-muted">
                {payingAthleteCount} betalende atleten
              </p>
            </div>
          ) : null,
          pending: (
            <div className="app-card">
              <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
                Openstaande aanmeldingen
              </p>
              <p className="mt-2 text-3xl font-bold text-app-text">
                {pendingCount}
              </p>
              <Link
                href="/athletes"
                className="mt-3 inline-block text-sm font-semibold text-brand-purple hover:underline"
              >
                Naar atleten beheren →
              </Link>
            </div>
          ),
          todo: (
            <div className="app-card">
              <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
                Openstaande taken
              </p>
              <p className="mt-2 text-3xl font-bold text-app-text">
                {openTodoCount}
              </p>
              <Link
                href="/todo"
                className="mt-3 inline-block text-sm font-semibold text-brand-purple hover:underline"
              >
                Naar to-do →
              </Link>
            </div>
          ),
          athletes: (
            <div className="app-card">
              <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
                Mijn atleten
              </p>
              <p className="mt-2 text-3xl font-bold text-app-text">
                {athletes.length}
              </p>
              <ul className="mt-3 space-y-1">
                {athletes.slice(0, 5).map((athlete) => (
                  <li key={athlete.id}>
                    <Link
                      href={`/profile/${athlete.id}`}
                      className="text-sm font-medium text-brand-purple hover:underline"
                    >
                      {athlete.full_name || "Naamloos"}
                    </Link>
                  </li>
                ))}
              </ul>
              {athletes.length > 5 && (
                <Link
                  href="/athletes"
                  className="mt-2 inline-block text-xs font-semibold text-app-muted hover:underline"
                >
                  + {athletes.length - 5} meer
                </Link>
              )}
            </div>
          ),
          quicklinks: (
            <div className="app-card">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-app-muted">
                Snelkoppelingen
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/programs" className="app-btn-secondary text-xs">
                  Programma&apos;s
                </Link>
                <Link href="/data" className="app-btn-secondary text-xs">
                  Data
                </Link>
                <Link href="/invulscore" className="app-btn-secondary text-xs">
                  Invulscore
                </Link>
                <Link href="/leaderboard" className="app-btn-secondary text-xs">
                  Leaderboard
                </Link>
                <Link
                  href="/atleten-overzicht"
                  className="app-btn-secondary text-xs"
                >
                  Atleten overzicht
                </Link>
              </div>
            </div>
          ),
        }}
      />
    </div>
  ) : null;

  return (
    <AppShell contentClassName="flex-1 p-4 md:p-6">
      {isCoachLikeRole(role) ? coachContent : athleteContent}
    </AppShell>
  );
}
