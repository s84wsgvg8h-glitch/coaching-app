"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizontal, X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  buildExternalWeekOptions,
  filterExternalPointsByDateRange,
  formatExternalMetricLabel,
  formatExternalNumber,
  formatExternalWeekOptionLabel,
  getExternalMetricValue,
  loadAthleteDailyExternalData,
  resolveExternalDateRangeFromWeeks,
  type DailyExternalPoint,
  type ExternalMetric,
} from "@/lib/chatExternalsData";
import { formatShortDate } from "@/lib/chatBwData";
import { captureElementAsPngFile } from "@/lib/captureChartAsPng";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatExternalsPanelProps = {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
  onSendChartToChat?: (file: File, caption: string) => void;
  canSendChart?: boolean;
};

const METRIC_OPTIONS: ExternalMetric[] = ["recovery", "fatigue"];

type ExternalMetricChartProps = {
  metric: ExternalMetric;
  filteredPoints: DailyExternalPoint[];
  chartRef: (element: HTMLDivElement | null) => void;
};

function ExternalMetricChart({
  metric,
  filteredPoints,
  chartRef,
}: ExternalMetricChartProps) {
  const chartData = useMemo(
    () =>
      filteredPoints
        .map((point) => ({
          date: point.date,
          value: getExternalMetricValue(point, metric),
          label: point.label,
        }))
        .filter((point) => point.value !== null),
    [filteredPoints, metric],
  );

  const lastValue =
    chartData.length > 0 ? chartData[chartData.length - 1].value : null;
  const firstValue = chartData.length > 0 ? chartData[0].value : null;
  const periodDelta =
    firstValue !== null && lastValue !== null ? lastValue - firstValue : null;

  const values = chartData
    .map((point) => point.value)
    .filter((value): value is number => value !== null);
  const minValue = values.length > 0 ? Math.max(0, Math.min(...values) - 1) : 0;
  const maxValue = values.length > 0 ? Math.min(6, Math.max(...values) + 1) : 6;

  if (chartData.length === 0) {
    return (
      <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h5 className="text-sm font-black text-black">
            {formatExternalMetricLabel(metric)}
          </h5>
        </div>
        <p className="py-8 text-center text-sm text-gray-500">
          Geen {formatExternalMetricLabel(metric).toLowerCase()} data in deze periode.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4 px-1">
        <h5 className="text-sm font-black text-black">
          {formatExternalMetricLabel(metric)}
        </h5>
        <div className="text-right">
          <p className="text-2xl font-black text-black">
            {formatExternalNumber(lastValue)}
          </p>
          <p
            className={`text-xs font-black ${
              periodDelta !== null
                ? periodDelta >= 0
                  ? "text-green-600"
                  : "text-red-600"
                : "text-gray-400"
            }`}
          >
            {periodDelta !== null
              ? `${periodDelta >= 0 ? "+" : ""}${periodDelta} in deze tijd`
              : "-"}
          </p>
        </div>
      </div>

      <div ref={chartRef} className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => formatShortDate(value)}
              tick={{ fontSize: 10 }}
              minTickGap={24}
            />
            <YAxis domain={[minValue, maxValue]} ticks={[0, 2, 4, 6]} />
            <Tooltip
              labelFormatter={(value) => formatShortDate(String(value))}
              formatter={(value) => [
                formatExternalNumber(Number(value)),
                formatExternalMetricLabel(metric),
              ]}
            />
            <Line
              type="linear"
              dataKey="value"
              name={formatExternalMetricLabel(metric)}
              stroke="#111827"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function ChatExternalsPanel({
  athleteId,
  athleteName,
  onClose,
  onSendChartToChat,
  canSendChart = true,
}: ChatExternalsPanelProps) {
  const chartContainerRefs = useRef<
    Partial<Record<ExternalMetric, HTMLDivElement | null>>
  >({});
  const [points, setPoints] = useState<DailyExternalPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sendingChart, setSendingChart] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [beginWeekId, setBeginWeekId] = useState("");
  const [endWeekId, setEndWeekId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await loadAthleteDailyExternalData(athleteId);
        if (cancelled) return;
        setPoints(data);
        setBeginWeekId("");
        setEndWeekId("");
        setStartDate(data[0]?.date || "");
        setEndDate(data[data.length - 1]?.date || "");
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Check-in data kon niet worden geladen.",
        );
        setPoints([]);
        setStartDate("");
        setEndDate("");
        setBeginWeekId("");
        setEndWeekId("");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const weekOptions = useMemo(() => buildExternalWeekOptions(points), [points]);

  const filteredPoints = useMemo(
    () => filterExternalPointsByDateRange(points, startDate, endDate),
    [points, startDate, endDate],
  );

  const metricsWithData = useMemo(
    () =>
      METRIC_OPTIONS.filter((metric) =>
        filteredPoints.some(
          (point) => getExternalMetricValue(point, metric) !== null,
        ),
      ),
    [filteredPoints],
  );

  const hasAnyChartData = metricsWithData.length > 0;
  const hasWeekFilter = Boolean(beginWeekId || endWeekId);

  function applyWeekSelection(nextBeginWeekId: string, nextEndWeekId: string) {
    const range = resolveExternalDateRangeFromWeeks(
      weekOptions,
      nextBeginWeekId,
      nextEndWeekId,
      points[0]?.date || "",
      points[points.length - 1]?.date || "",
    );

    setBeginWeekId(nextBeginWeekId);
    setEndWeekId(nextEndWeekId);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  async function handleSendChartToChat() {
    if (!onSendChartToChat || sendingChart) return;

    const metricsToSend = METRIC_OPTIONS.filter(
      (metric) => chartContainerRefs.current[metric],
    );

    if (metricsToSend.length === 0) return;

    setSendingChart(true);

    const periodLabel =
      startDate && endDate
        ? ` (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`
        : "";

    try {
      for (const metric of metricsToSend) {
        const container = chartContainerRefs.current[metric];
        if (!container) continue;

        const file = await captureElementAsPngFile(
          container,
          `externals-${metric}-${athleteId}.png`,
        );
        const caption = `${formatExternalMetricLabel(metric)} grafiek ${athleteName}${periodLabel}`;

        onSendChartToChat(file, caption);
      }
    } catch (sendError) {
      alert(
        sendError instanceof Error
          ? sendError.message
          : "Grafiek kon niet worden verstuurd.",
      );
    } finally {
      setSendingChart(false);
    }
  }

  const showSendChartButton =
    Boolean(onSendChartToChat) && !loading && !error && hasAnyChartData;

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-black">Externals</h3>
          <p className="truncate text-xs text-gray-500">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="Externals sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-gray-500">
            Program check-in
          </p>
          <h4 className="text-lg font-black text-black">
            {hasWeekFilter ? "Gefilterde periode" : "Alle dagen"}
          </h4>
        </div>

        {!loading && !error && points.length > 0 && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Begin week
              </label>
              <select
                value={beginWeekId}
                onChange={(event) =>
                  applyWeekSelection(event.target.value, endWeekId)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-black outline-none"
              >
                <option value="">Alle weken</option>
                {weekOptions.map((week) => (
                  <option key={`begin-${week.id}`} value={week.id}>
                    {formatExternalWeekOptionLabel(week)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Eind week
              </label>
              <select
                value={endWeekId}
                onChange={(event) =>
                  applyWeekSelection(beginWeekId, event.target.value)
                }
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-black outline-none"
              >
                <option value="">Alle weken</option>
                {weekOptions.map((week) => (
                  <option key={`end-${week.id}`} value={week.id}>
                    {formatExternalWeekOptionLabel(week)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            Check-in laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && points.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Nog geen check-in data voor deze atleet.
          </div>
        )}

        {!loading && !error && points.length > 0 && !hasAnyChartData && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Geen check-in data in deze periode.
          </div>
        )}

        {!loading && !error && points.length > 0 && (
          <div className="space-y-4">
            {METRIC_OPTIONS.map((metric) => (
              <ExternalMetricChart
                key={metric}
                metric={metric}
                filteredPoints={filteredPoints}
                chartRef={(element) => {
                  chartContainerRefs.current[metric] = element;
                }}
              />
            ))}
          </div>
        )}
      </div>

      {showSendChartButton && (
        <div className="shrink-0 border-t border-gray-200 p-3">
          <button
            type="button"
            onClick={() => void handleSendChartToChat()}
            disabled={!canSendChart || sendingChart}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            <SendHorizontal className="h-4 w-4" />
            {sendingChart ? "Grafieken versturen..." : "Stuur grafieken in chat"}
          </button>
        </div>
      )}
    </aside>
  );
}
