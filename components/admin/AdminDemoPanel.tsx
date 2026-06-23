"use client";

import { Sparkles } from "lucide-react";
import { enableDemoModeFromAdmin } from "@/lib/demo/demoMode";
import { AdminPanel } from "@/components/admin/AdminUi";

export default function AdminDemoPanel() {
  function launchDemo(persona: "coach" | "atleet") {
    enableDemoModeFromAdmin(persona);
    window.location.href = "/dashboard";
  }

  return (
    <AdminPanel>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <h2 className="admin-panel-title">Demo-modus</h2>
          </div>
          <p className="admin-muted max-w-xl text-[13px] leading-relaxed">
            Verken de volledige app met verzonnen data. Alleen beschikbaar voor
            admins — niet zichtbaar op de loginpagina.
          </p>
        </div>
        <div className="grid w-full shrink-0 gap-2 sm:w-auto sm:min-w-[280px]">
          <button
            type="button"
            onClick={() => launchDemo("coach")}
            className="admin-btn admin-btn--primary inline-flex min-h-[44px] w-full items-center justify-center gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Demo coach openen
          </button>
          <button
            type="button"
            onClick={() => launchDemo("atleet")}
            className="admin-btn admin-btn--ghost inline-flex min-h-[44px] w-full items-center justify-center gap-2 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
          >
            <Sparkles className="h-4 w-4" />
            Demo atleet openen
          </button>
        </div>
      </div>
    </AdminPanel>
  );
}
