"use client";

import type { ReactNode } from "react";
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
} from "recharts";
import { Star } from "lucide-react";
import { LIMITLESS_CHART_COLORS } from "@/lib/ipfPoints";
import type { CombinedE1rmPoint, SingleValuePoint } from "@/lib/statisticsChartData";
import type { SbdLift } from "@/lib/chatVolumeData";
import {
  BlockDividers,
  CHART_GRID,
  CHART_MARGIN,
  collectNumericValues,
  computeWeightAxisDomain,
  LINE_PROPS,
  StatisticsChartTooltip,
  weekAxisProps,
  weightYAxisProps,
  withChartAxisIndex,
} from "@/components/statistics/statisticsChartUi";

export function Sparkline({
  data,
  color,
  variant = "line",
}: {
  data: number[];
  color: string;
  variant?: "line" | "bar";
}) {
  if (data.length === 0) {
    return <div className="h-10" />;
  }

  const chartData = data.map((value, index) => ({ index, value }));

  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {variant === "bar" ? (
          <BarChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function CombinedE1rmChart({ data }: { data: CombinedE1rmPoint[] }) {
  const domain = computeWeightAxisDomain(
    collectNumericValues(data, ["squat", "bench", "deadlift"]),
  );
  const chartData = withChartAxisIndex(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={CHART_MARGIN}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis {...weightYAxisProps(domain)} />
        <Tooltip content={<StatisticsChartTooltip />} />
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

export function LiftE1rmChart({
  data,
  lift,
  showPr = false,
}: {
  data: SingleValuePoint[];
  lift: SbdLift;
  showPr?: boolean;
}) {
  const domain = computeWeightAxisDomain(collectNumericValues(data, ["value"]));
  const color = LIMITLESS_CHART_COLORS[lift];

  const lastIndex = showPr
    ? [...data]
        .map((point, index) => ({ point, index }))
        .reverse()
        .find(({ point }) => typeof point.value === "number")?.index
    : undefined;
  const chartData = withChartAxisIndex(data);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData} margin={{ ...CHART_MARGIN, top: 28 }}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis {...weekAxisProps(data)} />
        <YAxis {...weightYAxisProps(domain)} />
        <Tooltip
          content={<StatisticsChartTooltip />}
          formatter={(value) => [`${value} kg`, "e1RM"]}
        />
        <BlockDividers data={data} />
        <Line
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
                        <div className="flex items-center justify-center gap-1 rounded-full border border-app-border bg-[#111827] px-2 py-1 text-[10px] font-semibold text-white shadow-lg">
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

export function OverviewMetricCard({
  title,
  value,
  change,
  changeTone = "up",
  children,
}: {
  title: string;
  value: string;
  change: string;
  changeTone?: "up" | "down" | "neutral";
  children: ReactNode;
}) {
  const toneClass =
    changeTone === "up"
      ? "text-emerald-400"
      : changeTone === "down"
        ? "text-red-400"
        : "text-app-muted";

  return (
    <div className="rounded-2xl border border-app-border bg-app-surface p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
        {title}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-app-text">{value}</p>
          <p className={`mt-1 text-xs font-medium ${toneClass}`}>{change}</p>
        </div>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}
