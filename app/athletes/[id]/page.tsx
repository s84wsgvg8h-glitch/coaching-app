"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import CoachAthleteHubPanel from "@/components/coach/CoachAthleteHubPanel";
import CoachAthleteSwitcher from "@/components/coach/CoachAthleteSwitcher";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import { loadAthleteFillScore } from "@/lib/coachAthleteOverview";
import {
  formatFillScorePercentage,
  getFillScoreColorClass,
} from "@/lib/athleteFillScore";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import {
  buildProgramWeekPath,
  resolveProgramEntryForAthlete,
} from "@/lib/programNavigation";

type AthleteOption = { id: string; full_name: string | null };

function CoachAthleteHubContent() {
  const params = useParams();
  const router = useRouter();
  const athleteId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState("Atleet");
  const [fillScore, setFillScore] = useState<number | null>(null);
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [programHref, setProgramHref] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Atleet hub";

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!isCoachLikeRole(profile?.role)) {
        router.replace("/dashboard");
        return;
      }

      const ctx = (await loadCoachOrgContext(user.id)) || {
        coachId: user.id,
        role: profile?.role || "",
        organizationId: null,
      };
      ctx.role = profile?.role || "";

      let athleteQuery = supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", athleteId)
        .eq("role", "atleet")
        .maybeSingle();

      athleteQuery = applyAthleteScope(athleteQuery, ctx);

      let athletesQuery = supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      athletesQuery = applyAthleteScope(athletesQuery, ctx);

      const [{ data: activeAthlete }, { data: athleteRows }] = await Promise.all([
        athleteQuery,
        athletesQuery,
      ]);

      let athlete = activeAthlete;
      if (!athlete) {
        const { data: archivedAthlete } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", athleteId)
          .eq("role", "atleet")
          .eq("archived_by_coach_id", user.id)
          .not("archived_at", "is", null)
          .maybeSingle();
        athlete = archivedAthlete;
      }

      if (!athlete) {
        router.replace("/athletes");
        return;
      }

      const name = athlete.full_name || "Atleet";
      setAthleteName(name);
      setAthletes(athleteRows || []);
      setLoading(false);

      const [score, programEntry] = await Promise.all([
        loadAthleteFillScore(athleteId, name),
        resolveProgramEntryForAthlete(athleteId, user.id),
      ]);

      setFillScore(score);

      if (programEntry.data) {
        const href = buildProgramWeekPath(programEntry.data, {
          coachViewingAthlete: true,
        });
        setProgramHref(href);
        router.prefetch(href);
      }
    }

    void init();
  }, [athleteId, router]);

  if (loading) {
    return (
      <AppShell contentClassName="flex-1 p-8">
        <p className="text-sm text-app-muted">Atleet laden...</p>
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/athletes"
              className="text-sm font-semibold text-brand-purple hover:underline"
            >
              ← Alle atleten
            </Link>
            <h1 className="mt-3 text-3xl font-bold text-app-text">{athleteName}</h1>
            {fillScore !== null ? (
              <p className="mt-3 text-sm text-app-muted">
                Invulscore afgelopen 30 dagen:{" "}
                <span
                  className={`font-bold tabular-nums ${getFillScoreColorClass(fillScore)}`}
                >
                  {formatFillScorePercentage(fillScore)}
                </span>
              </p>
            ) : null}
          </div>
          <CoachAthleteSwitcher
            athletes={athletes}
            currentAthleteId={athleteId}
          />
        </div>

        <div className="mt-6">
          <CoachAthleteHubPanel
            athleteId={athleteId}
            programHref={programHref}
          />
        </div>
      </div>
    </AppShell>
  );
}

export default function CoachAthleteHubPage() {
  return (
    <Suspense
      fallback={
        <AppShell contentClassName="flex-1 p-8">
          <p className="text-sm text-app-muted">Atleet laden...</p>
        </AppShell>
      }
    >
      <CoachAthleteHubContent />
    </Suspense>
  );
}
