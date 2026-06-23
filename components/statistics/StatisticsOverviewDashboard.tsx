"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { SbdLift } from "@/lib/chatVolumeData";
import type { StatisticsPeriodFilter } from "@/lib/statisticsChartFilters";
import { formatLiftLabel } from "@/lib/chatVolumeData";
import type {
  StatisticsBwRow,
  StatisticsFatigueRow,
  StatisticsRecoveryRow,
  StatisticsSetRow,
} from "@/lib/statisticsChartData";
import { buildCheckinWeeklyChart } from "@/lib/statisticsChartData";
import type { WeeklyVolumeRow } from "@/lib/chatVolumeData";
import {
  buildOverviewInsights,
  buildOverviewKpis,
  buildOverviewMiniMetrics,
  filterOverviewData,
} from "@/lib/statisticsOverview";
import {
  buildCombinedWeeklyE1rmSeries,
  buildWeeklyE1rmSeries,
  type E1rmChartMode,
} from "@/lib/statisticsE1rm";
import {
  buildGlPointsSbdSeries,
  buildGlPointsTotalSeries,
} from "@/lib/statisticsGlPoints";
import type { LiftVariantFilter } from "@/lib/statisticsLiftCatalog";
import { exportRowsToCsv } from "@/lib/statisticsExport";
import KpiCard from "@/components/statistics/dashboard/KpiCard";
import ChartCard, { BlockSpanFooter } from "@/components/statistics/dashboard/ChartCard";
import ChartModeSelect from "@/components/statistics/dashboard/ChartModeSelect";
import {
  mergeChartOverlay,
  type ChartOverlayMetric,
} from "@/lib/statisticsChartOverlay";
import {
  computeAverageWeeklyBwChange,
  formatAverageWeeklyBwChange,
} from "@/lib/statisticsBwTrend";
import {
  CheckinLineChart,
  E1rmAllLiftsChart,
  E1rmLiftChart,
  GlPointsSbdChart,
  GlPointsTotalChart,
  MiniMetricChart,
} from "@/components/statistics/dashboard/E1rmCharts";
import MiniMetricCard from "@/components/statistics/dashboard/MiniMetricCard";
import InsightsCard from "@/components/statistics/dashboard/InsightsCard";

type StatisticsOverviewDashboardProps = {
  setRows: StatisticsSetRow[];
  bwRows: StatisticsBwRow[];
  volumeRows: WeeklyVolumeRow[];
  fatigueRows: StatisticsFatigueRow[];
  recoveryRows: StatisticsRecoveryRow[];
  period: StatisticsPeriodFilter;
  blockMetas: Array<{
    blockId: string;
    blockTitle: string;
    startDate: string;
    endDate: string;
  }>;
  referenceMaxes: Record<SbdLift, number | null>;
};

type ChartVisibility = {
  all: boolean;
  squat: boolean;
  bench: boolean;
  deadlift: boolean;
  glSbd: boolean;
  glTotal: boolean;
};

const DEFAULT_VISIBILITY: ChartVisibility = {
  all: true,
  squat: true,
  bench: true,
  deadlift: true,
  glSbd: true,
  glTotal: true,
};

