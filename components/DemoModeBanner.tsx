"use client";

import { Sparkles, X, LayoutGrid, ArrowLeftRight } from "lucide-react";
import {
  disableDemoMode,
  enableDemoMode,
  getDemoPersona,
  getDemoPersonaLabel,
  isDemoMode,
} from "@/lib/demo/demoMode";
import DemoPagesSheet from "@/components/DemoPagesSheet";
import { useEffect, useState } from "react";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

export default function DemoModeBanner() {
  const [visible, setVisible] = useState(false);
  const [label, setLabel] = useState("Demo modus");
  const [persona, setPersona] = useState<"coach" | "atleet">("coach");
  const [pagesOpen, setPagesOpen] = useState(false);

  useEffect(() => {
    deferEffectUpdate(() => {
      setVisible(isDemoMode());
      setLabel(getDemoPersonaLabel());
      setPersona(getDemoPersona());
    });
  }, []);

  if (!visible) return null;

  function exitDemo() {
    disableDemoMode();
    window.location.href = "/admin?tab=system";
  }

  function switchPersona() {
    const next = persona === "coach" ? "atleet" : "coach";
    enableDemoMode(next);
    window.location.href = "/dashboard";
  }

  return (
    <>
      <div className="sticky top-0 z-20 border-b border-sky-500/30 bg-sky-500/10 px-3 py-2 backdrop-blur-md md:px-4">
        <div className="mx-auto flex max-w-[1660px] items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-[12px] text-sky-700 md:text-[13px] dark:text-sky-100">
            <Sparkles className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-300" />
            <span className="truncate">
              <strong className="font-semibold text-sky-900 dark:text-white">{label}</strong>
              <span className="hidden sm:inline">
                {" · "}
                Verzonnen data — alle pagina&apos;s beschikbaar.
              </span>
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPagesOpen(true)}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-sky-400/30 px-2.5 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-500/20 dark:text-sky-100 md:text-[12px] lg:hidden"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Pagina&apos;s
            </button>
            <button
              type="button"
              onClick={switchPersona}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-sky-400/30 px-2.5 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-500/20 dark:text-sky-100 md:text-[12px]"
              title={
                persona === "coach"
                  ? "Wissel naar demo atleet"
                  : "Wissel naar demo coach"
              }
            >
              <ArrowLeftRight className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {persona === "coach" ? "Atleet" : "Coach"}
              </span>
            </button>
            <button
              type="button"
              onClick={exitDemo}
              className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-sky-400/30 px-2.5 py-1 text-[11px] font-medium text-sky-700 hover:bg-sky-500/20 dark:text-sky-100 md:text-[12px]"
            >
              <X className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Verlaten</span>
            </button>
          </div>
        </div>
      </div>
      <DemoPagesSheet open={pagesOpen} onClose={() => setPagesOpen(false)} />
    </>
  );
}
