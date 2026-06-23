"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

type GoalsProgressWidgetProps = {
  athleteId: string;
  variant?: "default" | "athlete";
};

function SbdClipboardGraphic() {
  return (
    <div className="athlete-dashboard-sbd-graphic" aria-hidden="true">
      <div className="athlete-dashboard-sbd-board">
        <span className="athlete-dashboard-sbd-label">SBD</span>
        <div className="athlete-dashboard-sbd-lines">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  );
}

export default function GoalsProgressWidget({
  athleteId,
  variant = "default",
}: GoalsProgressWidgetProps) {
  const [loading, setLoading] = useState(true);
  const [goalsText, setGoalsText] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("goals_text")
        .eq("id", athleteId)
        .maybeSingle();
      setGoalsText((data?.goals_text as string) || "");
      setLoading(false);
    }
    void load();
  }, [athleteId]);

  if (variant === "athlete") {
    if (loading) {
      return (
        <div className="athlete-dashboard-card animate-pulse">
          <div className="h-24 rounded-xl bg-white/5" />
        </div>
      );
    }

    return (
      <div className="athlete-dashboard-card athlete-dashboard-card--goals">
        <div className="relative z-[1] min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-app-muted" aria-hidden="true" />
            <h2 className="text-[15px] font-semibold text-app-text">
              Jouw doelen
            </h2>
          </div>

          {!goalsText.trim() ? (
            <div className="mt-3">
              <p className="text-[13px] text-app-muted">
                Nog geen doelen ingesteld.
              </p>
              <Link
                href="/doelen"
                className="mt-2 inline-block text-[13px] font-medium text-[#3b82f6] hover:underline"
              >
                Stel doelen in
              </Link>
            </div>
          ) : (
            <div className="mt-3">
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-app-muted">
                {goalsText}
              </p>
              <Link
                href="/doelen"
                className="mt-2 inline-block text-[13px] font-medium text-[#3b82f6] hover:underline"
              >
                Bewerken
              </Link>
            </div>
          )}
        </div>
        <SbdClipboardGraphic />
      </div>
    );
  }

  if (loading) {
    return <div className="app-card text-sm text-app-muted">Doelen laden...</div>;
  }

  if (!goalsText.trim()) {
    return (
      <div className="app-card">
        <h3 className="font-bold text-app-text">Jouw doelen</h3>
        <p className="mt-2 text-sm text-app-muted">
          Nog geen doelen ingesteld.{" "}
          <Link href="/doelen" className="font-semibold text-brand-purple">
            Stel doelen in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="app-card">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold text-app-text">Jouw doelen</h3>
        <Link href="/doelen" className="text-xs font-semibold text-brand-purple">
          Bewerken
        </Link>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-app-text">
        {goalsText}
      </p>
    </div>
  );
}
