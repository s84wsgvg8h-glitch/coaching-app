"use client";

import "@/styles/organisatie.css";
import { Suspense, useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import OrganisationAthletesPanel from "@/components/coach/OrganisationAthletesPanel";
import { PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  loadCoachOrganisationOverview,
  type CoachOrganisationRow,
} from "@/lib/coachOrganisationOverview";

export default function OrganisatiePage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer size="full">
            <Panel>Laden...</Panel>
          </PageContainer>
        </AppShell>
      }
    >
      <OrganisatiePageContent />
    </Suspense>
  );
}

function OrganisatiePageContent() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CoachOrganisationRow[]>([]);
  const [coachId, setCoachId] = useState("");

  useEffect(() => {
    document.title = "Organisatie";
  }, []);

  const loadRows = useCallback(async (userId: string, role: string) => {
    const overview = await loadCoachOrganisationOverview(userId, role);
    setRows(overview);
    setLoading(false);
  }, []);

  useEffect(() => {
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
        .maybeSingle();

      if (!isCoachLikeRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      setCoachId(user.id);
      await loadRows(user.id, profile?.role || "coach");
    }

    void init();
  }, [loadRows]);

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Organisatie"
          description="Ledenadministratie van de vereniging. Coaching-atleten staan er ook in; nieuwe leden voeg je toe zonder app-account."
        />

        {loading || !coachId ? (
          <Panel>Laden...</Panel>
        ) : (
          <OrganisationAthletesPanel
            coachId={coachId}
            rows={rows}
            onRowsChange={setRows}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}
