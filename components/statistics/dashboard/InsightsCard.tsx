"use client";

import { LIMITLESS_CHART_COLORS } from "@/lib/ipfPoints";
import type { OverviewInsight } from "@/lib/statisticsOverview";

export default function InsightsCard({ insights }: { insights: OverviewInsight[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1118] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-muted">
        Insights
      </p>
      <ul className="mt-3 space-y-2.5">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="flex items-start gap-2 text-sm leading-relaxed text-app-text"
          >
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: LIMITLESS_CHART_COLORS.primary }}
            />
            <span>{insight.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
