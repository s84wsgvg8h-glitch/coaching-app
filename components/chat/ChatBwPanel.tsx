"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SendHorizontal } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { X } from "lucide-react";
import ChatWeekRangeFilters from "@/components/chat/ChatWeekRangeFilters";
import {
  buildBwWeekOptions,
  filterBwPointsByDateRange,
  formatBwNumber,
  formatBwWeekOptionLabel,
  formatShortDate,
  loadAthleteDailyBwData,
  resolveBwDateRangeFromWeeks,
  type DailyBwPoint,
} from "@/lib/chatBwData";
import { captureElementAsPngFile } from "@/lib/captureChartAsPng";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatBwPanelProps = {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
  onSendChartToChat?: (file: File, caption: string) => void;
  canSendChart?: boolean;
};

export default function ChatBwPanel({
  athleteId,
  athleteName,
  onClose,
  onSendChartToChat,
  canSendChart = true,
}: ChatBwPanelProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const [points, setPoints] = useState<DailyBwPoint[]>([]);
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
        const data = await loadAthleteDailyBwData(athleteId);
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
            : "BW-data kon niet worden geladen.",
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

  const weekOptions = useMemo(() => buildBwWeekOptions(points), [points]);

  const filteredPoints = useMemo(
    () => filterBwPointsByDateRange(points, startDate, endDate),
    [points, startDate, endDate],
  );

  const chartData = useMemo(
    () =>
      filteredPoints.map((point) => ({
        date: point.date,
        value: point.value,
        label: point.label,
      })),
    [filteredPoints],
  );

  const firstWeight =
    filteredPoints.length > 0 ? filteredPoints[0].value : null;
  const lastWeight =
    filteredPoints.length > 0
      ? filteredPoints[filteredPoints.length - 1].value
      : null;
  const periodDelta =
    firstWeight !== null && lastWeight !== null
      ? Math.round((lastWeight - firstWeight) * 10) / 10
      : null;

  const values = filteredPoints.map((point) => point.value);
  const minWeight =
    values.length > 0 ? Math.floor(Math.min(...values) - 3) : 0;
  const maxWeight =
    values.length > 0 ? Math.ceil(Math.max(...values) + 3) : 100;

  const hasWeekFilter = Boolean(beginWeekId || endWeekId);

  function applyWeekSelection(nextBeginWeekId: string, nextEndWeekId: string) {
    const range = resolveBwDateRangeFromWeeks(
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

  async function handleSendChartToChat() {
    if (!onSendChartToChat || !chartContainerRef.current || sendingChart) return;

    setSendingChart(true);

    try {
      const file = await captureElementAsPngFile(
        chartContainerRef.current,
        `bw-grafiek-${athleteId}.png`,
      );
      const periodLabel =
        startDate && endDate
          ? ` (${formatShortDate(startDate)} – ${formatShortDate(endDate)})`
          : "";
      const caption = `BW grafiek ${athleteName}${periodLabel}`;

      onSendChartToChat(file, caption);
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
    Boolean(onSendChartToChat) &&
    !loading &&
    !error &&
    chartData.length > 0;

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate chat-panel-title truncate">BW</h3>
          <p className="truncate chat-panel-subtitle truncate">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-app-muted hover:bg-app-surface-hover hover:text-app-text"
          aria-label="BW sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-app-muted">
              Lichaamsgewicht
            </p>
            <h4 className="text-lg font-black text-app-text">
              {hasWeekFilter ? "Gefilterde periode" : "Alle dagen"}
            </h4>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black text-app-text">
              {formatBwNumber(lastWeight)}kg
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
                ? `${periodDelta >= 0 ? "+" : ""}${formatBwNumber(periodDelta)}kg in deze tijd`
                : "-"}
            </p>
          </div>
        </div>

        {!loading && !error && points.length > 0 && (
          <ChatWeekRangeFilters
            className="mb-4"
            weekOptions={weekOptions}
            formatWeekLabel={formatBwWeekOptionLabel}
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
            BW laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-destructive">
            {error}
          </div>
        )}

        {!loading && !error && points.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-muted">
            Nog geen BW ingevuld voor deze atleet.
          </div>
        )}

        {!loading && !error && points.length > 0 && chartData.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-muted">
            Geen BW-data in deze periode.
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <div
            ref={chartContainerRef}
            className="min-h-[320px] flex-1 rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm"
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatShortDate(value)}
                  tick={{ fontSize: 10 }}
                  minTickGap={24}
                />
                <YAxis domain={[minWeight, maxWeight]} />
                <Tooltip
                  labelFormatter={(value) => formatShortDate(String(value))}
                  formatter={(value) => [
                    `${formatBwNumber(Number(value))} kg`,
                    "BW",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="none"
                  fill="#dbeafe"
                  fillOpacity={0.55}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="value"
                  name="BW"
                  stroke="#111827"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {showSendChartButton && (
        <div className="shrink-0 border-t border-app-border p-3">
          <button
            type="button"
            onClick={() => void handleSendChartToChat()}
            disabled={!canSendChart || sendingChart}
            className="app-btn-primary flex w-full items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SendHorizontal className="h-4 w-4" />
            {sendingChart ? "Grafiek versturen..." : "Stuur grafiek in chat"}
          </button>
        </div>
      )}
    </aside>
  );
}
