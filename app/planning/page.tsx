"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
import ProgramPlanningCalendar from "@/components/planning/ProgramPlanningCalendar";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";

function PlanningPageContent() {
  const searchParams = useSearchParams();
  const athleteQuery = searchParams.get("athlete");
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [userId, setUserId] = useState("");
  const [athletes, setAthletes] = useState<
    Array<{ id: string; full_name: string | null }>
  >([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");

  useEffect(() => {
    document.title = "Planning";

    async function init() {
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

      const userRole = profile?.role || "";
      setRole(userRole);

      if (isCoachLikeRole(userRole)) {
        let query = supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "atleet")
          .order("full_name", { ascending: true });

        if (userRole === "coach") {
          query = query.eq("coach_id", user.id);
        }

        const { data } = await query;
        const rows = data || [];
        setAthletes(rows);
        const initial =
          athleteQuery && rows.some((row) => row.id === athleteQuery)
            ? athleteQuery
            : rows[0]?.id || "";
        setSelectedAthleteId(initial);
      } else {
        setSelectedAthleteId(user.id);
      }

      setLoading(false);
    }

    void init();
  }, [athleteQuery]);

  const selectedAthlete = athletes.find(
    (athlete) => athlete.id === selectedAthleteId,
  );

  const athleteName = isCoachLikeRole(role)
    ? selectedAthlete?.full_name || "Atleet"
    : "Jij";

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Planning"
          description="Kalender met programmablokken, weken en wedstrijden."
          actions={
            !loading && isCoachLikeRole(role) ? (
              <label className="flex w-full flex-col gap-1 sm:w-64">
                <span className="text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                  Atleet
                </span>
                <select
                  value={selectedAthleteId}
                  onChange={(event) => setSelectedAthleteId(event.target.value)}
                  className="min-h-[44px] w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text app-focus-ring"
                >
                  {athletes.length === 0 ? (
                    <option value="">Geen atleten</option>
                  ) : (
                    athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.full_name || "Atleet"}
                      </option>
                    ))
                  )}
                </select>
              </label>
            ) : undefined
          }
        />

        {loading ? (
          <Panel>
            <p className="text-sm text-app-muted">Laden...</p>
          </Panel>
        ) : (
          <>

            {selectedAthleteId ? (
              <Panel className="min-w-0">
                <ProgramPlanningCalendar
                  athleteId={selectedAthleteId}
                  athleteName={athleteName}
                  canEditNotes={isCoachLikeRole(role)}
                  coachId={isCoachLikeRole(role) ? userId : undefined}
                />
              </Panel>
            ) : (
              <Panel>
                <p className="text-sm text-app-muted">
                  Selecteer een atleet om de planning te bekijken.
                </p>
              </Panel>
            )}
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}

export default function PlanningPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer size="full">
            <Panel>
              <p className="text-sm text-app-muted">Planning laden...</p>
            </Panel>
          </PageContainer>
        </AppShell>
      }
    >
      <PlanningPageContent />
    </Suspense>
  );
}
