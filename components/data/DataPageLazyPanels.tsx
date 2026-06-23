"use client";

import dynamic from "next/dynamic";

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="app-card animate-pulse py-8 text-center text-sm text-app-muted">
      {label}
    </div>
  );
}

export const StatisticsViewLazy = dynamic(
  () => import("@/components/StatisticsView"),
  {
    loading: () => <PanelFallback label="Statistieken laden…" />,
  },
);

export const RawDataViewLazy = dynamic(() => import("@/components/RawDataView"), {
  loading: () => <PanelFallback label="Ruwe data laden…" />,
});

export const TeamStatistiekenPanelLazy = dynamic(
  () => import("@/components/data/TeamStatistiekenPanel"),
  {
    loading: () => <PanelFallback label="Teamstatistieken laden…" />,
  },
);

export const PerformanceGraphPanelLazy = dynamic(
  () => import("@/components/analytics/PerformanceGraphPanel"),
  {
    loading: () => <PanelFallback label="Grafieken laden…" />,
  },
);

export const RpeIntensityPanelLazy = dynamic(
  () => import("@/components/analytics/RpeIntensityPanel"),
  {
    loading: () => <PanelFallback label="RPE-intensiteit laden…" />,
  },
);

export const PrHistoryPanelLazy = dynamic(
  () => import("@/components/analytics/PrHistoryPanel"),
  {
    loading: () => <PanelFallback label="PR-geschiedenis laden…" />,
  },
);

export const ComplianceTrendPanelLazy = dynamic(
  () => import("@/components/analytics/ComplianceTrendPanel"),
  {
    loading: () => <PanelFallback label="Compliance laden…" />,
  },
);

export const VolumeLandmarksPanelLazy = dynamic(
  () => import("@/components/data/VolumeLandmarksPanel"),
  {
    loading: () => <PanelFallback label="Volume landmarks laden…" />,
  },
);
