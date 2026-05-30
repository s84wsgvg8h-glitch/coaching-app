"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import AthleteGoalsSection from "@/components/profile/AthleteGoalsSection";
import { supabase } from "@/lib/supabaseClient";

export default function DoelenPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = "Doelen";

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setLoading(false);
    }

    void init();
  }, []);

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        {loading ? (
          <p className="text-sm text-app-muted">Laden...</p>
        ) : (
          <div className="app-card">
            <AthleteGoalsSection athleteId={userId} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
