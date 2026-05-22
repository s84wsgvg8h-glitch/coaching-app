"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  buildBwWeekOptions,
  filterBwPointsByDateRange,
  formatBwNumber,
  formatShortDate,
  loadAthleteDailyBwData,
  type DailyBwPoint,
} from "@/lib/chatBwData";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatBwPanelProps = {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
};

export default function ChatBwPanel({
  athleteId,
  athleteName,
  onClose,
}: ChatBwPanelProps) {
  const [points, setPoints] = useState<DailyBwPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedWeekId, setSelectedWeekId] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await loadAthleteDailyBwData(athleteId);
        if (cancelled) return;
        setPoints(data);
        setSelectedWeekId("");
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
        setSelectedWeekId("");
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

  function handleWeekChange(weekKey: string) {
    setSelectedWeekId(weekKey);

    if (!weekKey) {
      setStartDate(points[0]?.date || "");
      setEndDate(points[points.length - 1]?.date || "");
      return;
    }

    const week = weekOptions.find((option) => option.id === weekKey);
    if (!week) return;

    setStartDate(week.firstFilledDate);
    setEndDate(week.lastFilledDate);
  }

  function handleStartDateChange(value: string) {
    setSelectedWeekId("");
    setStartDate(value);
    if (endDate && value > endDate) {
      setEndDate(value);
    }
  }

  function handleEndDateChange(value: string) {
    setSelectedWeekId("");
    setEndDate(value);
    if (startDate && value < startDate) {
      setStartDate(value);
    }
  }

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-black">BW</h3>
          <p className="truncate text-xs text-gray-500">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="BW sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase text-gray-500">
              Lichaamsgewicht
            </p>
            <h4 className="text-lg font-black text-black">
              {selectedWeekId ? "Gefilterde periode" : "Alle dagen"}
            </h4>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black text-black">
              {formatBwNumber(lastWeight)}kg
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
                ? `${periodDelta >= 0 ? "+" : ""}${formatBwNumber(periodDelta)}kg in deze tijd`
                : "-"}
            </p>
          </div>
        </div>

        {!loading && !error && points.length > 0 && (
          <div className="mb-4 space-y-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                Week kiezen
              </label>
              <select
                value={selectedWeekId}
                onChange={(event) => handleWeekChange(event.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-black outline-none"
              >
                <option value="">Alle weken</option>
                {weekOptions.map((week) => (
                  <option key={week.id} value={week.id}>
                    {week.blockTitle} · {week.weekTitle}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Begin
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => handleStartDateChange(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                  Eind
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => handleEndDateChange(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            BW laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && points.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Nog geen BW ingevuld voor deze atleet.
          </div>
        )}

        {!loading && !error && points.length > 0 && chartData.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Geen BW-data in deze periode.
          </div>
        )}

        {!loading && !error && chartData.length > 0 && (
          <div className="min-h-[320px] flex-1 rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
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
    </aside>
  );
}
