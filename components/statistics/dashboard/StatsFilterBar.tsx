"use client";

import StatisticsChartPicker from "@/components/statistics/StatisticsChartPicker";
import {
  CHART_BLOCK_FILTER_OPTIONS,
  type BlockMeta,
  type StatisticsPeriodFilter,
} from "@/lib/statisticsChartFilters";
import { formatOverviewPeriodLabel } from "@/lib/statisticsOverview";
import type { StatisticsChartInstance } from "@/lib/statisticsChartInstances";

type StatsFilterBarProps = {
  athleteOptions: Array<{ id: string; name: string }>;
  selectedAthleteId: string;
  onAthleteChange: (athleteId: string) => void;
  period: StatisticsPeriodFilter;
  onPeriodChange: (period: StatisticsPeriodFilter) => void;
  blockMetas: BlockMeta[];
  chartInstances: StatisticsChartInstance[];
  exerciseNames: string[];
  accessoryExerciseNames: string[];
  onAddChart: (instance: StatisticsChartInstance) => void;
  compact?: boolean;
};

export default function StatsFilterBar({
  athleteOptions,
  selectedAthleteId,
  onAthleteChange,
  period,
  onPeriodChange,
  blockMetas,
  chartInstances,
  exerciseNames,
  accessoryExerciseNames,
  onAddChart,
  compact = false,
}: StatsFilterBarProps) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="min-w-[160px]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-app-muted">
            Atleet
          </p>
          <select
            value={selectedAthleteId}
            onChange={(event) => onAthleteChange(event.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
          >
            {athleteOptions.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px]">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-app-muted">
            Periode
          </p>
          <select
            value={period.preset}
            onChange={(event) =>
              onPeriodChange({
                ...period,
                preset: event.target.value as StatisticsPeriodFilter["preset"],
              })
            }
            className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
          >
            {CHART_BLOCK_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.value === period.preset
                  ? formatOverviewPeriodLabel(period, blockMetas)
                  : option.label}
              </option>
            ))}
          </select>
        </div>

        {period.preset === "custom" ? (
          <>
            <div className="min-w-[140px]">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-app-muted">
                Van block
              </p>
              <select
                value={period.fromBlockId || ""}
                onChange={(event) =>
                  onPeriodChange({ ...period, fromBlockId: event.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
              >
                {blockMetas.map((block) => (
                  <option key={block.blockId} value={block.blockId}>
                    {block.blockTitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-app-muted">
                Tot block
              </p>
              <select
                value={period.toBlockId || ""}
                onChange={(event) =>
                  onPeriodChange({ ...period, toBlockId: event.target.value })
                }
                className="w-full rounded-xl border border-white/10 bg-[#111827] px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
              >
                {blockMetas.map((block) => (
                  <option key={block.blockId} value={block.blockId}>
                    {block.blockTitle}
                  </option>
                ))}
              </select>
            </div>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-end">
      <StatisticsChartPicker
        instances={chartInstances}
        exerciseNames={exerciseNames}
        accessoryExerciseNames={accessoryExerciseNames}
        onAdd={onAddChart}
        inline
      />
    </div>
  );
}
