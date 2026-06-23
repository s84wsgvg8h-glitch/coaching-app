"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChatWeekRangeFilters from "@/components/chat/ChatWeekRangeFilters";
import { formatShortDate } from "@/lib/chatBwData";
import {
  buildTonnageChartDataForLift,
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

  const allStartDate = rows[0]?.date || "";
  const allEndDate = rows[rows.length - 1]?.date || "";

  const filteredRows = useMemo(
    () => filterVolumeRowsByDateRange(rows, startDate, endDate),
    [rows, startDate, endDate],
  );

  const totals = useMemo(() => sumAllLiftVolume(filteredRows), [filteredRows]);
  const hasWeekFilter = Boolean(beginWeekId || endWeekId);

  function applyWeekSelection(nextBeginWeekId: string, nextEndWeekId: string) {
    const range = resolveVolumeDateRangeFromWeeks(
      weekOptions,
      nextBeginWeekId,
      nextEndWeekId,
      allStartDate,
      allEndDate,
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

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate chat-panel-title truncate">Volume</h3>
          <p className="truncate chat-panel-subtitle truncate">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-app-muted hover:bg-app-surface-hover hover:text-app-text"
          aria-label="Volume sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-app-muted">
            SBD volume
          </p>
          <h4 className="text-lg font-black text-app-text">
            {hasWeekFilter ? "Gefilterde periode" : "Alle weken"}
          </h4>
          {startDate && endDate && (
            <p className="mt-1 chat-panel-subtitle truncate">
              {formatShortDate(startDate)} – {formatShortDate(endDate)}
            </p>
          )}
        </div>

        {!loading && !error && rows.length > 0 && (
          <ChatWeekRangeFilters
            className="mb-4"
            weekOptions={weekOptions}
            formatWeekLabel={formatVolumeWeekOptionLabel}
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
            Volume laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-destructive">
            {error}
          </div>
        )}

        {!loading && !error && rows.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-muted">
            Nog geen SBD volume voor deze atleet.
          </div>
        )}

        {!loading && !error && rows.length > 0 && filteredRows.length === 0 && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-muted">
            Geen volume in deze periode.
          </div>
        )}

        {!loading && !error && filteredRows.length > 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {SBD_LIFTS.map((lift) => (
                <div
                  key={lift}
                  className="chat-card-elevated-muted p-3 text-center"
                >
                  <p className="text-[10px] font-black uppercase text-app-subtle">
                    {formatLiftLabel(lift)}
                  </p>
                  <p className="mt-1 text-2xl font-black text-app-text">
                    {totals[lift].sets}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-app-muted">
                    sets
                  </p>
                  <p className="mt-2 text-lg font-black text-app-text">
                    {totals[lift].reps}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-app-muted">
                    reps
                  </p>
                  <p className="mt-2 text-sm font-black text-app-text">
                    {formatTonnage(totals[lift].tonnage)}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-app-muted">
                    tonnage
                  </p>
                </div>
              ))}
            </div>

            {SBD_LIFTS.map((lift) => {
              const chartData = buildTonnageChartDataForLift(filteredRows, lift);
              const hasData = chartData.some((row) => row.value > 0);

              if (!hasData) return null;

              return (
                <div
                  key={lift}
                  className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm"
                >
                  <div className="mb-3 px-1">
                    <p className="text-xs font-black uppercase text-app-muted">
                      Tonnage per week
                    </p>
                    <h5 className="text-sm font-black text-app-text">
                      {formatLiftLabel(lift)}
                    </h5>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
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
                          formatter={(value) => [
                            formatTonnage(Number(value)),
                            "Tonnage",
                          ]}
                        />
                        <Bar
                          dataKey="value"
                          fill={LIFT_COLORS[lift]}
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}

            <div className="overflow-hidden rounded-2xl border border-app-border">
              <table className="w-full text-left text-sm">
                <thead className="bg-app-surface-muted text-[10px] font-black uppercase text-app-muted">
                  <tr>
                    <th className="px-3 py-2">Week</th>
                    <th className="px-3 py-2">Squat</th>
                    <th className="px-3 py-2">Bench</th>
                    <th className="px-3 py-2">Deadlift</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-app-border">
                      <td className="px-3 py-2 align-top">
                        <p className="font-bold text-app-text">{row.weekTitle}</p>
                        <p className="text-[10px] text-app-muted">
                          {row.blockTitle}
                        </p>
                      </td>
                      {SBD_LIFTS.map((lift) => (
                        <td key={lift} className="px-3 py-2 align-top">
                          <p className="font-bold text-app-text">
                            {row[lift].sets} sets
                          </p>
                          <p className="chat-panel-subtitle truncate">
                            {row[lift].reps} reps
                          </p>
                          {row[lift].tonnage > 0 && (
                            <p className="text-xs text-app-subtle">
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
