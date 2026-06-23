"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import { PageContainer, PageHeader } from "@/components/ui/design-system";
import { getCurrentDivision, sortDivisions } from "@/lib/ipfDivision";
import {
  aggregateLeaderboardMeets,
  getMetricValue,
  type LeaderboardFilters,
  type LeaderboardSortMetric,
  type OpenIpfLifterData,
} from "@/lib/openipf";
import { getApiAuthHeaders } from "@/lib/apiClient";

const LEADERBOARD_CACHE_KEY = "openipf-leaderboard-cache-v2";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const OPENIPF_CHUNK_SIZE = 8;

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
  openipf_pending: boolean;
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
  "grid grid-cols-[48px_minmax(160px,1.4fr)_repeat(6,minmax(72px,1fr))] items-center gap-x-3";

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
  if (row.openipf_pending) {
    return "…";
  }

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

function readLeaderboardCache(): Record<string, OpenIpfLifterData | null> | null {
  try {
    const cached = sessionStorage.getItem(LEADERBOARD_CACHE_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached) as {
      at: number;
      results: Record<string, OpenIpfLifterData | null>;
    };

    if (Date.now() - parsed.at > CACHE_TTL_MS) {
      return null;
    }

    return parsed.results;
  } catch {
    return null;
  }
}

function writeLeaderboardCache(
  results: Record<string, OpenIpfLifterData | null>,
) {
  try {
    sessionStorage.setItem(
      LEADERBOARD_CACHE_KEY,
      JSON.stringify({ at: Date.now(), results }),
    );
  } catch {
    // Ignore cache write errors.
  }
}

function chunkNames(names: string[], size: number) {
  const chunks: string[][] = [];
  for (let index = 0; index < names.length; index += size) {
    chunks.push(names.slice(index, index + size));
  }
  return chunks;
}

