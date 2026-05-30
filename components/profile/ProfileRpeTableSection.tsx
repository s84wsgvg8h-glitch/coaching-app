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

function getCellColor(percent: number) {
  const normalized = Math.max(0, Math.min(1, (percent - 40) / 60));
  const lightness = 96 - normalized * 36;
  return `hsl(0, 0%, ${lightness}%)`;
}

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

  useEffect(() => {
    if (!canEditMaxes || loading || !autoSaveReady.current) return;

    const timer = window.setTimeout(() => {
      void saveMaxes();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [inputs, canEditMaxes, loading, athleteId]);

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
        <h2 className="text-xl font-bold text-app-text">Current maxes</h2>
        <p className="mt-1 text-sm text-app-muted">
          Gebruik deze maxes om gewichten in de RPE-tabel te berekenen.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {(Object.keys(SBD_LIFT_LABELS) as SbdLiftKey[]).map((lift) => {
            const field =
              lift === "squat"
                ? "current_max_squat"
                : lift === "bench"
                  ? "current_max_bench"
                  : "current_max_deadlift";

            return (
              <div key={lift} className="rounded-2xl border border-gray-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
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
                    className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  />
                ) : (
                  <p className="mt-2 text-2xl font-bold text-app-text">
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
            <h2 className="text-xl font-bold text-app-text">RPE tabel</h2>
            <p className="mt-1 text-sm text-app-muted">
              Percentages en berekende gewichten op basis van je current max.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-semibold">Lift</span>
              <select
                value={selectedLift}
                onChange={(event) =>
                  setSelectedLift(event.target.value as SbdLiftKey)
                }
                className="rounded-xl border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-black"
              >
                {(Object.keys(SBD_LIFT_LABELS) as SbdLiftKey[]).map((lift) => (
                  <option key={lift} value={lift}>
                    {SBD_LIFT_LABELS[lift]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 self-end pb-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={showWeights}
                onChange={(event) => setShowWeights(event.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              Toon gewichten
            </label>
          </div>
        </div>

        {!activeMax && showWeights ? (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            Vul eerst een current max in voor {SBD_LIFT_LABELS[selectedLift]} om
            gewichten te berekenen.
          </p>
        ) : null}

        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200">
          <div className="overflow-auto">
            <table className="min-w-[720px] w-full border-collapse text-center text-xs">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-2 py-2 font-bold">RPE</th>
                  <th className="border border-gray-200 px-2 py-2 font-bold">RIR</th>
                  {repColumns.map((rep) => (
                    <th
                      key={rep}
                      className="border border-gray-200 px-2 py-2 font-bold"
                    >
                      {rep}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.rpe}>
                    <td className="border border-gray-200 bg-gray-50 px-2 py-2 font-bold">
                      {formatRpe(row.rpe)}
                    </td>
                    <td className="border border-gray-200 bg-gray-50 px-2 py-2 font-bold">
                      {formatRpe(row.rir)}
                    </td>
                    {row.cells.map((cell) => (
                      <td
                        key={`${row.rpe}-${cell.reps}`}
                        className="border border-gray-200 px-1 py-2"
                        style={{ backgroundColor: getCellColor(cell.percent) }}
                      >
                        <div className="font-semibold">{formatPercent(cell.percent)}</div>
                        {showWeights && cell.weight !== null ? (
                          <div className="mt-0.5 text-[10px] font-bold text-black">
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
