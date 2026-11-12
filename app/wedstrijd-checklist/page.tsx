"use client";

import { useEffect } from "react";
import AppShell from "@/components/AppShell";
import { PageContainer, Panel } from "@/components/ui/design-system";
import { isCoachLikeRole } from "@/lib/authRoles";
import { supabase } from "@/lib/supabaseClient";

export default function CompetitionChecklistPage() {
  useEffect(() => {
    document.title = "Wedstrijd checklist";

    async function load() {
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

      if (isCoachLikeRole(profile?.role)) {
        window.location.href = "/profile?section=settings";
        return;
      }

      window.location.href = "/meet-week";
    }

    void load();
  }, []);

  return (
    <AppShell>
      <PageContainer size="full">
        <Panel>
          <p className="text-sm text-app-muted">Doorverwijzen naar meet-week...</p>
        </Panel>
      </PageContainer>
    </AppShell>
  );
}

