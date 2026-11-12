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
      <div className="grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto sm:flex-wrap sm:items-end sm:justify-end sm:gap-3">
        <div className="min-w-0 sm:min-w-[160px]">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
            Atleet
          </p>
          <select
            value={selectedAthleteId}
            onChange={(event) => onAthleteChange(event.target.value)}
            className="app-focus-ring min-h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-base text-app-text outline-none md:text-sm"
          >
            {athleteOptions.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-0 sm:min-w-[160px]">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
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
            className="app-focus-ring min-h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-base text-app-text outline-none md:text-sm"
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
            <div className="min-w-0 sm:min-w-[140px]">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                Van block
              </p>
              <select
                value={period.fromBlockId || ""}
                onChange={(event) =>
                  onPeriodChange({ ...period, fromBlockId: event.target.value })
                }
                className="app-focus-ring min-h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-base text-app-text outline-none md:text-sm"
              >
                {blockMetas.map((block) => (
                  <option key={block.blockId} value={block.blockId}>
                    {block.blockTitle}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-0 sm:min-w-[140px]">
              <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                Tot block
              </p>
              <select
                value={period.toBlockId || ""}
                onChange={(event) =>
                  onPeriodChange({ ...period, toBlockId: event.target.value })
                }
                className="app-focus-ring min-h-11 w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-base text-app-text outline-none md:text-sm"
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
    <div className="mb-4 flex justify-end">
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
