"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { calculateWarmupSets } from "@/lib/warmupCalculator";
import {
  calculateWeightFromRpe,
  getPercentageForRpeAndReps,
  RPE_ROWS,
} from "@/lib/rpeTable";
import {
  getRpeCellColor,
  getRpeCellTextColor,
} from "@/lib/rpeCellColors";

const repColumns = Array.from({ length: 28 }, (_, index) => index + 1);

function formatRpe(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

const RPE_RIR_LEGEND = [
  {
    zone: "Hoge intensiteit",
    tone: "bg-gray-900 text-white",
    rows: [
      { rpe: "10", rir: "Kon geen reps of load meer doen" },
      { rpe: "9,5", rir: "Kon geen reps meer, wel iets meer load" },
      { rpe: "9", rir: "Kon nog 1 herhaling doen" },
      { rpe: "8,5", rir: "Kon nog 1 herhaling, mogelijk 2" },
    ],
  },
  {
    zone: "Matig tot hoog",
    tone: "bg-gray-700 text-white",
    rows: [
      { rpe: "8", rir: "Kon nog 2 herhalingen doen" },
      { rpe: "7,5", rir: "Kon nog 2 herhalingen, mogelijk 3" },
      { rpe: "7", rir: "Kon nog 3 herhalingen doen" },
    ],
  },
  {
    zone: "Licht tot matig",
    tone: "bg-gray-200 text-black",
    rows: [
      { rpe: "5–6", rir: "Kon nog 4–6 herhalingen doen" },
      { rpe: "1–4", rir: "Zeer licht tot weinig inspanning" },
    ],
  },
] as const;

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function parseNumberInput(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export default function RpeTablePage() {
  const router = useRouter();
  const [firstSetWeight, setFirstSetWeight] = useState("140");
  const [oneRepMax, setOneRepMax] = useState("200");
  const [targetReps, setTargetReps] = useState("5");
  const [targetRpe, setTargetRpe] = useState("8");

  const warmupSets = useMemo(() => {
    const first = parseNumberInput(firstSetWeight);
    return first ? calculateWarmupSets(first) : [];
  }, [firstSetWeight]);

  const rpeCalculation = useMemo(() => {
    const max = parseNumberInput(oneRepMax);
    const reps = parseNumberInput(targetReps);
    const rpe = parseNumberInput(targetRpe);

    if (!max || !reps || rpe === null) {
      return null;
    }

    const percentage = getPercentageForRpeAndReps(rpe, reps);
    const suggestedWeight = calculateWeightFromRpe(max, reps, rpe);

    return {
      percentage,
      suggestedWeight,
    };
  }, [oneRepMax, targetReps, targetRpe]);

  const tableRows = useMemo(
    () =>
      RPE_ROWS.map((rpe) => {
        const rir = 10 - rpe;

        return {
          rpe,
          rir,
          percentages: repColumns.map((reps) =>
            getPercentageForRpeAndReps(rpe, reps),
          ),
        };
      }),
    [],
  );

  return (
    <AppShell contentClassName="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                RPE tabel
              </p>
              <h1 className="mt-1 text-3xl font-bold text-black">
                Load/RIR chart
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-gray-500">
                Gebruik deze tabel om op basis van RPE/RIR en het aantal
                uitgevoerde reps een percentage van de load te kiezen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            >
              Terug
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-gray-200">
            <div className="overflow-auto">
              <table className="min-w-[1320px] w-full border-collapse text-center text-[10px] text-black">
                <thead>
                  <tr className="bg-gray-100 text-black">
                    <th className="sticky left-0 z-20 border border-gray-200 bg-gray-100 px-2 py-2 font-bold">
                      RPE
                    </th>
                    <th className="sticky left-[44px] z-20 border border-gray-200 bg-gray-100 px-2 py-2 font-bold">
                      RIR
                    </th>
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
                      <td className="sticky left-0 z-10 border border-gray-200 bg-gray-50 px-2 py-2 font-bold">
                        {formatRpe(row.rpe)}
                      </td>
                      <td className="sticky left-[44px] z-10 border border-gray-200 bg-gray-50 px-2 py-2 font-bold">
                        {formatRpe(row.rir)}
                      </td>
                      {row.percentages.map((percent, index) => {
                        const reps = index + 1;
                        return (
                        <td
                          key={`${row.rpe}-${index}`}
                          className="border border-gray-200 px-1 py-2 font-semibold dark:border-white/10"
                          style={{
                            backgroundColor: getRpeCellColor(row.rpe, reps),
                            color: getRpeCellTextColor(row.rpe, reps),
                          }}
                        >
                          {formatPercent(percent)}
                        </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-bold text-black">RPE calculator</p>
              <p className="mt-1 leading-6">
                Gebruikt dezelfde percentages als de tabel hierboven om een
                gewicht voor te stellen op basis van je 1RM, reps en target RPE.
              </p>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                    1RM (kg)
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={oneRepMax}
                    onChange={(event) => setOneRepMax(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                    Reps
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={targetReps}
                    onChange={(event) => setTargetReps(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                    Target RPE
                  </span>
                  <select
                    value={targetRpe}
                    onChange={(event) => setTargetRpe(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                  >
                    {RPE_ROWS.map((value) => (
                      <option key={value} value={String(value)}>
                        {formatRpe(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {rpeCalculation && (
                <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    Resultaat
                  </p>
                  <p className="mt-2 text-2xl font-bold text-black">
                    {rpeCalculation.suggestedWeight ?? "—"} kg
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {formatPercent(rpeCalculation.percentage)} van je 1RM
                  </p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 xl:col-span-2">
              <p className="font-bold text-black">Warm-up calculator</p>
              <p className="mt-1 leading-6">
                Vul het gewicht van je eerste werkset in. De calculator toont
                gewichtsranges per opwarmset.
              </p>

              <label className="mt-4 block max-w-xs">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-500">
                  Eerste werkset (kg)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={firstSetWeight}
                  onChange={(event) => setFirstSetWeight(event.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-black"
                />
              </label>

              <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3">Set</th>
                      <th className="px-4 py-3">Gewicht</th>
                      <th className="px-4 py-3">Herhalingen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warmupSets.map((set) => (
                      <tr key={set.step} className="border-t border-gray-200">
                        <td className="px-4 py-3 align-top">
                          <p className="font-bold text-black">{set.label}</p>
                          {set.weightRange && (
                            <p className="mt-1 text-xs text-gray-500">
                              {set.weightRange}
                            </p>
                          )}
                          {set.note && (
                            <p className="mt-1 text-xs text-gray-500">
                              {set.note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-black">
                          {set.weightLabel}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{set.reps}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="mt-4 text-sm font-semibold text-black">
                Start daarna met je werksets.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-bold text-black">Load/RIR chart</p>
              <p className="mt-1">
                Kies eerst de RPE/RIR links, daarna het aantal reps bovenaan. De
                cel geeft het percentage load dat bij die combinatie hoort.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
              <div className="border-b border-gray-200 px-4 py-3">
                <p className="text-sm font-bold text-black">
                  RPE → Reps In Reserve
                </p>
              </div>
              <div className="divide-y divide-gray-200">
                {RPE_RIR_LEGEND.map((section) => (
                  <div key={section.zone}>
                    <div
                      className={`px-4 py-2 text-xs font-bold uppercase tracking-wide ${section.tone}`}
                    >
                      {section.zone}
                    </div>
                    <table className="w-full text-left text-sm text-gray-700">
                      <tbody>
                        {section.rows.map((row) => (
                          <tr
                            key={`${section.zone}-${row.rpe}`}
                            className="border-t border-gray-200"
                          >
                            <td className="w-16 px-4 py-2 font-bold text-black">
                              {row.rpe}
                            </td>
                            <td className="px-4 py-2">{row.rir}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