function mergeLifterResults(
  entries: AthleteEntry[],
  results: Record<string, OpenIpfLifterData | null>,
): AthleteEntry[] {
  return entries.map((entry) => ({
    ...entry,
    lifter: results[entry.full_name] ?? entry.lifter,
  }));
}

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<AthleteEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [openipfLoading, setOpenipfLoading] = useState(false);
  const [openipfProgress, setOpenipfProgress] = useState({ done: 0, total: 0 });
  const [pendingNames, setPendingNames] = useState<Set<string>>(new Set());
  const [sortMetric, setSortMetric] = useState<LeaderboardSortMetric>("goodlift");
  const [filters, setFilters] = useState<LeaderboardFilters>({
    sex: "all",
    division: "all",
    weightClassKg: "all",
  });
  const fetchGeneration = useRef(0);

  useEffect(() => {
    document.title = "Leaderboard";
    void loadLeaderboard();
  }, []);

  async function fetchOpenIpfChunked(
    names: string[],
    baseEntries: AthleteEntry[],
    generation: number,
  ) {
    const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];
    if (uniqueNames.length === 0) {
      return;
    }

    setOpenipfLoading(true);
    setPendingNames(new Set(uniqueNames));
    setOpenipfProgress({ done: 0, total: uniqueNames.length });

    const chunks = chunkNames(uniqueNames, OPENIPF_CHUNK_SIZE);
    const allResults: Record<string, OpenIpfLifterData | null> = {};
    let completed = 0;

    await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const response = await fetch("/api/openipf-leaderboard", {
            method: "POST",
            headers: await getApiAuthHeaders({ "Content-Type": "application/json" }),
            body: JSON.stringify({ names: chunk }),
          });

          if (!response.ok) {
            return;
          }

          const data = (await response.json()) as {
            results: Record<string, OpenIpfLifterData | null>;
          };

          if (fetchGeneration.current !== generation) {
            return;
          }

          Object.assign(allResults, data.results);
          completed += chunk.length;

          setEntries((current) => mergeLifterResults(current, data.results));
          setPendingNames((current) => {
            const next = new Set(current);
            chunk.forEach((name) => next.delete(name));
            return next;
          });
          setOpenipfProgress({ done: completed, total: uniqueNames.length });
        } catch {
          // Chunk failed — other chunks may still succeed.
        }
      }),
    );

    if (fetchGeneration.current !== generation) {
      return;
    }

    writeLeaderboardCache(allResults);
    setEntries(mergeLifterResults(baseEntries, allResults));
    setPendingNames(new Set());
    setOpenipfLoading(false);
    setOpenipfProgress({ done: 0, total: 0 });
  }

  async function loadLeaderboard() {
    setLoading(true);

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
      return;
    }

    const baseEntries = athleteList.map((athlete: LimitlessAthlete) => ({
      athlete_id: athlete.id,
      full_name: athlete.full_name,
      birth_date: athlete.birth_date,
      current_division: getCurrentDivision(athlete.birth_date),
      lifter: null as OpenIpfLifterData | null,
    }));

    const cachedResults = readLeaderboardCache();

    setEntries(
      cachedResults
        ? mergeLifterResults(baseEntries, cachedResults)
        : baseEntries,
    );
    setLoading(false);

    const generation = fetchGeneration.current + 1;
    fetchGeneration.current = generation;

    void fetchOpenIpfChunked(
      athleteList.map((athlete) => athlete.full_name),
      baseEntries,
      generation,
    );
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

      const isPending = pendingNames.has(entry.full_name);

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
            openipf_pending: isPending,
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
        openipf_pending: false,
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
  }, [entries, filters, sortMetric, pendingNames]);

  const rankByAthleteId = useMemo(() => {
    const map = new Map<string, number>();
    let rank = 0;
    displayRows.forEach((row) => {
      if (!row.openipf_found || row.openipf_pending) return;
      rank += 1;
      map.set(row.athlete_id, rank);
    });
    return map;
  }, [displayRows]);

  const progressPercent =
    openipfProgress.total > 0
      ? Math.round((openipfProgress.done / openipfProgress.total) * 100)
      : 0;

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
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Team ranking"
          description="OpenIPF prestaties van je team."
        />

        {openipfLoading && (
          <div className="glass-accent-card ui-panel mb-4 p-4">
            <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-app-surface-muted">
              <div
                className="h-full rounded-full bg-brand-purple transition-all duration-300"
                style={{ width: `${Math.max(progressPercent, 8)}%` }}
              />
            </div>
            <p className="text-sm text-app-muted">
              OpenIPF data ophalen ({openipfProgress.done}/{openipfProgress.total})
            </p>
          </div>
        )}

        {!loading && (
          <div className="glass-accent-card ui-panel mb-6 p-3 md:p-4">
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Sorteer op
                </span>
                <select
                  value={sortMetric}
                  onChange={(e) =>
                    setSortMetric(e.target.value as LeaderboardSortMetric)
                  }
                  className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Geslacht
                </span>
                <select
                  value={filters.sex}
                  onChange={(e) =>
                    updateFilter("sex", e.target.value as LeaderboardFilters["sex"])
                  }
                  className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
                >
                  <option value="all">Alle</option>
                  <option value="M">Mannen</option>
                  <option value="F">Vrouwen</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Leeftijdsklasse
                </span>
                <select
                  value={filters.division}
                  onChange={(e) => updateFilter("division", e.target.value)}
                  className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
                >
                  <option value="all">Alle</option>
                  {filterOptions.divisions.map((division) => (
                    <option key={division} value={division}>
                      {division}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-app-muted">
                  Gewichtsklasse
                </span>
                <select
                  value={filters.weightClassKg}
                  onChange={(e) => updateFilter("weightClassKg", e.target.value)}
                  className="rounded-lg border border-app-border bg-app-surface px-3 py-2 text-sm text-app-text outline-none focus:ring-2 focus:ring-brand-purple/40"
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
          <div className="glass-accent-card ui-panel p-8">
            <p className="text-app-muted">Atleten laden...</p>
          </div>
        )}

        {!loading && (
          <div className="glass-accent-card ui-panel md:hidden divide-y divide-app-border overflow-hidden p-0">
            {displayRows.map((row) => {
              const rank =
                row.openipf_found && !row.openipf_pending
                  ? rankByAthleteId.get(row.athlete_id) ?? null
                  : null;
              const activeLabel =
                sortOptions.find((option) => option.value === sortMetric)
                  ?.label ?? "GL Points";

              return (
                <div
                  key={row.athlete_id}
                  className="flex items-center gap-3 px-3 py-3"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ${
                      rank === 1
                        ? "bg-yellow-400/90 text-black"
                        : rank === 2
                          ? "bg-zinc-300 text-black"
                          : rank === 3
                            ? "bg-orange-400/90 text-black"
                            : rank
                              ? "bg-brand-purple text-white"
                              : "bg-app-surface-muted text-app-muted"
                    }`}
                  >
                    {rank ?? "-"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-sm font-semibold text-app-text">
                      {row.full_name}
                    </h2>
                    {row.openipf_pending ? (
                      <p className="text-xs text-app-muted">OpenIPF laden…</p>
                    ) : !row.openipf_found ? (
                      <p className="text-xs text-red-400">
                        Niet gevonden in OpenIPF
                      </p>
                    ) : (
                      <div className="mt-0.5 flex items-center gap-2.5 text-[11px] tabular-nums text-app-muted">
                        <span>S {row.squat_kg || "-"}</span>
                        <span>B {row.bench_kg || "-"}</span>
                        <span>D {row.deadlift_kg || "-"}</span>
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-lg font-bold tabular-nums text-app-text">
                      {formatMetricValue(sortMetric, row)}
                    </p>
                    <p className="text-[10px] uppercase tracking-wide text-app-muted">
                      {activeLabel}
                    </p>
                  </div>
                </div>
              );
            })}

            {displayRows.length === 0 && (
              <div className="p-8">
                <p className="text-app-muted">
                  Geen atleten gevonden voor deze filters.
                </p>
              </div>
            )}
          </div>
        )}

        {!loading && (
          <div className="glass-accent-card ui-panel hidden overflow-x-auto p-0 md:block">
            <div className="min-w-[920px]">
              <div
                className={`${tableGridClass} border-b border-app-border px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-app-muted`}
              >
                <div className="text-center">#</div>
                <div>Atleet</div>
                {metricColumns.map((column) => (
                  <div key={column.key} className="text-right">
                    {column.label}
                  </div>
                ))}
              </div>

              {displayRows.map((row) => {
                const rank =
                  row.openipf_found && !row.openipf_pending
                    ? rankByAthleteId.get(row.athlete_id) ?? null
                    : null;

                return (
                  <div
                    key={row.athlete_id}
                    className={`${tableGridClass} border-b border-app-border px-4 py-3 transition hover:bg-app-surface-muted/40 last:border-b-0`}
                  >
                    <div className="flex justify-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold ${
                          rank === 1
                            ? "bg-yellow-400/90 text-black"
                            : rank === 2
                              ? "bg-zinc-300 text-black"
                              : rank === 3
                                ? "bg-orange-400/90 text-black"
                                : rank
                                  ? "bg-brand-purple text-white"
                                  : "bg-app-surface-muted text-app-muted"
                        }`}
                      >
                        {rank ?? "-"}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-medium text-app-text">
                        {row.full_name}
                      </h2>
                      {row.openipf_pending && (
                        <p className="text-xs text-app-muted">OpenIPF laden…</p>
                      )}
                      {!row.openipf_found && !row.openipf_pending && (
                        <p className="text-xs text-red-400">
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
                          className={`rounded-lg px-2 py-1.5 text-right text-sm ${
                            active
                              ? "bg-brand-purple text-white font-medium"
                              : row.openipf_pending
                                ? "font-normal text-app-muted"
                                : "font-normal text-app-text"
                          }`}
                        >
                          <p className="tabular-nums">
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
                  <p className="text-app-muted">
                    Geen atleten gevonden voor deze filters.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
