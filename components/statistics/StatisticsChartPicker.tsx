"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  STATISTICS_CHART_CATALOG,
  type StatisticsChartCatalogEntry,
  type StatisticsChartId,
} from "@/lib/statisticsChartCatalog";
import {
  createChartInstanceId,
  type StatisticsChartInstance,
} from "@/lib/statisticsChartInstances";

type StatisticsChartPickerProps = {
  instances: StatisticsChartInstance[];
  exerciseNames: string[];
  accessoryExerciseNames: string[];
  onAdd: (instance: StatisticsChartInstance) => void;
  inline?: boolean;
};

const CATEGORY_LABELS: Record<StatisticsChartCatalogEntry["category"], string> = {
  e1rm: "e1RM",
  bw: "Lichaamsgewicht",
  checkin: "Check-in",
  gl: "GL Points",
  volume: "Volume",
  intensity: "Intensiteit",
  progression: "Progressie",
};

function needsExercise(chartId: StatisticsChartId) {
  return (
    chartId === "sets_per_exercise" ||
    chartId === "reps_per_exercise" ||
    chartId === "tonnage_exercise"
  );
}

export default function StatisticsChartPicker({
  instances,
  exerciseNames,
  accessoryExerciseNames,
  onAdd,
  inline = false,
}: StatisticsChartPickerProps) {
  const [open, setOpen] = useState(false);
  const [pendingChartId, setPendingChartId] = useState<StatisticsChartId | "">("");
  const [pendingExercise, setPendingExercise] = useState("");

  const groupedCatalog = useMemo(() => {
    const groups = new Map<
      StatisticsChartCatalogEntry["category"],
      StatisticsChartCatalogEntry[]
    >();

    for (const entry of STATISTICS_CHART_CATALOG) {
      const existing = groups.get(entry.category) || [];
      existing.push(entry);
      groups.set(entry.category, existing);
    }

    return Array.from(groups.entries());
  }, []);

  const exerciseOptionsForPending =
    pendingChartId === "tonnage_exercise"
      ? accessoryExerciseNames
      : exerciseNames;

  function resetPending() {
    setPendingChartId("");
    setPendingExercise("");
  }

  function handleSelectChart(chartId: StatisticsChartId) {
    if (needsExercise(chartId)) {
      setPendingChartId(chartId);
      const options =
        chartId === "tonnage_exercise" ? accessoryExerciseNames : exerciseNames;
      setPendingExercise(options[0] || "");
      return;
    }

    onAdd({
      instanceId: createChartInstanceId(),
      chartId,
    });
    setOpen(false);
    resetPending();
  }

  function confirmExerciseChart() {
    if (!pendingChartId || !pendingExercise) return;

    onAdd({
      instanceId: createChartInstanceId(),
      chartId: pendingChartId,
      exerciseName: pendingExercise,
    });
    setOpen(false);
    resetPending();
  }

  return (
    <div className={inline ? "" : "mb-6 flex justify-end"}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-muted transition hover:border-brand-purple/40 hover:text-app-text"
      >
        <Plus className="h-4 w-4" />
        Grafiek toevoegen
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-app-border bg-app-surface p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-app-text">Grafiek toevoegen</p>
                <p className="text-xs text-app-muted">
                  {instances.length} grafiek{instances.length === 1 ? "" : "en"} actief
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  resetPending();
                }}
                className="rounded-lg border border-app-border px-3 py-1.5 text-xs font-medium text-app-muted transition hover:bg-app-surface-muted"
              >
                Sluiten
              </button>
            </div>

            {pendingChartId ? (
              <div className="space-y-4">
                <p className="text-sm text-app-text">
                  Kies een oefening voor{" "}
                  <span className="font-semibold">
                    {STATISTICS_CHART_CATALOG.find((e) => e.id === pendingChartId)?.label}
                  </span>
                </p>
                <select
                  value={pendingExercise}
                  onChange={(event) => setPendingExercise(event.target.value)}
                  className="w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
                >
                  {exerciseOptionsForPending.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={resetPending}
                    className="app-btn-secondary flex-1"
                  >
                    Terug
                  </button>
                  <button
                    type="button"
                    onClick={confirmExerciseChart}
                    disabled={!pendingExercise}
                    className="app-btn-primary flex-1 disabled:opacity-50"
                  >
                    Toevoegen
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {groupedCatalog.map(([category, entries]) => (
                  <div key={category}>
                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-app-muted">
                      {CATEGORY_LABELS[category]}
                    </p>
                    <div className="space-y-2">
                      {entries.map((entry) => (
                        <button
                          key={entry.id}
                          type="button"
                          onClick={() => handleSelectChart(entry.id)}
                          className="w-full rounded-xl border border-app-border bg-app-surface-muted/40 px-3 py-2.5 text-left transition hover:bg-app-surface-muted"
                        >
                          <p className="text-sm font-medium text-app-text">{entry.label}</p>
                          <p className="mt-0.5 text-xs text-app-muted">{entry.description}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
