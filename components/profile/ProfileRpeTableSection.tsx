"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateWeightFromRpe,
  getPercentageForRpeAndReps,
  RPE_ROWS,
} from "@/lib/rpeTable";
import {
  formatCurrentMax,
  getMaxForLift,
  loadAthleteCurrentMaxes,
  parseMaxInput,
  saveAthleteCurrentMaxes,
  SBD_LIFT_LABELS,
  type AthleteCurrentMaxes,
  type SbdLiftKey,
} from "@/lib/athleteCurrentMaxes";

const repColumns = Array.from({ length: 12 }, (_, index) => index + 1);

function formatRpe(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

import {
  getRpeCellColor,
  getRpeCellTextColor,
} from "@/lib/rpeCellColors";

type ProfileRpeTableSectionProps = {
  athleteId: string;
  canEditMaxes?: boolean;
};

export default function ProfileRpeTableSection({
  athleteId,
  canEditMaxes = false,
}: ProfileRpeTableSectionProps) {
  const [maxes, setMaxes] = useState<AthleteCurrentMaxes>({
    current_max_squat: null,
    current_max_bench: null,
    current_max_deadlift: null,
  });
  const [inputs, setInputs] = useState({
    current_max_squat: "",
    current_max_bench: "",
    current_max_deadlift: "",
  });
  const [selectedLift, setSelectedLift] = useState<SbdLiftKey>("squat");
  const [showWeights, setShowWeights] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const autoSaveReady = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const data = await loadAthleteCurrentMaxes(athleteId);
      if (cancelled) return;

      setMaxes(data);
      setInputs({
        current_max_squat:
          data.current_max_squat !== null ? String(data.current_max_squat) : "",
        current_max_bench:
          data.current_max_bench !== null ? String(data.current_max_bench) : "",
        current_max_deadlift:
          data.current_max_deadlift !== null
            ? String(data.current_max_deadlift)
            : "",
      });
      setLoading(false);
      window.setTimeout(() => {
        autoSaveReady.current = true;
      }, 150);
    }

    void load();

    return () => {
      cancelled = true;
      autoSaveReady.current = false;
    };
  }, [athleteId]);

  async function saveMaxes() {
    const nextMaxes = {
      current_max_squat: parseMaxInput(inputs.current_max_squat),
      current_max_bench: parseMaxInput(inputs.current_max_bench),
      current_max_deadlift: parseMaxInput(inputs.current_max_deadlift),
    };

    setSaving(true);
    const { error } = await saveAthleteCurrentMaxes(athleteId, nextMaxes);
    setSaving(false);

    if (error) {
      setMessage("Current maxes opslaan mislukt.");
      return;
    }

    setMaxes(nextMaxes);
    setMessage("Current maxes opgeslagen.");
    window.setTimeout(() => setMessage(""), 2000);
  }

  useEffect(() => {
    if (!canEditMaxes || loading || !autoSaveReady.current) return;

    const timer = window.setTimeout(() => {
      void saveMaxes();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [inputs, canEditMaxes, loading, athleteId]);

  const activeMax = getMaxForLift(maxes, selectedLift);

  const tableRows = useMemo(
    () =>
      RPE_ROWS.map((rpe) => ({
        rpe,
        rir: 10 - rpe,
        cells: repColumns.map((reps) => {
          const percent = getPercentageForRpeAndReps(rpe, reps);
          const weight =
            showWeights && activeMax
              ? calculateWeightFromRpe(activeMax, reps, rpe)
              : null;

          return { reps, percent, weight };
        }),
      })),
    [activeMax, showWeights],
  );

  if (loading) {
    return <p className="text-sm text-app-muted">RPE tabel laden...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-app-text">Current maxes</h2>
        <p className="mt-1 text-[13px] text-app-muted">
          Gebruik deze maxes om gewichten in de RPE-tabel te berekenen.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {(Object.keys(SBD_LIFT_LABELS) as SbdLiftKey[]).map((lift) => {
            const field =
              lift === "squat"
                ? "current_max_squat"
                : lift === "bench"
                  ? "current_max_bench"
                  : "current_max_deadlift";

            return (
              <div key={lift} className="rounded-2xl border border-app-border bg-app-surface-muted p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-app-subtle">
                  {SBD_LIFT_LABELS[lift]}
                </p>
                {canEditMaxes ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    value={inputs[field]}
                    onChange={(event) =>
                      setInputs((current) => ({
                        ...current,
                        [field]: event.target.value,
                      }))
                    }
                    placeholder="kg"
                    className="mt-2 min-h-[44px] w-full rounded-xl border border-app-border bg-app-surface px-3 py-2 text-app-text outline-none placeholder:text-app-subtle focus:border-app-accent"
                  />
                ) : (
                  <p className="mt-1 text-[20px] font-semibold leading-none tracking-tight text-app-text">
                    {formatCurrentMax(getMaxForLift(maxes, lift))}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {canEditMaxes ? (
          <p className="mt-3 text-sm text-app-muted">
            {saving ? "Opslaan..." : message || "Wijzigingen worden automatisch opgeslagen."}
          </p>
        ) : null}
      </div>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold tracking-tight text-app-text">RPE tabel</h2>
            <p className="mt-1 text-[13px] text-app-muted">
              Percentages en berekende gewichten op basis van je current max.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-[12px] font-semibold text-app-muted">Lift</span>
              <select
                value={selectedLift}
                onChange={(event) =>
                  setSelectedLift(event.target.value as SbdLiftKey)
                }
                className="min-h-[44px] rounded-xl border border-app-border bg-app-surface px-3 py-2 text-app-text outline-none focus:border-app-accent"
              >
                {(Object.keys(SBD_LIFT_LABELS) as SbdLiftKey[]).map((lift) => (
                  <option key={lift} value={lift}>
                    {SBD_LIFT_LABELS[lift]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex min-h-[44px] items-center gap-2 self-end text-sm font-semibold text-app-text">
              <input
                type="checkbox"
                checked={showWeights}
                onChange={(event) => setShowWeights(event.target.checked)}
                className="h-4 w-4 rounded border-app-border accent-[var(--app-accent)]"
              />
              Toon gewichten
            </label>
          </div>
        </div>

        {!activeMax && showWeights ? (
          <p className="mt-4 rounded-2xl border border-amber-500/35 bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-400">
            Vul eerst een current max in voor {SBD_LIFT_LABELS[selectedLift]} om
            gewichten te berekenen.
          </p>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-app-border">
          <div className="table-compact-wrap overflow-x-auto">
            <table className="min-w-[720px] w-full border-collapse text-center text-xs">
              <thead>
                <tr className="bg-app-surface-muted">
                  <th className="border border-app-border px-2 py-2 font-semibold text-app-text">RPE</th>
                  <th className="border border-app-border px-2 py-2 font-semibold text-app-text">RIR</th>
                  {repColumns.map((rep) => (
                    <th
                      key={rep}
                      className="border border-app-border px-2 py-2 font-semibold text-app-text"
                    >
                      {rep}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.rpe}>
                    <td className="border border-app-border bg-app-surface px-2 py-2 font-semibold text-app-text">
                      {formatRpe(row.rpe)}
                    </td>
                    <td className="border border-app-border bg-app-surface px-2 py-2 font-semibold text-app-text">
                      {formatRpe(row.rir)}
                    </td>
                    {row.cells.map((cell) => (
                      <td
                        key={`${row.rpe}-${cell.reps}`}
                        className="border border-app-border px-1 py-2"
                        style={{
                          backgroundColor: getRpeCellColor(row.rpe, cell.reps),
                          color: getRpeCellTextColor(row.rpe, cell.reps),
                        }}
                      >
                        <div className="font-semibold">{formatPercent(cell.percent)}</div>
                        {showWeights && cell.weight !== null ? (
                          <div
                            className="mt-0.5 text-[10px] font-bold"
                            style={{ color: getRpeCellTextColor(row.rpe, cell.reps) }}
                          >
                            {cell.weight} kg
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
