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
import ChatWeekRangeFilters from "@/components/chat/ChatWeekRangeFilters";
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
  canSendChart?: boolean;
  sendingChart?: boolean;
  onSendChart?: () => void;
};

function ExternalMetricChart({
  metric,
  filteredPoints,
  chartRef,
  canSendChart = false,
  sendingChart = false,
  onSendChart,
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
      <div className="rounded-3xl border border-app-border bg-app-surface p-4 shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h5 className="text-sm font-black text-app-text">
            {formatExternalMetricLabel(metric)}
          </h5>
        </div>
        <p className="py-8 text-center text-sm text-app-muted">
          Geen {formatExternalMetricLabel(metric).toLowerCase()} data in deze periode.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-4 px-1">
        <h5 className="text-sm font-black text-app-text">
          {formatExternalMetricLabel(metric)}
        </h5>
        <div className="text-right">
          <p className="text-2xl font-black text-app-text">
            {formatExternalNumber(lastValue)}
          </p>
          <p
            className={`text-xs font-black ${
              periodDelta !== null
                ? periodDelta >= 0
                  ? "text-green-600"
                  : "text-app-destructive"
                : "text-app-subtle"
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

      {onSendChart && (
        <button
          type="button"
          onClick={onSendChart}
          disabled={!canSendChart || sendingChart}
            className="app-btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SendHorizontal className="h-4 w-4" />
          {sendingChart ? "Versturen..." : "Stuur in chat"}
        </button>
      )}
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
  const [sendingMetric, setSendingMetric] = useState<ExternalMetric | null>(null);
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

  function applyDateSelection(nextStartDate: string, nextEndDate: string) {
    setBeginWeekId("");
    setEndWeekId("");
    setStartDate(nextStartDate);
    setEndDate(nextEndDate);
  }

  const allStartDate = points[0]?.date || "";
  const allEndDate = points[points.length - 1]?.date || "";

  async function handleSendMetricToChat(metric: ExternalMetric) {
    if (!onSendChartToChat || sendingMetric) return;

    const container = chartContainerRefs.current[metric];
    if (!container) return;

    setSendingMetric(metric);

    const periodLabel =
      startDate && endDate
        ? ` (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`
        : "";

    try {
      const file = await captureElementAsPngFile(
        container,
        `externals-${metric}-${athleteId}.png`,
      );
      const caption = `${formatExternalMetricLabel(metric)} grafiek ${athleteName}${periodLabel}`;

      onSendChartToChat(file, caption);
    } catch (sendError) {
      alert(
        sendError instanceof Error
          ? sendError.message
          : "Grafiek kon niet worden verstuurd.",
      );
    } finally {
      setSendingMetric(null);
    }
  }

  const canSendCharts =
    Boolean(onSendChartToChat) && !loading && !error && hasAnyChartData;

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate chat-panel-title truncate">Externals</h3>
          <p className="truncate chat-panel-subtitle truncate">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-app-muted hover:bg-app-surface-hover hover:text-app-text"
          aria-label="Externals sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-app-muted">
            Program check-in
          </p>
          <h4 className="text-lg font-black text-app-text">
            {hasWeekFilter ? "Gefilterde periode" : "Alle dagen"}
          </h4>
        </div>

        {!loading && !error && points.length > 0 && (
          <ChatWeekRangeFilters
            className="mb-4"
            weekOptions={weekOptions}
            formatWeekLabel={formatExternalWeekOptionLabel}
            beginWeekId={beginWeekId}
            endWeekId={endWeekId}
            startDate={startDate}
            endDate={endDate}
            minDate={allStartDate}
            maxDate={allEndDate}
            onWeekChange={applyWeekSelection}
            onDateChange={applyDateSelection}
          />
        )}

        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-app-muted">
            Check-in laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-destructive">
            {error}
          </div>
        )}

        {!loading && !error && points.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-muted">
            Nog geen check-in data voor deze atleet.
          </div>
        )}

        {!loading && !error && points.length > 0 && !hasAnyChartData && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-muted">
            Geen check-in data in deze periode.
          </div>
        )}

        {!loading && !error && points.length > 0 && (
          <div className="space-y-4">
            {METRIC_OPTIONS.map((metric) => {
              const hasData = filteredPoints.some(
                (point) => getExternalMetricValue(point, metric) !== null,
              );

              return (
                <ExternalMetricChart
                  key={metric}
                  metric={metric}
                  filteredPoints={filteredPoints}
                  chartRef={(element) => {
                    chartContainerRefs.current[metric] = element;
                  }}
                  canSendChart={canSendChart && hasData}
                  sendingChart={sendingMetric === metric}
                  onSendChart={
                    canSendCharts && hasData
                      ? () => void handleSendMetricToChat(metric)
                      : undefined
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
