"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/chatBwData";
import {
  buildTonnageChartData,
  buildVolumeWeekOptions,
  filterVolumeRowsByDateRange,
  formatLiftLabel,
  formatTonnage,
  formatVolumeWeekOptionLabel,
  loadAthleteSbdVolumeData,
  resolveVolumeDateRangeFromWeeks,
  sumAllLiftVolume,
  type SbdLift,
  type WeeklyVolumeRow,
} from "@/lib/chatVolumeData";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatVolumePanelProps = {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
};

const SBD_LIFTS: SbdLift[] = ["squat", "bench", "deadlift"];

const LIFT_COLORS: Record<SbdLift, string> = {
  squat: "#111827",
  bench: "#6b7280",
  deadlift: "#9ca3af",
};

export default function ChatVolumePanel({
  athleteId,
  athleteName,
  onClose,
}: ChatVolumePanelProps) {
  const [rows, setRows] = useState<WeeklyVolumeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
        const data = await loadAthleteSbdVolumeData(athleteId);
        if (cancelled) return;
        setRows(data);
        setBeginWeekId("");
        setEndWeekId("");
        setStartDate(data[0]?.date || "");
        setEndDate(data[data.length - 1]?.date || "");
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Volume data kon niet worden geladen.",
        );
        setRows([]);
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

  const weekOptions = useMemo(() => buildVolumeWeekOptions(rows), [rows]);

  const filteredRows = useMemo(
    () => filterVolumeRowsByDateRange(rows, startDate, endDate),
    [rows, startDate, endDate],
  );

  const totals = useMemo(() => sumAllLiftVolume(filteredRows), [filteredRows]);
  const tonnageChartData = useMemo(
    () => buildTonnageChartData(filteredRows),
    [filteredRows],
  );
  const hasTonnageData = tonnageChartData.some(
    (row) => row.squat > 0 || row.bench > 0 || row.deadlift > 0,
  );
  const hasWeekFilter = Boolean(beginWeekId || endWeekId);

  function applyWeekSelection(nextBeginWeekId: string, nextEndWeekId: string) {
    const range = resolveVolumeDateRangeFromWeeks(
      weekOptions,
      nextBeginWeekId,
      nextEndWeekId,
      rows[0]?.date || "",
      rows[rows.length - 1]?.date || "",
    );

    setBeginWeekId(nextBeginWeekId);
    setEndWeekId(nextEndWeekId);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  }

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-black">Volume</h3>
          <p className="truncate text-xs text-gray-500">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="Volume sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-gray-500">
            SBD volume
          </p>
          <h4 className="text-lg font-black text-black">
            {hasWeekFilter ? "Gefilterde periode" : "Alle weken"}
          </h4>
          {startDate && endDate && (
            <p className="mt-1 text-xs text-gray-500">
              {formatShortDate(startDate)} – {formatShortDate(endDate)}
            </p>
          )}
        </div>

        {!loading && !error && rows.length > 0 && (
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
                    {formatVolumeWeekOptionLabel(week)}
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
                    {formatVolumeWeekOptionLabel(week)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            Volume laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Nog geen SBD volume voor deze atleet.
          </div>
        )}

        {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Geen volume in deze periode.
          </div>
        )}

        {!loading && !error && filteredRows.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {SBD_LIFTS.map((lift) => (
                <div
                  key={lift}
                  className="rounded-2xl border border-gray-200 bg-gray-50 p-3 text-center"
                >
                  <p className="text-[10px] font-black uppercase text-gray-400">
                    {formatLiftLabel(lift)}
                  </p>
                  <p className="mt-1 text-2xl font-black text-black">
                    {totals[lift].sets}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-gray-500">
                    sets
                  </p>
                  <p className="mt-2 text-lg font-black text-black">
                    {totals[lift].reps}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-gray-500">
                    reps
                  </p>
                  <p className="mt-2 text-sm font-black text-black">
                    {formatTonnage(totals[lift].tonnage)}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-gray-500">
                    tonnage
                  </p>
                </div>
              ))}
            </div>

            {hasTonnageData && (
              <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 px-1">
                  <p className="text-xs font-black uppercase text-gray-500">
                    Tonnage per week
                  </p>
                  <h5 className="text-sm font-black text-black">
                    Gewicht × reps per lift
                  </h5>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={tonnageChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        minTickGap={16}
                      />
                      <YAxis
                        tick={{ fontSize: 10 }}
                        tickFormatter={(value) => formatTonnage(Number(value))}
                      />
                      <Tooltip
                        formatter={(value, name) => [
                          formatTonnage(Number(value)),
                          formatLiftLabel(name as SbdLift),
                        ]}
                      />
                      <Legend
                        formatter={(value) => formatLiftLabel(value as SbdLift)}
                      />
                      {SBD_LIFTS.map((lift) => (
                        <Bar
                          key={lift}
                          dataKey={lift}
                          name={lift}
                          fill={LIFT_COLORS[lift]}
                          radius={[4, 4, 0, 0]}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-500">
                  <tr>
                    <th className="px-3 py-2">Week</th>
                    <th className="px-3 py-2">Squat</th>
                    <th className="px-3 py-2">Bench</th>
                    <th className="px-3 py-2">Deadlift</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 align-top">
                        <p className="font-bold text-black">{row.weekTitle}</p>
                        <p className="text-[10px] text-gray-500">
                          {row.blockTitle}
                        </p>
                      </td>
                      {SBD_LIFTS.map((lift) => (
                        <td key={lift} className="px-3 py-2 align-top">
                          <p className="font-bold text-black">
                            {row[lift].sets} sets
                          </p>
                          <p className="text-xs text-gray-500">
                            {row[lift].reps} reps
                          </p>
                          {row[lift].tonnage > 0 && (
                            <p className="text-xs text-gray-400">
                              {formatTonnage(row[lift].tonnage)}
                            </p>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
