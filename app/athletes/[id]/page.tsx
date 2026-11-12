"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import CoachAthleteHubPanel from "@/components/coach/CoachAthleteHubPanel";
import CoachAthleteDashboardTodos from "@/components/coach/CoachAthleteDashboardTodos";
import CoachAthleteSwitcher from "@/components/coach/CoachAthleteSwitcher";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import { loadAthleteFillScore } from "@/lib/coachAthleteOverview";
import { PageContainer, PageHeader } from "@/components/ui/design-system";
import { formatFillScorePercentage } from "@/lib/athleteFillScore";
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
  const [coachId, setCoachId] = useState<string | null>(null);
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
      setCoachId(user.id);
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
    return <HubLoading />;
  }

  return (
    <AppShell contentClassName={HUB_CONTENT_CLASS}>
      <PageContainer size="full">
        <PageHeader
          eyebrow="Atleet hub"
          title={athleteName}
          actions={
            <CoachAthleteSwitcher
              athletes={athletes}
              currentAthleteId={athleteId}
            />
          }
        />

        {fillScore !== null ? (
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-[12px] text-app-muted">
            Invulscore afgelopen 30 dagen
            <span
              className={`rounded-full px-2 py-0.5 font-semibold tabular-nums ${fillScoreChipClass(fillScore)}`}
            >
              {formatFillScorePercentage(fillScore)}
            </span>
          </div>
        ) : null}

        <CoachAthleteHubPanel
          athleteId={athleteId}
          programHref={programHref}
        />

        {coachId ? (
          <CoachAthleteDashboardTodos athleteId={athleteId} coachId={coachId} />
        ) : null}
      </PageContainer>
    </AppShell>
  );
}

const HUB_CONTENT_CLASS =
  "app-page-content flex-1 px-2 pb-6 md:px-3 lg:px-4";

function fillScoreChipClass(percentage: number) {
  if (percentage >= 90) return "bg-emerald-500/15 text-emerald-400";
  if (percentage >= 70) return "bg-amber-500/15 text-amber-400";
  return "bg-red-500/15 text-red-400";
}

function HubLoading() {
  return (
    <AppShell contentClassName={HUB_CONTENT_CLASS}>
      <PageContainer size="full">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-app-surface" />
        <p className="mt-3 text-sm text-app-muted">Atleet laden...</p>
      </PageContainer>
    </AppShell>
  );
}

export default function CoachAthleteHubPage() {
  return (
    <Suspense fallback={<HubLoading />}>
      <CoachAthleteHubContent />
    </Suspense>
  );
}
