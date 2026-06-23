"use client";

import { useEffect } from "react";
import AppShell from "@/components/AppShell";
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
      <div className="app-card">Doorverwijzen naar meet-week...</div>
    </AppShell>
  );
}

