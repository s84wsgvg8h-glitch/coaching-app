"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatShortDate } from "@/lib/chatBwData";
import {
  buildIntensityWeekOptions,
  buildPeakLoadChartData,
  filterIntensitySnapshotByDateRange,
  formatIntensity,
  formatIntensityWeekOptionLabel,
  formatLiftLabel,
  formatPeakLoad,
  loadAthleteSbdIntensityData,
  resolveIntensityDateRangeFromWeeks,
  type IntensitySnapshot,
  type SbdLift,
} from "@/lib/chatIntensityData";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatIntensityPanelProps = {
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

export default function ChatIntensityPanel({
  athleteId,
  athleteName,
  onClose,
}: ChatIntensityPanelProps) {
  const [snapshot, setSnapshot] = useState<IntensitySnapshot | null>(null);
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
        const data = await loadAthleteSbdIntensityData(athleteId);
        if (cancelled) return;
        setSnapshot(data);
        setBeginWeekId("");
        setEndWeekId("");
        setStartDate(data.peakLoadRows[0]?.date || "");
        setEndDate(data.peakLoadRows[data.peakLoadRows.length - 1]?.date || "");
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Intensiteit data kon niet worden geladen.",
        );
        setSnapshot(null);
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

  const weekOptions = useMemo(
    () => buildIntensityWeekOptions(snapshot?.peakLoadRows || []),
    [snapshot],
  );

  const filteredSnapshot = useMemo(() => {
    if (!snapshot) return null;
    return filterIntensitySnapshotByDateRange(snapshot, startDate, endDate);
  }, [snapshot, startDate, endDate]);

  const peakLoadChartData = useMemo(
    () => buildPeakLoadChartData(filteredSnapshot?.peakLoadRows || []),
    [filteredSnapshot],
  );

  const hasPeakLoadData = peakLoadChartData.some(
    (row) => row.squat !== null || row.bench !== null || row.deadlift !== null,
  );
  const hasAnyData = Boolean(
    snapshot &&
      (snapshot.setRecords.length > 0 || snapshot.peakLoadRows.length > 0),
  );
  const hasWeekFilter = Boolean(beginWeekId || endWeekId);

  function applyWeekSelection(nextBeginWeekId: string, nextEndWeekId: string) {
    const range = resolveIntensityDateRangeFromWeeks(
      weekOptions,
      nextBeginWeekId,
      nextEndWeekId,
      snapshot?.peakLoadRows[0]?.date || "",
      snapshot?.peakLoadRows[snapshot.peakLoadRows.length - 1]?.date || "",
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
          <h3 className="truncate text-base font-bold text-black">Intensiteit</h3>
          <p className="truncate text-xs text-gray-500">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="Intensiteit sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-gray-500">
            SBD intensiteit
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

        {!loading && !error && hasAnyData && (
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
                    {formatIntensityWeekOptionLabel(week)}
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
                    {formatIntensityWeekOptionLabel(week)}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            Intensiteit laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && !hasAnyData && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Nog geen SBD intensiteit voor deze atleet.
          </div>
        )}

        {!loading && !error && filteredSnapshot && (
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
                  <p className="mt-1 text-[10px] font-bold uppercase text-gray-500">
                    Gem. intensiteit
                  </p>
                  <p className="text-xl font-black text-black">
                    {formatIntensity(filteredSnapshot.stats[lift].averageIntensity)}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase text-gray-500">
                    Piek intensiteit
                  </p>
                  <p className="text-lg font-black text-black">
                    {formatIntensity(filteredSnapshot.stats[lift].peakIntensity)}
                  </p>
                  <p className="mt-2 text-[10px] font-bold uppercase text-gray-500">
                    Piek load
                  </p>
                  <p className="text-sm font-black text-black">
                    {formatPeakLoad(filteredSnapshot.stats[lift].peakLoad)}
                  </p>
                </div>
              ))}
            </div>

            {hasPeakLoadData && (
              <div className="rounded-3xl border border-gray-200 bg-white p-3 shadow-sm">
                <div className="mb-3 px-1">
                  <p className="text-xs font-black uppercase text-gray-500">
                    Piek load per week
                  </p>
                  <h5 className="text-sm font-black text-black">
                    Hoogste gewicht per lift
                  </h5>
                </div>
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={peakLoadChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10 }}
                        minTickGap={16}
                      />
                      <YAxis tick={{ fontSize: 10 }} unit=" kg" />
                      <Tooltip
                        formatter={(value, name) => [
                          value !== null && value !== undefined
                            ? `${value} kg`
                            : "-",
                          formatLiftLabel(name as SbdLift),
                        ]}
                      />
                      <Legend
                        formatter={(value) => formatLiftLabel(value as SbdLift)}
                      />
                      {SBD_LIFTS.map((lift) => (
                        <Line
                          key={lift}
                          type="linear"
                          dataKey={lift}
                          name={lift}
                          stroke={LIFT_COLORS[lift]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
