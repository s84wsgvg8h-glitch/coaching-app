"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageContainer, PageHeader } from "@/components/ui/design-system";
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
        />

        {loading ? (
          <div className="app-card mt-6">
            <p className="text-sm text-app-muted">Laden...</p>
          </div>
        ) : (
          <>
            {isCoachLikeRole(role) ? (
              <div className="app-card mt-6">
                <label className="text-sm font-semibold text-app-text">
                  Atleet
                  <select
                    value={selectedAthleteId}
                    onChange={(event) => setSelectedAthleteId(event.target.value)}
                    className="mt-2 w-full max-w-md rounded-xl border border-app-border px-3 py-2 text-sm app-focus-ring"
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
              </div>
            ) : null}

            {selectedAthleteId ? (
              <div className="app-card mt-6">
                <ProgramPlanningCalendar
                  athleteId={selectedAthleteId}
                  athleteName={athleteName}
                  canEditNotes={isCoachLikeRole(role)}
                  coachId={isCoachLikeRole(role) ? userId : undefined}
                />
              </div>
            ) : (
              <div className="app-card mt-6">
                <p className="text-sm text-app-muted">
                  Selecteer een atleet om de planning te bekijken.
                </p>
              </div>
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
          <div className="app-card mt-6">
            <p className="text-sm text-app-muted">Planning laden...</p>
          </div>
        </AppShell>
      }
    >
      <PlanningPageContent />
    </Suspense>
  );
}
