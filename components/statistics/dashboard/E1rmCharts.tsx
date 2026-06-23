"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { Star } from "lucide-react";
import { LIMITLESS_CHART_COLORS } from "@/lib/ipfPoints";
import ChartTooltip from "@/components/statistics/dashboard/ChartTooltip";
import {
  BlockDividers,
  CHART_GRID,
  CHART_MARGIN,
  CHART_MARGIN_DUAL_AXIS,
  bodyweightYAxisProps,
  collectNumericValues,
  computeNiceDomain,
  computeWeightAxisDomain,
  LINE_PROPS,
  scoreYAxisProps,
  weekAxisProps,
  weightYAxisProps,
  withChartAxisIndex,
} from "@/components/statistics/statisticsChartUi";
import type { E1rmChartPoint } from "@/lib/statisticsE1rm";
import type { SingleValuePoint } from "@/lib/statisticsChartData";
import type { SbdLift } from "@/lib/chatVolumeData";
import {
  getOverlayLabel,
  getOverlaySuffix,
  type ChartOverlayMetric,
  type OverlayChartPoint,
} from "@/lib/statisticsChartOverlay";
import {
  computeAverageWeeklyBwChange,
  formatAverageWeeklyBwChange,
} from "@/lib/statisticsBwTrend";

function overlayUsesScoreAxis(metric: ChartOverlayMetric) {
  return metric === "fatigue" || metric === "recovery";
}

function overlayUsesBodyweightAxis(metric: ChartOverlayMetric) {
  return metric === "bw";
}

function overlayRightAxisProps(
  metric: ChartOverlayMetric,
  data: Array<{ overlayValue?: number | null }>,
) {
  if (overlayUsesScoreAxis(metric)) {
    return scoreYAxisProps();
  }

  const overlayValues = collectNumericValues(
    data as Array<Record<string, unknown>>,
    ["overlayValue"],
  );

  if (overlayUsesBodyweightAxis(metric)) {
    const domain = computeWeightAxisDomain(overlayValues, { padRatio: 0.08 });
    return bodyweightYAxisProps(domain);
  }

  const domain = computeWeightAxisDomain(overlayValues, { padRatio: 0.08 });
  return weightYAxisProps(domain);
}

