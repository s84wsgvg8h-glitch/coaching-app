"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import { getCurrentDivision, sortDivisions } from "@/lib/ipfDivision";
import {
  aggregateLeaderboardMeets,
  getMetricValue,
  type LeaderboardFilters,
  type LeaderboardSortMetric,
  type OpenIpfLifterData,
} from "@/lib/openipf";

type LimitlessAthlete = {
  id: string;
  full_name: string;
  birth_date: string;
};

type AthleteEntry = {
  athlete_id: string;
  full_name: string;
  birth_date: string;
  current_division: string;
  lifter: OpenIpfLifterData | null;
};

type DisplayRow = {
  athlete_id: string;
  full_name: string;
  openipf_found: boolean;
  gl_points: number;
  total_kg: number;
  squat_kg: number;
  bench_kg: number;
  deadlift_kg: number;
  bodyweight_kg: string;
  weight_class_kg: string;
  sort_value: number;
};

const sortOptions: Array<{ value: LeaderboardSortMetric; label: string }> = [
  { value: "goodlift", label: "GL Points" },
  { value: "total", label: "Totaal" },
  { value: "squat", label: "Squat" },
  { value: "bench", label: "Bench" },
  { value: "deadlift", label: "Deadlift" },
];

const metricColumns: Array<{
  key: LeaderboardSortMetric | "bodyweight";
  label: string;
}> = [
  { key: "goodlift", label: "GL Points" },
  { key: "total", label: "Totaal" },
  { key: "squat", label: "Squat" },
  { key: "bench", label: "Bench" },
  { key: "deadlift", label: "Deadlift" },
  { key: "bodyweight", label: "BW" },
];

const tableGridClass =
  "grid grid-cols-[64px_minmax(180px,1.4fr)_repeat(6,minmax(84px,1fr))] items-center gap-x-4";

function sortWeightClasses(values: string[]) {
  return [...values].sort((a, b) => {
    const aPlus = a.endsWith("+");
    const bPlus = b.endsWith("+");

    if (aPlus && !bPlus) return 1;
    if (!aPlus && bPlus) return -1;

    return parseNumber(a) - parseNumber(b);
  });
}

