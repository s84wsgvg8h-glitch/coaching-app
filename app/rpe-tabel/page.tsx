// app/rpe-table/page.tsx

"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

const rpeRows = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0];
const repColumns = Array.from({ length: 28 }, (_, index) => index + 1);

function formatRpe(value: number) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function getPercentage(repsPerformed: number, rir: number) {
  const averageRepCapacity = repsPerformed + rir;
  const percentage = 100 * Math.pow(0.9755, averageRepCapacity - 1);
  return Math.max(0, Math.min(100, percentage));
}

function getCellColor(percent: number) {
  const normalized = Math.max(0, Math.min(1, (percent - 40) / 60));
  const hue = Math.round(120 * (1 - normalized));
  return `hsl(${hue}, 80%, 63%)`;
}

export default function RpeTablePage() {
  const router = useRouter();

  const tableRows = useMemo(
    () =>
      rpeRows.map((rpe) => {
        const rir = 10 - rpe;

        return {
          rpe,
          rir,
          percentages: repColumns.map((reps) => getPercentage(reps, rir)),
        };
      }),
    [],
  );

  return (
    <main className="min-h-screen bg-[#0f3f30] text-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-green-100">
              Average Rep Capacity
            </p>
            <h1 className="mt-1 text-3xl font-black">
              Modernized Load/RIR Chart
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-green-100">
              Gebruik deze tabel om op basis van RPE/RIR en het aantal uitgevoerde reps een percentage van de load te kiezen.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-black hover:bg-green-50"
          >
            Terug
          </button>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/20 bg-[#104b38] shadow-2xl">
          <div className="overflow-auto">
            <table className="min-w-[1320px] w-full border-collapse text-center text-[10px] text-black">
              <thead>
                <tr className="bg-[#0c3428] text-white">
                  <th className="sticky left-0 z-20 border border-white/10 bg-[#0c3428] px-2 py-2 font-black">
                    RPE
                  </th>
                  <th className="sticky left-[44px] z-20 border border-white/10 bg-[#0c3428] px-2 py-2 font-black">
                    RIR
                  </th>
                  {repColumns.map((rep) => (
                    <th
                      key={rep}
                      className="border border-white/10 px-2 py-2 font-black"
                    >
                      {rep}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {tableRows.map((row) => (
                  <tr key={row.rpe}>
                    <td className="sticky left-0 z-10 border border-[#0f3f30]/20 bg-[#0c3428] px-2 py-2 font-black text-white">
                      {formatRpe(row.rpe)}
                    </td>
                    <td className="sticky left-[44px] z-10 border border-[#0f3f30]/20 bg-[#0c3428] px-2 py-2 font-black text-white">
                      {formatRpe(row.rir)}
                    </td>
                    {row.percentages.map((percent, index) => (
                      <td
                        key={`${row.rpe}-${index}`}
                        className="border border-[#0f3f30]/20 px-1 py-2 font-semibold"
                        style={{ backgroundColor: getCellColor(percent) }}
                      >
                        {formatPercent(percent)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-green-50">
          <p className="font-bold">Uitleg</p>
          <p className="mt-1">
            Kies eerst de RPE/RIR links, daarna het aantal reps bovenaan. De cel geeft het percentage load dat bij die combinatie hoort.
          </p>
        </div>
      </div>
    </main>
  );
}
