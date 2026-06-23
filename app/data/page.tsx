"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageContainer, PageHeader } from "@/components/ui/design-system";
import { PageLoading } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  ComplianceTrendPanelLazy,
  PerformanceGraphPanelLazy,
  PrHistoryPanelLazy,
  RawDataViewLazy,
  RpeIntensityPanelLazy,
  StatisticsViewLazy,
  TeamStatistiekenPanelLazy,
  VolumeLandmarksPanelLazy,
} from "@/components/data/DataPageLazyPanels";
import DeloadSuggestionBanner from "@/components/data/DeloadSuggestionBanner";
import AthleteProgressTabs from "@/components/data/AthleteProgressTabs";
import StatsTabs from "@/components/statistics/dashboard/StatsTabs";

type DataTab = "statistieken" | "ruwe-data" | "team" | "performance";

function DataPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const embeddedInChat = searchParams.get("embedded") === "chat";
  const tabParam = searchParams.get("tab");
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [loadingRole, setLoadingRole] = useState(true);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [athletes, setAthletes] = useState<
    Array<{ id: string; full_name: string | null }>
  >([]);

  useEffect(() => {
    document.title = "Data & statistieken";

    async function loadRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole(profile?.role || "");

      if (isCoachLikeRole(profile?.role)) {
        const { data: athleteRows } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "atleet")
          .order("full_name", { ascending: true });
        setAthletes(athleteRows || []);
        if (athleteRows?.[0]) setSelectedAthleteId(athleteRows[0].id);
      }

      setLoadingRole(false);
    }

    void loadRole();
  }, []);

  const isCoach = isCoachLikeRole(role);
  const activeTab: DataTab =
    tabParam === "ruwe-data" && isCoach
      ? "ruwe-data"
      : tabParam === "team" && isCoach
        ? "team"
        : tabParam === "performance" && isCoach
          ? "performance"
          : "statistieken";

  const tabs: Array<{ id: DataTab; label: string }> = useMemo(
    () =>
      isCoach
        ? [
            { id: "statistieken", label: "Overzicht" },
            { id: "ruwe-data", label: "Ruwe data" },
            { id: "team", label: "Team" },
            { id: "performance", label: "Performance" },
          ]
        : [],
    [isCoach],
  );

  function switchTab(tab: DataTab) {
    router.replace(`/data?tab=${tab}`, { scroll: false });
  }

  if (embeddedInChat) {
    return (
      <main className="min-h-full bg-app-bg">
        <RawDataViewLazy embeddedInUnifiedPage />
      </main>
    );
  }

  if (loadingRole) {
    return (
      <AppShell>
        <PageContainer size="full">
          <PageLoading label="Data laden…" />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title={isCoach ? "Data & statistieken" : "Voortgang & video's"}
          description={
            isCoach
              ? "Bekijk je atleet's trends en voortgang op één plek."
              : "Bekijk je statistieken en trainingsvideo's."
          }
          actions={
            isCoach && activeTab === "statistieken" ? (
              <div
                id="statistics-header-actions"
                className="flex items-end justify-end"
              />
            ) : undefined
          }
        />

        {!isCoach ? (
          <AthleteProgressTabs active="data" />
        ) : (
          <StatsTabs tabs={tabs} activeTab={activeTab} onChange={switchTab} />
        )}

        {activeTab === "statistieken" ? (
          <>
            {!isCoach && userId ? (
              <DeloadSuggestionBanner athleteId={userId} />
            ) : null}
            <StatisticsViewLazy embedded />
          </>
        ) : activeTab === "ruwe-data" ? (
          <RawDataViewLazy embeddedInUnifiedPage />
        ) : activeTab === "team" && isCoach ? (
          <TeamStatistiekenPanelLazy coachId={userId} role={role} />
        ) : activeTab === "performance" && isCoach ? (
          <div className="space-y-4">
            {athletes.length > 0 ? (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <label className="text-[13px] font-medium text-app-muted">
                    Atleet
                    <select
                      value={selectedAthleteId}
                      onChange={(e) => setSelectedAthleteId(e.target.value)}
                      className="mt-1.5 block w-full min-h-[44px] rounded-xl border border-app-border bg-app-surface px-3 py-2.5 text-[16px] text-app-text outline-none app-focus-ring sm:max-w-xs sm:text-sm"
                    >
                      {athletes.map((athlete) => (
                        <option key={athlete.id} value={athlete.id}>
                          {athlete.full_name || "Atleet"}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {selectedAthleteId ? (
                  <>
                    <DeloadSuggestionBanner athleteId={selectedAthleteId} />
                    <PerformanceGraphPanelLazy
                      athleteId={selectedAthleteId}
                      athleteName={
                        athletes.find((a) => a.id === selectedAthleteId)
                          ?.full_name || "Atleet"
                      }
                    />
                    <RpeIntensityPanelLazy athleteId={selectedAthleteId} />
                    <PrHistoryPanelLazy athleteId={selectedAthleteId} />
                    <ComplianceTrendPanelLazy athleteId={selectedAthleteId} />
                    <VolumeLandmarksPanelLazy athleteId={selectedAthleteId} />
                  </>
                ) : null}
              </>
            ) : (
              <div className="app-card">
                <p className="text-sm text-app-muted">Geen atleten gevonden.</p>
              </div>
            )}
          </div>
        ) : (
          <StatisticsViewLazy embedded />
        )}
      </PageContainer>
    </AppShell>
  );
}

export default function DataPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageLoading label="Data laden…" />
        </AppShell>
      }
    >
      <DataPageInner />
    </Suspense>
  );
}