function parseNumber(value: string | number) {
  const parsed = Number(String(value).replace("+", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatKg(value: number) {
  return value > 0 ? `${value} kg` : "-";
}

function formatMetricValue(
  key: LeaderboardSortMetric | "bodyweight",
  row: DisplayRow,
) {
  switch (key) {
    case "goodlift":
      return row.gl_points > 0 ? row.gl_points.toFixed(2) : "-";
    case "total":
      return formatKg(row.total_kg);
    case "squat":
      return formatKg(row.squat_kg);
    case "bench":
      return formatKg(row.bench_kg);
    case "deadlift":
      return formatKg(row.deadlift_kg);
    case "bodyweight":
      return row.bodyweight_kg ? `${row.bodyweight_kg} kg` : "-";
    default:
      return "-";
  }
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<AthleteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState("");
  const [sortMetric, setSortMetric] = useState<LeaderboardSortMetric>("goodlift");
  const [filters, setFilters] = useState<LeaderboardFilters>({
    sex: "all",
    division: "all",
    weightClassKg: "all",
  });

  useEffect(() => {
    loadLeaderboard();
  }, []);

  async function loadLeaderboard() {
    setLoading(true);
    setProgress("Atleten laden...");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: athletes, error } = await supabase
      .from("limitless_athletes")
      .select("id, full_name, birth_date")
      .order("full_name", { ascending: true });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    const athleteList = athletes || [];

    if (athleteList.length === 0) {
      setEntries([]);
      setLoading(false);
      setProgress("");
      return;
    }

    setProgress(`OpenIPF data ophalen voor ${athleteList.length} atleten...`);

    const response = await fetch("/api/openipf-leaderboard", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        names: athleteList.map((athlete) => athlete.full_name),
      }),
    });

    if (!response.ok) {
      alert("Kon OpenIPF data niet laden");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as {
      results: Record<string, OpenIpfLifterData | null>;
    };

    setEntries(
      athleteList.map((athlete: LimitlessAthlete) => ({
        athlete_id: athlete.id,
        full_name: athlete.full_name,
        birth_date: athlete.birth_date,
        current_division: getCurrentDivision(athlete.birth_date),
        lifter: data.results[athlete.full_name] || null,
      })),
    );

    setLoading(false);
    setProgress("");
  }

  const filterOptions = useMemo(() => {
    const divisions = new Set<string>();
    const weightClasses = new Set<string>();

    entries.forEach((entry) => {
      if (entry.current_division) {
        divisions.add(entry.current_division);
      }

      entry.lifter?.meets.forEach((meet) => {
        if (meet.event !== "SBD") {
          return;
        }

        if (filters.sex !== "all" && meet.sex !== filters.sex) {
          return;
        }

        if (entry.current_division && filters.division !== "all") {
          if (entry.current_division !== filters.division) {
            return;
          }
        }

        if (meet.weightClassKg) {
          weightClasses.add(meet.weightClassKg);
        }
      });
    });

    return {
      divisions: sortDivisions([...divisions]),
      weightClasses: sortWeightClasses([...weightClasses]),
    };
  }, [entries, filters.sex, filters.division]);

  const displayRows = useMemo(() => {
    const rankedRows: DisplayRow[] = [];
    const missingRows: DisplayRow[] = [];
    const meetFilters = {
      sex: filters.sex,
      weightClassKg: filters.weightClassKg,
    };

    entries.forEach((entry) => {
      if (
        filters.division !== "all" &&
        entry.current_division !== filters.division
      ) {
        return;
      }

      if (!entry.lifter) {
        if (
          filters.sex === "all" &&
          filters.division === "all" &&
          filters.weightClassKg === "all"
        ) {
          missingRows.push({
            athlete_id: entry.athlete_id,
            full_name: entry.full_name,
            openipf_found: false,
            gl_points: 0,
            total_kg: 0,
            squat_kg: 0,
            bench_kg: 0,
            deadlift_kg: 0,
            bodyweight_kg: "",
            weight_class_kg: "",
            sort_value: 0,
          });
        }
        return;
      }

      const aggregate = aggregateLeaderboardMeets(
        entry.lifter.meets,
        meetFilters,
      );

      if (!aggregate) {
        return;
      }

      rankedRows.push({
        athlete_id: entry.athlete_id,
        full_name: entry.full_name,
        openipf_found: true,
        gl_points: aggregate.goodlift,
        total_kg: aggregate.totalKg,
        squat_kg: aggregate.squatKg,
        bench_kg: aggregate.benchKg,
        deadlift_kg: aggregate.deadliftKg,
        bodyweight_kg: aggregate.bodyweightKg,
        weight_class_kg: aggregate.weightClassKg,
        sort_value: getMetricValue(aggregate, sortMetric),
      });
    });

    rankedRows.sort((a, b) => {
      if (b.sort_value !== a.sort_value) {
        return b.sort_value - a.sort_value;
      }

      return a.full_name.localeCompare(b.full_name, "nl");
    });

    return [...rankedRows, ...missingRows];
  }, [entries, filters, sortMetric]);

  function updateFilter<K extends keyof LeaderboardFilters>(
    key: K,
    value: LeaderboardFilters[K],
  ) {
    setFilters((current) => {
      const next = { ...current, [key]: value };

      if (key === "sex" || key === "division") {
        next.weightClassKg = "all";
      }

      return next;
    });
  }

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-sm text-gray-500 mb-1">Leaderboard</p>
            <h1 className="text-3xl font-bold">OpenIPF ranking</h1>
            <p className="text-gray-500 mt-2">
              Beste totaal op OpenIPF, met huidige leeftijdsklasse per atleet.
            </p>
          </div>

          <button
            type="button"
            onClick={loadLeaderboard}
            disabled={loading}
            className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-black px-4 py-2 rounded-xl font-medium"
          >
            Vernieuwen
          </button>
        </div>

        {!loading && (
          <div className="bg-white rounded-2xl shadow p-5 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Sorteer op
                </span>
                <select
                  value={sortMetric}
                  onChange={(e) =>
                    setSortMetric(e.target.value as LeaderboardSortMetric)
                  }
                  className="rounded-xl border px-4 py-3"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Geslacht
                </span>
                <select
                  value={filters.sex}
                  onChange={(e) =>
                    updateFilter("sex", e.target.value as LeaderboardFilters["sex"])
                  }
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="all">Alle</option>
                  <option value="M">Mannen</option>
                  <option value="F">Vrouwen</option>
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Leeftijdsklasse
                </span>
                <select
                  value={filters.division}
                  onChange={(e) => updateFilter("division", e.target.value)}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="all">Alle</option>
                  {filterOptions.divisions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Gewichtsklasse
                </span>
                <select
                  value={filters.weightClassKg}
                  onChange={(e) => updateFilter("weightClassKg", e.target.value)}
                  className="rounded-xl border px-4 py-3"
                >
                  <option value="all">Alle</option>
                  {filterOptions.weightClasses.map((weightClass) => (
                    <option key={weightClass} value={weightClass}>
                      {weightClass} kg
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-2xl shadow p-8">
            <p className="text-gray-500">{progress || "OpenIPF data laden..."}</p>
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-2xl shadow overflow-x-auto">
            <div className="min-w-[920px]">
              <div
                className={`${tableGridClass} border-b px-5 py-4 text-xs font-bold uppercase tracking-wide text-gray-400`}
              >
                <div className="text-center">#</div>
                <div>Atleet</div>
                {metricColumns.map((column) => (
                  <div key={column.key} className="text-right">
                    {column.label}
                  </div>
                ))}
              </div>

              {displayRows.map((row, index) => {
                const rank = row.openipf_found
                  ? displayRows
                      .slice(0, index + 1)
                      .filter((item) => item.openipf_found).length
                  : null;

                return (
                  <div
                    key={row.athlete_id}
                    className={`${tableGridClass} border-b px-5 py-4 last:border-b-0`}
                  >
                    <div className="flex justify-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl text-lg font-bold ${
                          rank === 1
                            ? "bg-yellow-300 text-black"
                            : rank === 2
                              ? "bg-gray-300 text-black"
                              : rank === 3
                                ? "bg-orange-300 text-black"
                                : rank
                                  ? "bg-black text-white"
                                  : "bg-gray-100 text-gray-400"
                        }`}
                      >
                        {rank ?? "-"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-bold">{row.full_name}</h2>
                      {!row.openipf_found && (
                        <p className="text-sm text-red-500">
                          Niet gevonden in OpenIPF
                        </p>
                      )}
                    </div>

                    {metricColumns.map((column) => {
                      const active =
                        column.key !== "bodyweight" && sortMetric === column.key;

                      return (
                        <div
                          key={column.key}
                          className={`rounded-xl px-3 py-2 text-right ${
                            active ? "bg-black text-white" : ""
                          }`}
                        >
                          <p className="font-bold tabular-nums">
                            {formatMetricValue(column.key, row)}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {displayRows.length === 0 && (
                <div className="p-8">
                  <p className="text-gray-500">
                    Geen atleten gevonden voor deze filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
