"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import { getLogicalBackRoute } from "@/lib/appBackNavigation";
import { useAuth } from "@/components/AuthProvider";
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
    rows: [
      { rpe: "10", rir: "Kon geen reps of load meer doen" },
      { rpe: "9,5", rir: "Kon geen reps meer, wel iets meer load" },
      { rpe: "9", rir: "Kon nog 1 herhaling doen" },
      { rpe: "8,5", rir: "Kon nog 1 herhaling, mogelijk 2" },
    ],
    accent: "bg-app-destructive/10 text-app-destructive",
  },
  {
    zone: "Matig tot hoog",
    rows: [
      { rpe: "8", rir: "Kon nog 2 herhalingen doen" },
      { rpe: "7,5", rir: "Kon nog 2 herhalingen, mogelijk 3" },
      { rpe: "7", rir: "Kon nog 3 herhalingen doen" },
    ],
    accent: "bg-app-accent/10 text-app-accent",
  },
  {
    zone: "Licht tot matig",
    rows: [
      { rpe: "5–6", rir: "Kon nog 4–6 herhalingen doen" },
      { rpe: "1–4", rir: "Zeer licht tot weinig inspanning" },
    ],
    accent: "bg-app-surface text-app-muted",
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role } = useAuth();
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

        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-app-muted">
              RPE tabel
            </p>
            <h1 className="mt-1 text-3xl font-bold text-app-text">
              Load/RIR chart
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-app-muted">
              Gebruik deze tabel om op basis van RPE/RIR en het aantal
              uitgevoerde reps een percentage van de load te kiezen.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              router.push(
                getLogicalBackRoute({ pathname, searchParams, role }),
              )
            }
            className="app-focus-ring inline-flex items-center gap-1.5 rounded-xl border border-app-border bg-app-surface px-4 py-2 text-sm font-semibold text-app-text transition hover:bg-app-surface-hover"
          >
            <ChevronLeft className="h-4 w-4" />
            Terug
          </button>
        </div>

        {/* Main table */}
        <div className="app-card overflow-hidden p-0">
          <div className="overflow-auto">
            <table className="min-w-[1320px] w-full border-collapse text-center text-[10px] text-app-text">
              <thead>
                <tr className="bg-app-surface">
                  <th className="sticky left-0 z-20 border border-app-border bg-app-surface px-2 py-2.5 font-bold text-app-muted">
                    RPE
                  </th>
                  <th className="sticky left-[44px] z-20 border border-app-border bg-app-surface px-2 py-2.5 font-bold text-app-muted">
                    RIR
                  </th>
                  {repColumns.map((rep) => (
                    <th
                      key={rep}
                      className="border border-app-border px-2 py-2.5 font-bold text-app-muted"
                    >
                      {rep}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.rpe}>
                    <td className="sticky left-0 z-10 border border-app-border bg-app-surface px-2 py-2 font-bold text-app-text">
                      {formatRpe(row.rpe)}
                    </td>
                    <td className="sticky left-[44px] z-10 border border-app-border bg-app-surface px-2 py-2 font-bold text-app-text">
                      {formatRpe(row.rir)}
                    </td>
                    {row.percentages.map((percent, index) => {
                      const reps = index + 1;
                      return (
                        <td
                          key={`${row.rpe}-${index}`}
                          className="border border-app-border/40 px-1 py-2 font-semibold"
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

        {/* Calculators row */}
        <div className="grid gap-4 xl:grid-cols-3">

          {/* RPE Calculator */}
          <div className="app-card space-y-4 p-5">
            <div>
              <p className="font-semibold text-app-text">RPE calculator</p>
              <p className="mt-1 text-sm leading-relaxed text-app-muted">
                Gebruikt dezelfde percentages als de tabel hierboven om een
                gewicht voor te stellen op basis van je 1RM, reps en target RPE.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-app-muted">
                  1RM (kg)
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={oneRepMax}
                  onChange={(event) => setOneRepMax(event.target.value)}
                  className="app-focus-ring w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text outline-none transition placeholder:text-app-muted/50 focus:border-app-accent"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-app-muted">
                  Reps
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={targetReps}
                  onChange={(event) => setTargetReps(event.target.value)}
                  className="app-focus-ring w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text outline-none transition placeholder:text-app-muted/50 focus:border-app-accent"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-app-muted">
                  Target RPE
                </span>
                <select
                  value={targetRpe}
                  onChange={(event) => setTargetRpe(event.target.value)}
                  className="app-focus-ring w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text outline-none transition focus:border-app-accent"
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
              <div className="rounded-xl border border-app-accent/20 bg-app-accent/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-app-muted">
                  Resultaat
                </p>
                <p className="mt-2 text-3xl font-bold text-app-text">
                  {rpeCalculation.suggestedWeight ?? "—"} <span className="text-lg font-medium text-app-muted">kg</span>
                </p>
                <p className="mt-1 text-sm text-app-muted">
                  {formatPercent(rpeCalculation.percentage)} van je 1RM
                </p>
              </div>
            )}
          </div>

          {/* Warm-up calculator */}
          <div className="app-card space-y-4 p-5 xl:col-span-2">
            <div>
              <p className="font-semibold text-app-text">Warm-up calculator</p>
              <p className="mt-1 text-sm leading-relaxed text-app-muted">
                Vul het gewicht van je eerste werkset in. De calculator toont
                gewichtsranges per opwarmset.
              </p>
            </div>

            <label className="block max-w-xs">
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-app-muted">
                Eerste werkset (kg)
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={firstSetWeight}
                onChange={(event) => setFirstSetWeight(event.target.value)}
                className="app-focus-ring w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-text outline-none transition focus:border-app-accent"
              />
            </label>

            <div className="overflow-hidden rounded-xl border border-app-border">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-app-border">
                  <tr>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-muted">Set</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-muted">Gewicht</th>
                    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-app-muted">Herhalingen</th>
                  </tr>
                </thead>
                <tbody>
                  {warmupSets.map((set, i) => (
                    <tr key={set.step} className={i > 0 ? "border-t border-app-border" : ""}>
                      <td className="px-4 py-3 align-top">
                        <p className="font-semibold text-app-text">{set.label}</p>
                        {set.weightRange && (
                          <p className="mt-0.5 text-xs text-app-muted">
                            {set.weightRange}
                          </p>
                        )}
                        {set.note && (
                          <p className="mt-0.5 text-xs text-app-muted">
                            {set.note}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-app-text">
                        {set.weightLabel}
                      </td>
                      <td className="px-4 py-3 text-app-muted">{set.reps}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-sm font-semibold text-app-text">
              Start daarna met je werksets.
            </p>
          </div>
        </div>

        {/* Info row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="app-card p-5">
            <p className="font-semibold text-app-text">Load/RIR chart</p>
            <p className="mt-2 text-sm leading-relaxed text-app-muted">
              Kies eerst de RPE/RIR links, daarna het aantal reps bovenaan. De
              cel geeft het percentage load dat bij die combinatie hoort.
            </p>
          </div>

          <div className="app-card overflow-hidden p-0">
            <div className="border-b border-app-border px-4 py-3">
              <p className="text-sm font-semibold text-app-text">
                RPE → Reps In Reserve
              </p>
            </div>
            <div className="divide-y divide-app-border">
              {RPE_RIR_LEGEND.map((section) => (
                <div key={section.zone}>
                  <div className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider ${section.accent}`}>
                    {section.zone}
                  </div>
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {section.rows.map((row) => (
                        <tr
                          key={`${section.zone}-${row.rpe}`}
                          className="border-t border-app-border"
                        >
                          <td className="w-16 px-4 py-2.5 font-bold text-app-text">
                            {row.rpe}
                          </td>
                          <td className="px-4 py-2.5 text-app-muted">{row.rir}</td>
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
    </AppShell>
  );
}