function OverlayTooltip({
  active,
  payload,
  overlayMetric,
  primarySuffix = "kg",
}: {
  active?: boolean;
  payload?: Array<{
    color?: string;
    name?: string;
    dataKey?: string | number;
    value?: number | string;
    payload?: OverlayChartPoint;
  }>;
  overlayMetric: ChartOverlayMetric;
  primarySuffix?: string;
}) {
  if (!active || !payload?.length) return null;

  const point = payload[0]?.payload;
  if (!point) return null;

  const overlaySuffix = getOverlaySuffix(overlayMetric);

  return (
    <div className="rounded-xl border border-white/10 bg-[#111827] px-3 py-2.5 shadow-2xl">
      <p className="text-xs font-semibold text-white">
        {point.shortBlockLabel} · {point.weekLabel}
      </p>
      {point.date ? (
        <p className="mt-0.5 text-[11px] text-app-muted">{point.date}</p>
      ) : null}
      <div className="mt-2 space-y-1.5">
        {payload.map((entry) => {
          const name = String(entry.name || entry.dataKey || "");
          const suffix =
            entry.dataKey === "overlayValue"
              ? overlaySuffix
                ? ` ${overlaySuffix}`
                : ""
              : primarySuffix
                ? ` ${primarySuffix}`
                : "";

          return (
            <div key={name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color || "#a78bfa" }}
              />
              <span className="text-app-muted">{name}</span>
              <span className="ml-auto font-medium text-white">
                {entry.value}
                {suffix}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function E1rmAllLiftsChart({
  data,
  overlayMetric = "none",
}: {
  data: Array<E1rmChartPoint & { overlayValue?: number | null }>;
  overlayMetric?: ChartOverlayMetric;
}) {
  const domain = computeWeightAxisDomain(
    collectNumericValues(data, ["squat", "bench", "deadlift"]),
  );
  const hasOverlay = overlayMetric !== "none";
  const margin = hasOverlay ? CHART_MARGIN_DUAL_AXIS : CHART_MARGIN;
  const chartData = withChartAxisIndex(data);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-muted">
        Geen e1RM data in dit bereik.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={margin}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis yAxisId="left" {...weightYAxisProps(domain)} />
        {hasOverlay ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            {...overlayRightAxisProps(overlayMetric, data)}
          />
        ) : null}
        <Tooltip
          content={
            hasOverlay ? (
              <OverlayTooltip overlayMetric={overlayMetric} />
            ) : (
              <ChartTooltip />
            )
          }
        />
        <BlockDividers data={data} />
        <Legend
          verticalAlign="bottom"
          height={24}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Line yAxisId="left" {...LINE_PROPS} dataKey="squat" name="Squat" stroke={LIMITLESS_CHART_COLORS.squat} />
        <Line yAxisId="left" {...LINE_PROPS} dataKey="bench" name="Bench" stroke={LIMITLESS_CHART_COLORS.bench} />
        <Line
          yAxisId="left"
          {...LINE_PROPS}
          dataKey="deadlift"
          name="Deadlift"
          stroke={LIMITLESS_CHART_COLORS.deadlift}
        />
        {hasOverlay ? (
          <Line
            yAxisId="right"
            {...LINE_PROPS}
            dataKey="overlayValue"
            name={getOverlayLabel(overlayMetric)}
            stroke="#f97316"
            strokeDasharray="5 4"
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function E1rmLiftChart({
  data,
  lift,
  showPr = false,
  overlayMetric = "none",
}: {
  data: Array<E1rmChartPoint & { overlayValue?: number | null }>;
  lift: SbdLift;
  showPr?: boolean;
  overlayMetric?: ChartOverlayMetric;
}) {
  const domain = computeWeightAxisDomain(collectNumericValues(data, ["value"]));
  const color = LIMITLESS_CHART_COLORS[lift];
  const hasOverlay = overlayMetric !== "none";
  const margin = hasOverlay
    ? { ...CHART_MARGIN_DUAL_AXIS, top: 28 }
    : { ...CHART_MARGIN, top: 28 };

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-muted">
        Geen data voor deze lift.
      </div>
    );
  }

  const lastIndex = showPr
    ? [...data]
        .map((point, index) => ({ point, index }))
        .reverse()
        .find(({ point }) => typeof point.value === "number")?.index
    : undefined;
  const chartData = withChartAxisIndex(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={margin}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis yAxisId="left" {...weightYAxisProps(domain)} />
        {hasOverlay ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            {...overlayRightAxisProps(overlayMetric, data)}
          />
        ) : null}
        <Tooltip
          content={
            hasOverlay ? (
              <OverlayTooltip overlayMetric={overlayMetric} />
            ) : (
              <ChartTooltip />
            )
          }
        />
        <BlockDividers data={data} />
        <Line
          yAxisId="left"
          {...LINE_PROPS}
          dataKey="value"
          name="e1RM"
          stroke={color}
          dot={
            showPr && lastIndex !== undefined
              ? (props) => {
                  const { cx, cy, index, payload } = props;
                  if (index !== lastIndex || cx === undefined || cy === undefined) {
                    return <g />;
                  }

                  const value = payload?.value;
                  if (typeof value !== "number") return <g />;

                  return (
                    <g>
                      <circle cx={cx} cy={cy} r={4} fill={color} />
                      <foreignObject x={cx - 42} y={cy - 38} width={84} height={28}>
                        <div className="flex items-center justify-center gap-1 rounded-full border border-white/10 bg-[#111827] px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
                          <Star className="h-3 w-3" style={{ color }} fill={color} />
                          <span>PR {value} kg</span>
                        </div>
                      </foreignObject>
                    </g>
                  );
                }
              : false
          }
        />
        {hasOverlay ? (
          <Line
            yAxisId="right"
            {...LINE_PROPS}
            dataKey="overlayValue"
            name={getOverlayLabel(overlayMetric)}
            stroke="#f97316"
            strokeDasharray="5 4"
          />
        ) : null}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GlPointsSbdChart({ data }: { data: E1rmChartPoint[] }) {
  const domain = computeNiceDomain(
    collectNumericValues(data, ["squat", "bench", "deadlift"]),
  );
  const chartData = withChartAxisIndex(data);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-muted">
        Geen GL Points data in dit bereik.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={CHART_MARGIN}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis
          domain={domain}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip content={<ChartTooltip valueSuffix="pts" />} />
        <BlockDividers data={data} />
        <Legend
          verticalAlign="bottom"
          height={24}
          iconType="plainline"
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
        />
        <Line {...LINE_PROPS} dataKey="squat" name="Squat" stroke={LIMITLESS_CHART_COLORS.squat} />
        <Line {...LINE_PROPS} dataKey="bench" name="Bench" stroke={LIMITLESS_CHART_COLORS.bench} />
        <Line
          {...LINE_PROPS}
          dataKey="deadlift"
          name="Deadlift"
          stroke={LIMITLESS_CHART_COLORS.deadlift}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function GlPointsTotalChart({ data }: { data: E1rmChartPoint[] }) {
  const domain = computeNiceDomain(collectNumericValues(data, ["value"]));
  const chartData = withChartAxisIndex(data);

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-muted">
        Geen GL Points data in dit bereik.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={CHART_MARGIN}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis
          domain={domain}
          tick={{ fill: "#94a3b8", fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip content={<ChartTooltip valueSuffix="pts" />} />
        <BlockDividers data={data} />
        <Line
          {...LINE_PROPS}
          dataKey="value"
          name="GL Points"
          stroke={LIMITLESS_CHART_COLORS.accent}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CheckinLineChart({
  data,
  color,
  name,
  valueSuffix = "kg",
}: {
  data: SingleValuePoint[];
  color: string;
  name: string;
  valueSuffix?: string;
}) {
  const domain =
    valueSuffix === "kg"
      ? computeWeightAxisDomain(collectNumericValues(data, ["value"]), {
          padRatio: 0.05,
        })
      : computeWeightAxisDomain(collectNumericValues(data, ["value"]), {
          minFloor: 0,
        });

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-app-muted">
        Geen data in dit bereik.
      </div>
    );
  }

  const chartData = withChartAxisIndex(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={CHART_MARGIN}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis
          {...(valueSuffix === "kg"
            ? bodyweightYAxisProps(domain)
            : weightYAxisProps(domain))}
        />
        <Tooltip content={<ChartTooltip valueSuffix={valueSuffix} />} />
        <BlockDividers data={data} />
        <Line {...LINE_PROPS} dataKey="value" name={name} stroke={color} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MiniMetricChart({
  series,
  color,
  type,
}: {
  series: number[];
  color: string;
  type: "bar" | "line" | "area";
}) {
  const data = series.map((value, index) => ({ index, value }));

  if (data.length === 0) {
    return (
      <div className="flex h-[88px] items-center justify-center text-xs text-app-muted">
        Geen data
      </div>
    );
  }

  return (
    <div className="h-[88px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : type === "area" ? (
          <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.12}
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        ) : (
          <LineChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={series.length <= 8}
              activeDot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}
