"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import ChatWeekRangeFilters from "@/components/chat/ChatWeekRangeFilters";
import { formatShortDate } from "@/lib/chatBwData";
import {
  buildIntensityWeekOptions,
  buildPeakLoadChartDataForLift,
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

type StatKey = "averageIntensity" | "peakIntensity" | "peakLoad";

const STAT_TOGGLES: { key: StatKey; label: string }[] = [
  { key: "averageIntensity", label: "Gem. intensiteit" },
  { key: "peakIntensity", label: "Piek intensiteit" },
  { key: "peakLoad", label: "Piek load" },
];

function formatStatValue(key: StatKey, value: number | null) {
  if (key === "peakLoad") return formatPeakLoad(value);
  return formatIntensity(value);
}

function ToggleChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-app-accent text-white"
          : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-muted"
      }`}
    >
      {label}
    </button>
  );
}

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
  const [visibleStats, setVisibleStats] = useState<Set<StatKey>>(
    () => new Set(["averageIntensity", "peakIntensity", "peakLoad"]),
  );
  const [visibleLifts, setVisibleLifts] = useState<Set<SbdLift>>(
    () => new Set(SBD_LIFTS),
  );

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

  const allStartDate = snapshot?.peakLoadRows[0]?.date || "";
  const allEndDate =
    snapshot?.peakLoadRows[snapshot.peakLoadRows.length - 1]?.date || "";

  const filteredSnapshot = useMemo(() => {
    if (!snapshot) return null;
    return filterIntensitySnapshotByDateRange(snapshot, startDate, endDate);
  }, [snapshot, startDate, endDate]);

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

  function toggleStat(key: StatKey) {
    setVisibleStats((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function toggleLift(lift: SbdLift) {
    setVisibleLifts((current) => {
      const next = new Set(current);
      if (next.has(lift)) {
        if (next.size > 1) next.delete(lift);
      } else {
        next.add(lift);
      }
      return next;
    });
  }

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-app-text">Intensiteit</h3>
          <p className="truncate text-xs text-app-muted">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-app-muted hover:bg-app-surface-hover hover:text-app-text"
          aria-label="Intensiteit sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-app-muted">
            SBD intensiteit
          </p>
          <h4 className="text-lg font-black text-app-text">
            {hasWeekFilter ? "Gefilterde periode" : "Alle weken"}
          </h4>
          {startDate && endDate && (
            <p className="mt-1 text-xs text-app-muted">
              {formatShortDate(startDate)} – {formatShortDate(endDate)}
            </p>
          )}
        </div>

        {!loading && !error && hasAnyData && (
          <ChatWeekRangeFilters
            className="mb-4"
            weekOptions={weekOptions}
            formatWeekLabel={formatIntensityWeekOptionLabel}
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
            Intensiteit laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-destructive">
            {error}
          </div>
        )}

        {!loading && !error && !hasAnyData && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-app-muted">
            Nog geen SBD intensiteit voor deze atleet.
          </div>
        )}

        {!loading && !error && filteredSnapshot && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-app-subtle">
                Statistieken
              </p>
              <div className="flex flex-wrap gap-2">
                {STAT_TOGGLES.map(({ key, label }) => (
                  <ToggleChip
                    key={key}
                    active={visibleStats.has(key)}
                    label={label}
                    onClick={() => toggleStat(key)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-app-subtle">
                Grafieken per lift
              </p>
              <div className="flex flex-wrap gap-2">
                {SBD_LIFTS.map((lift) => (
                  <ToggleChip
                    key={lift}
                    active={visibleLifts.has(lift)}
                    label={formatLiftLabel(lift)}
                    onClick={() => toggleLift(lift)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {SBD_LIFTS.filter((lift) => visibleLifts.has(lift)).map((lift) => (
                <div
                  key={lift}
                  className="rounded-2xl border border-app-border bg-app-surface-muted p-3 text-center"
                >
                  <p className="text-[10px] font-black uppercase text-app-subtle">
                    {formatLiftLabel(lift)}
                  </p>
                  {STAT_TOGGLES.filter(({ key }) => visibleStats.has(key)).map(
                    ({ key, label }) => (
                      <div key={key} className="mt-2">
                        <p className="text-[10px] font-bold uppercase text-app-muted">
                          {label}
                        </p>
                        <p
                          className={`font-black text-app-text ${
                            key === "peakLoad" ? "text-sm" : "text-lg"
                          }`}
                        >
                          {formatStatValue(
                            key,
                            filteredSnapshot.stats[lift][key],
                          )}
                        </p>
                      </div>
                    ),
                  )}
                </div>
              ))}
            </div>

            {SBD_LIFTS.filter((lift) => visibleLifts.has(lift)).map((lift) => {
              const chartData = buildPeakLoadChartDataForLift(
                filteredSnapshot.peakLoadRows,
                lift,
              );
              const hasData = chartData.some((row) => row.value !== null);

              if (!hasData) return null;

              return (
                <div
                  key={lift}
                  className="rounded-3xl border border-app-border bg-app-surface p-3 shadow-sm"
                >
                  <div className="mb-3 px-1">
                    <p className="text-xs font-black uppercase text-app-muted">
                      Piek load
                    </p>
                    <h5 className="text-sm font-black text-app-text">
                      {formatLiftLabel(lift)} per week
                    </h5>
                  </div>
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="label"
                          tick={{ fontSize: 10 }}
                          minTickGap={16}
                        />
                        <YAxis tick={{ fontSize: 10 }} unit=" kg" />
                        <Tooltip
                          formatter={(value) => [
                            value !== null && value !== undefined
                              ? `${value} kg`
                              : "-",
                            "Piek load",
                          ]}
                        />
                        <Line
                          type="linear"
                          dataKey="value"
                          name={formatLiftLabel(lift)}
                          stroke={LIFT_COLORS[lift]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          connectNulls
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
