"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import DashboardSearch from "@/components/DashboardSearch";
import {
  formatPaymentPrice,
  loadTotalAthleteIncome,
} from "@/lib/athletePayments";
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

      if (data?.role === "coach") {
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
      }
    }

    void getProfile();
  }, []);

  return (
    <AppShell contentClassName="flex-1 p-6 md:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-3xl bg-white p-8 shadow-xl">
          <h1 className="text-4xl font-bold">{fullName || "Dashboard"}</h1>
          <p className="mt-2 text-gray-500">
            {role === "coach"
              ? "Overzicht van je coaching dashboard."
              : "Welkom terug."}
          </p>

          {role === "coach" && totalIncome !== null && (
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Totale inkomsten
                </p>
                <p className="mt-2 text-3xl font-bold text-black">
                  {formatPaymentPrice(totalIncome)}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Som van alle atleetprijzen per maand
                </p>
              </div>

              <div className="rounded-2xl bg-gray-50 px-5 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Betalende atleten
                </p>
                <p className="mt-2 text-3xl font-bold text-black">
                  {payingAthleteCount}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Atleten met een ingevulde prijs
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl">
          <h2 className="mb-4 text-lg font-bold">Zoeken</h2>
          <DashboardSearch
            role={role}
            pendingCount={pendingCount}
            athletes={athletes}
            coachSnapshot={coachSnapshot}
            selfAthlete={
              role === "atleet" && userId
                ? { id: userId, name: fullName || "Atleet" }
                : undefined
            }
          />
        </div>
      </div>
    </AppShell>
  );
}
