"use client";

import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { LIMITLESS_CHART_COLORS } from "@/lib/ipfPoints";
import { getChartCatalogEntry } from "@/lib/statisticsChartCatalog";
import {
  applyChartBlockFilter,
  getBlockMetas,
  type ChartBlockFilterPreset,
} from "@/lib/statisticsChartFilters";
import type { StatisticsChartInstance } from "@/lib/statisticsChartInstances";
import {
  buildCheckinWeeklyChart,
  buildBwWeeklyChart,
  buildCombinedE1rmChart,
  buildExerciseTonnageChart,
  buildExerciseVolumeChart,
  buildLiftE1rmChart,
  buildLoadProgressionChart,
  buildTonnageChart,
  buildWeeklyIntensityChart,
  EMPTY_DATE_RANGE,
  formatLiftLabel,
  getAccessoryExerciseNames,
  getLiftFromChartId,
  getProgramExerciseNames,
  type StatisticsBwRow,
  type StatisticsFatigueRow,
  type StatisticsRecoveryRow,
  type StatisticsSetRow,
  type WeekChartPoint,
} from "@/lib/statisticsChartData";
import type { WeeklyVolumeRow } from "@/lib/chatVolumeData";
import {
  buildCombinedWeeklyE1rmSeries,
  buildWeeklyE1rmSeries,
  type E1rmChartMode,
} from "@/lib/statisticsE1rm";
import {
  buildGlPointsSbdSeries,
  buildGlPointsTotalSeries,
} from "@/lib/statisticsGlPoints";
import StatisticsChartFrame from "@/components/statistics/StatisticsChartFrame";
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
} from "@/components/statistics/dashboard/E1rmCharts";
import {
  BlockDividers,
  CHART_GRID,
  CHART_MARGIN,
  collectNumericValues,
  computeCountAxisDomain,
  computeNiceDomain,
  computeWeightAxisDomain,
  countYAxisProps,
  LINE_PROPS,
  StatisticsChartTooltip,
  weekAxisProps,
  weightYAxisProps,
  withChartAxisIndex,
} from "@/components/statistics/statisticsChartUi";

type StatisticsChartsSectionProps = {
  instances: StatisticsChartInstance[];
  setRows: StatisticsSetRow[];
  bwRows: StatisticsBwRow[];
  fatigueRows: StatisticsFatigueRow[];
  recoveryRows: StatisticsRecoveryRow[];
  volumeRows: WeeklyVolumeRow[];
  onRemoveInstance: (instanceId: string) => void;
  onUpdateInstance: (instance: StatisticsChartInstance) => void;
};

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-full items-center justify-center text-sm text-app-muted">
      {message}
    </div>
  );
}