export default function StatisticsOverviewDashboard({
  setRows,
  bwRows,
  volumeRows,
  fatigueRows,
  recoveryRows,
  period,
  blockMetas,
  referenceMaxes,
}: StatisticsOverviewDashboardProps) {
  const [chartModes, setChartModes] = useState<Record<string, E1rmChartMode>>({
    all: "weekly_best",
    squat: "weekly_best",
    bench: "weekly_best",
    deadlift: "weekly_best",
    glSbd: "weekly_best",
    glTotal: "weekly_best",
    bw: "weekly_average",
  });
  const [chartOverlays, setChartOverlays] = useState<
    Record<string, ChartOverlayMetric>
  >({
    all: "none",
    squat: "none",
    bench: "none",
    deadlift: "none",
  });
  const [variantFilters, setVariantFilters] = useState<
    Record<SbdLift, LiftVariantFilter>
  >({
    squat: "competition",
    bench: "competition",
    deadlift: "competition",
  });
  const [visibility, setVisibility] = useState<ChartVisibility>(DEFAULT_VISIBILITY);
  const [expandedBw, setExpandedBw] = useState(false);

  const filteredSetRows = useMemo(
    () => filterOverviewData(setRows, period, blockMetas),
    [setRows, period, blockMetas],
  );
  const filteredBwRows = useMemo(
    () => filterOverviewData(bwRows, period, blockMetas),
    [bwRows, period, blockMetas],
  );
  const filteredVolumeRows = useMemo(
    () => filterOverviewData(volumeRows, period, blockMetas),
    [volumeRows, period, blockMetas],
  );
  const filteredFatigueRows = useMemo(
    () => filterOverviewData(fatigueRows, period, blockMetas),
    [fatigueRows, period, blockMetas],
  );
  const filteredRecoveryRows = useMemo(
    () => filterOverviewData(recoveryRows, period, blockMetas),
    [recoveryRows, period, blockMetas],
  );

  const overlayInput = useMemo(
    () => ({
      setRows: filteredSetRows,
      bwRows: filteredBwRows,
      fatigueRows: filteredFatigueRows,
      recoveryRows: filteredRecoveryRows,
    }),
    [
      filteredSetRows,
      filteredBwRows,
      filteredFatigueRows,
      filteredRecoveryRows,
    ],
  );

  const kpis = useMemo(
    () =>
      buildOverviewKpis({
        setRows: filteredSetRows,
        bwRows: filteredBwRows,
        volumeRows: filteredVolumeRows,
        referenceMaxes,
      }),
    [filteredSetRows, filteredBwRows, filteredVolumeRows, referenceMaxes],
  );

  const miniMetrics = useMemo(
    () =>
      buildOverviewMiniMetrics({
        setRows: filteredSetRows,
        bwRows: filteredBwRows,
        volumeRows: filteredVolumeRows,
        fatigueRows: filteredFatigueRows,
      }),
    [filteredSetRows, filteredBwRows, filteredVolumeRows, filteredFatigueRows],
  );

  const insights = useMemo(
    () =>
      buildOverviewInsights({
        setRows: filteredSetRows,
        volumeRows: filteredVolumeRows,
        fatigueRows: filteredFatigueRows,
      }),
    [filteredSetRows, filteredVolumeRows, filteredFatigueRows],
  );

  const combinedData = useMemo(() => {
    const series = buildCombinedWeeklyE1rmSeries(
      filteredSetRows,
      chartModes.all,
      variantFilters,
    );
    return mergeChartOverlay(series, chartOverlays.all, {
      mode: chartModes.all,
      ...overlayInput,
    });
  }, [
    filteredSetRows,
    chartModes.all,
    variantFilters,
    chartOverlays.all,
    overlayInput,
  ]);

  const liftCharts = useMemo(() => {
    const lifts: SbdLift[] = ["squat", "bench", "deadlift"];
    return lifts.map((lift) => ({
      lift,
      data: mergeChartOverlay(
        buildWeeklyE1rmSeries(
          filteredSetRows,
          lift,
          chartModes[lift],
          variantFilters[lift],
        ),
        chartOverlays[lift],
        {
          mode: chartModes[lift],
          variantFilter: variantFilters[lift],
          ...overlayInput,
        },
      ),
    }));
  }, [
    filteredSetRows,
    chartModes,
    variantFilters,
    chartOverlays,
    overlayInput,
  ]);

  const glSbdData = useMemo(
    () =>
      buildGlPointsSbdSeries(
        filteredSetRows,
        filteredBwRows,
        chartModes.glSbd,
        variantFilters,
      ),
    [filteredSetRows, filteredBwRows, chartModes.glSbd, variantFilters],
  );

  const glTotalData = useMemo(
    () =>
      buildGlPointsTotalSeries(
        filteredSetRows,
        filteredBwRows,
        chartModes.glTotal,
        variantFilters,
      ),
    [filteredSetRows, filteredBwRows, chartModes.glTotal, variantFilters],
  );

  const bwChartData = useMemo(
    () =>
      buildCheckinWeeklyChart(filteredBwRows, (row) => row.bw, chartModes.bw),
    [filteredBwRows, chartModes.bw],
  );

  const bwWeeklyTrend = useMemo(
    () => formatAverageWeeklyBwChange(computeAverageWeeklyBwChange(bwChartData)),
    [bwChartData],
  );

  function setChartMode(chartKey: string, mode: E1rmChartMode) {
    setChartModes((current) => ({ ...current, [chartKey]: mode }));
  }

  function setChartOverlay(chartKey: string, overlay: ChartOverlayMetric) {
    setChartOverlays((current) => ({ ...current, [chartKey]: overlay }));
  }

  function resetChart(chartKey: string) {
    setChartMode(chartKey, "weekly_best");
    setChartOverlay(chartKey, "none");
    if (chartKey !== "all" && chartKey !== "glSbd" && chartKey !== "glTotal" && chartKey !== "bw") {
      setVariantFilters((current) => ({
        ...current,
        [chartKey]: "competition",
      }));
    }
  }

  function hideChart(chartKey: keyof ChartVisibility) {
    setVisibility((current) => ({ ...current, [chartKey]: false }));
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            {...kpi}
            onClick={kpi.clickable ? () => setExpandedBw(true) : undefined}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {visibility.all ? (
          <ChartCard
            title="e1RM — alle lifts"
            subtitle="Hoogste e1RM per week"
            supportsOverlay
            overlayMetric={chartOverlays.all}
            onOverlayChange={(overlay) => setChartOverlay("all", overlay)}
            chartMode={chartModes.all}
            onChartModeChange={(mode) => setChartMode("all", mode)}
            axisFooter={<BlockSpanFooter data={combinedData} />}
            onHide={() => hideChart("all")}
            onReset={() => resetChart("all")}
            onExport={() =>
              exportRowsToCsv("e1rm-all-lifts.csv", combinedData as unknown as Array<Record<string, unknown>>)
            }
          >
            <E1rmAllLiftsChart
              data={combinedData}
              overlayMetric={chartOverlays.all}
            />
          </ChartCard>
        ) : null}

        {liftCharts.map(({ lift, data }) =>
          visibility[lift] ? (
            <ChartCard
              key={lift}
              title={`e1RM — ${formatLiftLabel(lift)}`}
              subtitle="Hoogste e1RM per week"
              supportsOverlay
              overlayMetric={chartOverlays[lift]}
              onOverlayChange={(overlay) => setChartOverlay(lift, overlay)}
              overlayExclude={[`e1rm_${lift}` as ChartOverlayMetric]}
              chartMode={chartModes[lift]}
              onChartModeChange={(mode) => setChartMode(lift, mode)}
              variantFilter={variantFilters[lift]}
              onVariantFilterChange={(value) =>
                setVariantFilters((current) => ({ ...current, [lift]: value }))
              }
              axisFooter={<BlockSpanFooter data={data} />}
              onHide={() => hideChart(lift)}
              onReset={() => resetChart(lift)}
              onExport={() =>
                exportRowsToCsv(`e1rm-${lift}.csv`, data as unknown as Array<Record<string, unknown>>)
              }
            >
              <E1rmLiftChart
                data={data}
                lift={lift}
                showPr
                overlayMetric={chartOverlays[lift]}
              />
            </ChartCard>
          ) : null,
        )}

        {visibility.glSbd ? (
          <ChartCard
            title="GL Points — SBD"
            subtitle="Geschatte GL points per lift"
            chartMode={chartModes.glSbd}
            onChartModeChange={(mode) => setChartMode("glSbd", mode)}
            variantFilter={variantFilters.squat}
            onVariantFilterChange={(value) =>
              setVariantFilters({ squat: value, bench: value, deadlift: value })
            }
            axisFooter={<BlockSpanFooter data={glSbdData} />}
            onHide={() => hideChart("glSbd")}
            onReset={() => resetChart("glSbd")}
            onExport={() =>
              exportRowsToCsv("gl-points-sbd.csv", glSbdData as unknown as Array<Record<string, unknown>>)
            }
          >
            <GlPointsSbdChart data={glSbdData} />
          </ChartCard>
        ) : null}

        {visibility.glTotal ? (
          <ChartCard
            title="GL Points — Totaal"
            subtitle="Geschatte GL points op SBD-totaal"
            chartMode={chartModes.glTotal}
            onChartModeChange={(mode) => setChartMode("glTotal", mode)}
            axisFooter={<BlockSpanFooter data={glTotalData} />}
            onHide={() => hideChart("glTotal")}
            onReset={() => resetChart("glTotal")}
            onExport={() =>
              exportRowsToCsv("gl-points-total.csv", glTotalData as unknown as Array<Record<string, unknown>>)
            }
          >
            <GlPointsTotalChart data={glTotalData} />
          </ChartCard>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MiniMetricCard
          title="Volume (hard sets)"
          value={miniMetrics.volume.value}
          change={`${miniMetrics.volume.change} vs vorige 4 weken`}
        >
          <MiniMetricChart
            series={miniMetrics.volume.series}
            color={miniMetrics.volume.color}
            type="bar"
          />
        </MiniMetricCard>

        <MiniMetricCard
          title="Intensiteit"
          value={miniMetrics.intensity.value}
          change={`${miniMetrics.intensity.change} vs vorige 4 weken`}
        >
          <MiniMetricChart
            series={miniMetrics.intensity.series}
            color={miniMetrics.intensity.color}
            type="line"
          />
        </MiniMetricCard>

        <MiniMetricCard
          title="Fatigue score"
          value={miniMetrics.fatigue.value}
          change={`${miniMetrics.fatigue.change} vs vorige 4 weken`}
          changeTone={Number(miniMetrics.fatigue.change) > 0 ? "risk" : "up"}
        >
          <MiniMetricChart
            series={miniMetrics.fatigue.series}
            color={miniMetrics.fatigue.color}
            type="line"
          />
        </MiniMetricCard>

        <InsightsCard insights={insights} />
      </div>

      {expandedBw ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setExpandedBw(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border border-white/10 bg-[#0d1118] p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-app-text">Lichaamsgewicht</h3>
                <p className="mt-1 text-sm text-app-muted">
                  BW trend per programmaweek
                  {bwWeeklyTrend ? ` · ${bwWeeklyTrend}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ChartModeSelect
                  value={chartModes.bw}
                  onChange={(mode) => setChartMode("bw", mode)}
                />
                <button
                  type="button"
                  onClick={() => setExpandedBw(false)}
                  className="rounded-lg border border-white/10 p-2 text-app-muted hover:text-app-text"
                  aria-label="Sluiten"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-[70vh]">
              <CheckinLineChart
                data={bwChartData}
                color={miniMetrics.bodyweight.color}
                name="BW"
                valueSuffix="kg"
              />
            </div>
            <BlockSpanFooter
              data={bwChartData.map((point) => ({
                blockId: point.blockId,
                shortBlockLabel: point.shortBlockLabel,
              }))}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