function formatKg(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${value} kg`;
}

function VolumeBarChart({
  data,
  color,
  valueLabel = "Waarde",
  useCountAxis = false,
}: {
  data: WeekChartPoint[];
  color: string;
  valueLabel?: string;
  useCountAxis?: boolean;
}) {
  const values = collectNumericValues(data, ["value"]);
  const domain = useCountAxis
    ? computeCountAxisDomain(values)
    : computeWeightAxisDomain(values, { minFloor: 0 });

  const chartData = withChartAxisIndex(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} margin={CHART_MARGIN} barCategoryGap="18%">
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis
          {...(useCountAxis ? countYAxisProps(domain) : weightYAxisProps(domain))}
        />
        <Tooltip
          content={<StatisticsChartTooltip />}
          formatter={(value) => [String(value), valueLabel]}
        />
        <BlockDividers data={data} />
        <Bar dataKey="value" name={valueLabel} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function SingleLineChart({
  data,
  color,
  name,
  formatValue,
}: {
  data: WeekChartPoint[];
  color: string;
  name: string;
  formatValue?: (value: number) => string;
}) {
  const domain = computeWeightAxisDomain(collectNumericValues(data, ["value"]));

  const chartData = withChartAxisIndex(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={CHART_MARGIN}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis {...weightYAxisProps(domain)} />
        <Tooltip
          content={<StatisticsChartTooltip />}
          formatter={(value) => [
            formatValue ? formatValue(Number(value)) : String(value),
            name,
          ]}
        />
        <BlockDividers data={data} />
        <Line {...LINE_PROPS} dataKey="value" name={name} stroke={color} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function StatisticsChartsSection({
  instances,
  setRows,
  bwRows,
  fatigueRows,
  recoveryRows,
  volumeRows,
  onRemoveInstance,
  onUpdateInstance,
}: StatisticsChartsSectionProps) {
  const [chartFilters, setChartFilters] = useState<
    Record<string, ChartBlockFilterPreset>
  >({});
  const [chartModes, setChartModes] = useState<Record<string, E1rmChartMode>>({});
  const [chartOverlays, setChartOverlays] = useState<
    Record<string, ChartOverlayMetric>
  >({});

  const blockMetas = useMemo(
    () =>
      getBlockMetas([
        ...setRows.map((row) => ({
          blockId: row.blockId,
          blockTitle: row.blockTitle,
          date: row.date,
        })),
        ...bwRows.map((row) => ({
          blockId: row.blockId,
          blockTitle: row.blockTitle,
          date: row.date,
        })),
        ...fatigueRows.map((row) => ({
          blockId: row.blockId,
          blockTitle: row.blockTitle,
          date: row.date,
        })),
        ...recoveryRows.map((row) => ({
          blockId: row.blockId,
          blockTitle: row.blockTitle,
          date: row.date,
        })),
        ...volumeRows.map((row) => ({
          blockId: row.blockId,
          blockTitle: row.blockTitle,
          date: row.date,
        })),
      ]),
    [setRows, bwRows, fatigueRows, recoveryRows, volumeRows],
  );

  const exerciseNames = useMemo(() => getProgramExerciseNames(setRows), [setRows]);
  const accessoryExerciseNames = useMemo(
    () => getAccessoryExerciseNames(setRows),
    [setRows],
  );

  function getFilter(chartKey: string): ChartBlockFilterPreset {
    return chartFilters[chartKey] || "all";
  }

  function setFilter(chartKey: string, preset: ChartBlockFilterPreset) {
    setChartFilters((current) => ({ ...current, [chartKey]: preset }));
  }

  function getChartMode(chartKey: string): E1rmChartMode {
    return chartModes[chartKey] || "weekly_best";
  }

  function setChartMode(chartKey: string, mode: E1rmChartMode) {
    setChartModes((current) => ({ ...current, [chartKey]: mode }));
  }

  function getChartOverlay(chartKey: string): ChartOverlayMetric {
    return chartOverlays[chartKey] || "none";
  }

  function setChartOverlay(chartKey: string, overlay: ChartOverlayMetric) {
    setChartOverlays((current) => ({ ...current, [chartKey]: overlay }));
  }

  function filterSetRows(preset: ChartBlockFilterPreset) {
    return applyChartBlockFilter(setRows, preset, blockMetas);
  }

  function filterBwRows(preset: ChartBlockFilterPreset) {
    return applyChartBlockFilter(bwRows, preset, blockMetas);
  }

  function filterFatigueRows(preset: ChartBlockFilterPreset) {
    return applyChartBlockFilter(fatigueRows, preset, blockMetas);
  }

  function filterRecoveryRows(preset: ChartBlockFilterPreset) {
    return applyChartBlockFilter(recoveryRows, preset, blockMetas);
  }

  function filterVolumeRows(preset: ChartBlockFilterPreset) {
    return applyChartBlockFilter(volumeRows, preset, blockMetas);
  }

  function exerciseSelector(
    instance: StatisticsChartInstance,
    options: string[],
  ) {
    if (!instance.exerciseName && options.length === 0) return null;

    return (
      <div>
        <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-app-muted">
          Oefening
        </label>
        <select
          value={instance.exerciseName || options[0] || ""}
          onChange={(event) =>
            onUpdateInstance({ ...instance, exerciseName: event.target.value })
          }
          className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
        >
          {options.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function renderInstance(instance: StatisticsChartInstance) {
    const chartKey = instance.instanceId;
    const chartId = instance.chartId;
    const entry = getChartCatalogEntry(chartId);
    if (!entry) return null;

    const frameProps = {
      filter: getFilter(chartKey),
      onFilterChange: (preset: ChartBlockFilterPreset) => setFilter(chartKey, preset),
      onRemove: () => onRemoveInstance(instance.instanceId),
    };

    const chartModeProps = {
      chartMode: getChartMode(chartKey),
      onChartModeChange: (mode: E1rmChartMode) => setChartMode(chartKey, mode),
    };

    const overlayFrameProps = {
      supportsOverlay: true as const,
      overlayMetric: getChartOverlay(chartKey),
      onOverlayChange: (overlay: ChartOverlayMetric) =>
        setChartOverlay(chartKey, overlay),
    };

    const overlayInput = {
      setRows: filterSetRows(getFilter(chartKey)),
      bwRows: filterBwRows(getFilter(chartKey)),
      fatigueRows: filterFatigueRows(getFilter(chartKey)),
      recoveryRows: filterRecoveryRows(getFilter(chartKey)),
    };

    if (chartId === "e1rm_all") {
      const data = mergeChartOverlay(
        buildCombinedWeeklyE1rmSeries(
          overlayInput.setRows,
          getChartMode(chartKey),
        ),
        getChartOverlay(chartKey),
        {
          mode: getChartMode(chartKey),
          ...overlayInput,
        },
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="e1RM trend per week"
          axisData={data}
          {...chartModeProps}
          {...overlayFrameProps}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message="Geen e1RM data in dit bereik." />
          ) : (
            <E1rmAllLiftsChart
              data={data}
              overlayMetric={getChartOverlay(chartKey)}
            />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId.startsWith("e1rm_")) {
      const lift = getLiftFromChartId(chartId);
      if (!lift) return null;

      const data = mergeChartOverlay(
        buildWeeklyE1rmSeries(
          overlayInput.setRows,
          lift,
          getChartMode(chartKey),
        ),
        getChartOverlay(chartKey),
        {
          mode: getChartMode(chartKey),
          ...overlayInput,
        },
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="e1RM trend per week"
          axisData={data}
          {...chartModeProps}
          overlayExclude={[`e1rm_${lift}` as ChartOverlayMetric]}
          {...overlayFrameProps}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message={`Geen ${formatLiftLabel(lift)} data.`} />
          ) : (
            <E1rmLiftChart
              data={data}
              lift={lift}
              overlayMetric={getChartOverlay(chartKey)}
            />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId === "bw") {
      const data = buildCheckinWeeklyChart(
        filterBwRows(getFilter(chartKey)),
        (row) => row.bw,
        getChartMode(chartKey),
      );
      const latest = data.filter((item) => item.value !== null).at(-1)?.value ?? null;
      const bwTrend = formatAverageWeeklyBwChange(
        computeAverageWeeklyBwChange(data),
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle={
            latest
              ? `Laatste: ${formatKg(latest)}${bwTrend ? ` · ${bwTrend}` : ""}`
              : "BW per programmaweek"
          }
          axisData={data}
          heightClass="h-[320px]"
          {...chartModeProps}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message="Geen BW data in dit bereik." />
          ) : (
            <CheckinLineChart
              data={data}
              color={LIMITLESS_CHART_COLORS.primary}
              name="BW"
              valueSuffix="kg"
            />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId === "fatigue") {
      const data = buildCheckinWeeklyChart(
        filterFatigueRows(getFilter(chartKey)),
        (row) => row.fatigue,
        getChartMode(chartKey),
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="Pre-training fatigue score"
          axisData={data}
          {...chartModeProps}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message="Geen fatigue data in dit bereik." />
          ) : (
            <CheckinLineChart
              data={data}
              color="#f97316"
              name="Fatigue"
              valueSuffix=""
            />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId === "recovery") {
      const data = buildCheckinWeeklyChart(
        filterRecoveryRows(getFilter(chartKey)),
        (row) => row.recovery,
        getChartMode(chartKey),
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="Pre-training herstel score"
          axisData={data}
          {...chartModeProps}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message="Geen herstel data in dit bereik." />
          ) : (
            <CheckinLineChart
              data={data}
              color="#22c55e"
              name="Herstel"
              valueSuffix=""
            />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId === "gl_points_sbd") {
      const data = buildGlPointsSbdSeries(
        filterSetRows(getFilter(chartKey)),
        filterBwRows(getFilter(chartKey)),
        getChartMode(chartKey),
        {
          squat: "competition",
          bench: "competition",
          deadlift: "competition",
        },
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="Geschatte GL points per lift"
          axisData={data}
          {...chartModeProps}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message="Geen GL Points data in dit bereik." />
          ) : (
            <GlPointsSbdChart data={data} />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId === "gl_points_total") {
      const data = buildGlPointsTotalSeries(
        filterSetRows(getFilter(chartKey)),
        filterBwRows(getFilter(chartKey)),
        getChartMode(chartKey),
        {
          squat: "competition",
          bench: "competition",
          deadlift: "competition",
        },
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="Geschatte GL points op SBD-totaal"
          axisData={data}
          {...chartModeProps}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message="Geen GL Points data in dit bereik." />
          ) : (
            <GlPointsTotalChart data={data} />
          )}
        </StatisticsChartFrame>
      );
    }

    if (
      chartId === "sets_per_exercise" ||
      chartId === "reps_per_exercise" ||
      chartId === "tonnage_exercise"
    ) {
      const exerciseName =
        instance.exerciseName || exerciseNames[0] || accessoryExerciseNames[0] || "";
      const options =
        chartId === "tonnage_exercise" ? accessoryExerciseNames : exerciseNames;

      const data =
        chartId === "tonnage_exercise"
          ? buildExerciseTonnageChart(
              filterSetRows(getFilter(chartKey)),
              exerciseName,
              EMPTY_DATE_RANGE,
            )
          : buildExerciseVolumeChart(
              filterSetRows(getFilter(chartKey)),
              exerciseName,
              EMPTY_DATE_RANGE,
              chartId === "sets_per_exercise" ? "sets" : "reps",
            );

      const title =
        chartId === "tonnage_exercise"
          ? `Tonnage — ${exerciseName || "oefening"}`
          : `${entry.label}${exerciseName ? ` — ${exerciseName}` : ""}`;

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={title}
          subtitle={
            chartId === "tonnage_exercise"
              ? "Totaal volume per week"
              : chartId === "sets_per_exercise"
                ? "Totaal sets per week"
                : "Totaal reps per week"
          }
          axisData={data}
          exerciseSelector={exerciseSelector(instance, options)}
          {...frameProps}
        >
          {!exerciseName || data.length === 0 ? (
            <EmptyChart message="Geen data voor deze oefening." />
          ) : (
            <VolumeBarChart
              data={data}
              color={LIMITLESS_CHART_COLORS.primary}
              useCountAxis={
                chartId === "sets_per_exercise" || chartId === "reps_per_exercise"
              }
              valueLabel={
                chartId === "tonnage_exercise"
                  ? "Tonnage (kg)"
                  : chartId === "sets_per_exercise"
                    ? "Sets"
                    : "Reps"
              }
            />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId.startsWith("avg_intensity_") || chartId.startsWith("peak_intensity_")) {
      const lift = getLiftFromChartId(chartId);
      if (!lift) return null;

      const mode = chartId.startsWith("avg_intensity_") ? "average" : "peak";
      const data = buildWeeklyIntensityChart(
        filterSetRows(getFilter(chartKey)),
        lift,
        EMPTY_DATE_RANGE,
        mode,
      );

      const rpeDomain = computeNiceDomain(collectNumericValues(data, ["rpe"]), {
        minFloor: 0,
        maxCeil: 10,
      });
      const pctDomain = computeNiceDomain(
        collectNumericValues(data, ["intensityPct"]),
        { minFloor: 0, maxCeil: 100 },
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle={mode === "average" ? "Gemiddelde per week" : "Piek per week"}
          axisData={data}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message={`Geen intensiteitsdata voor ${formatLiftLabel(lift)}.`} />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={withChartAxisIndex(data)} margin={CHART_MARGIN}>
                <CartesianGrid {...CHART_GRID} />
                <XAxis {...weekAxisProps(data)} />
                <YAxis yAxisId="left" {...weightYAxisProps(rpeDomain)} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  {...weightYAxisProps(pctDomain)}
                />
                <Tooltip content={<StatisticsChartTooltip />} />
                <Legend />
                <BlockDividers data={data} />
                <Line {...LINE_PROPS} yAxisId="left" dataKey="rpe" name="RPE" stroke={LIMITLESS_CHART_COLORS.accent} />
                <Line {...LINE_PROPS} yAxisId="right" dataKey="intensityPct" name="% 1RM" stroke={LIMITLESS_CHART_COLORS[lift]} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId.startsWith("load_progression_")) {
      const lift = getLiftFromChartId(chartId);
      if (!lift) return null;

      const data = buildLoadProgressionChart(
        filterSetRows(getFilter(chartKey)),
        lift,
        EMPTY_DATE_RANGE,
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="Zwaarste gewicht per week"
          axisData={data}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message={`Geen load data voor ${formatLiftLabel(lift)}.`} />
          ) : (
            <SingleLineChart
              data={data}
              color={LIMITLESS_CHART_COLORS[lift]}
              name="Zwaarste set"
              formatValue={(value) => formatKg(value)}
            />
          )}
        </StatisticsChartFrame>
      );
    }

    if (chartId.startsWith("tonnage_")) {
      const lift = getLiftFromChartId(chartId);
      if (!lift) return null;

      const data = buildTonnageChart(
        filterVolumeRows(getFilter(chartKey)),
        lift,
        EMPTY_DATE_RANGE,
      );

      return (
        <StatisticsChartFrame
          key={chartKey}
          title={entry.label}
          subtitle="Totaal volume per week"
          axisData={data}
          {...frameProps}
        >
          {data.length === 0 ? (
            <EmptyChart message={`Geen tonnage data voor ${formatLiftLabel(lift)}.`} />
          ) : (
            <VolumeBarChart
              data={data}
              color={LIMITLESS_CHART_COLORS[lift]}
              valueLabel="Tonnage (kg)"
            />
          )}
        </StatisticsChartFrame>
      );
    }

    return null;
  }

  if (instances.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-app-border bg-app-surface p-8 text-center">
        <p className="text-sm text-app-muted">
          Nog geen grafieken. Klik op &quot;Grafiek toevoegen&quot; om te beginnen.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {instances.map((instance) => {
        if (instance.chartId === "bw") {
          return (
            <div key={instance.instanceId} className="col-span-full">
              {renderInstance(instance)}
            </div>
          );
        }

        return renderInstance(instance);
      })}
    </div>
  );
}
