"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AppSidebar from "@/components/AppSidebar";
import { supabase } from "@/lib/supabaseClient";
import { loadProgramHierarchy } from "@/lib/programData";
import { loadAthleteSbdVolumeData, type WeeklyVolumeRow } from "@/lib/chatVolumeData";
import { loadAthleteCurrentMaxes } from "@/lib/athleteCurrentMaxes";
import StatisticsChartsSection from "@/components/statistics/StatisticsChartsSection";
import {
  getAccessoryExerciseNames,
  applyReferenceMaxesToRows,
  buildStatisticsBwRows,
  buildStatisticsFatigueRows,
  buildStatisticsRecoveryRows,
  buildStatisticsSetRows,
  getProgramExerciseNames,
  type StatisticsBwRow,
  type StatisticsFatigueRow,
  type StatisticsRecoveryRow,
  type StatisticsSetRow,
} from "@/lib/statisticsChartData";
import {
  loadAthleteChartInstances,
  saveAthleteChartInstances,
  type StatisticsChartInstance,
} from "@/lib/statisticsChartInstances";
import type { SbdLift } from "@/lib/chatVolumeData";
import type { StatisticsPeriodFilter } from "@/lib/statisticsChartFilters";
import { getOverviewBlockMetas } from "@/lib/statisticsOverview";
import StatisticsOverviewDashboard from "@/components/statistics/StatisticsOverviewDashboard";
import StatsFilterBar from "@/components/statistics/dashboard/StatsFilterBar";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

const CORE_OVERVIEW_CHART_IDS = new Set([
  "e1rm_all",
  "e1rm_squat",
  "e1rm_bench",
  "e1rm_deadlift",
  "bw",
]);

type AthleteExerciseSet = {
  program_exercise_id: string;
  athlete_id: string;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
};

type AthleteDayCheckin = {
  program_day_id: string;
  athlete_id: string;
  bw: string | null;
  fatigue: number | null;
  recovery: number | null;
};

const EMPTY_MAXES: Record<SbdLift, number | null> = {
  squat: null,
  bench: null,
  deadlift: null,
};

export default function StatisticsView({ embedded = false }: { embedded?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [setRows, setSetRows] = useState<StatisticsSetRow[]>([]);
  const [bwRows, setBwRows] = useState<StatisticsBwRow[]>([]);
  const [fatigueRows, setFatigueRows] = useState<StatisticsFatigueRow[]>([]);
  const [recoveryRows, setRecoveryRows] = useState<StatisticsRecoveryRow[]>([]);
  const [volumeRows, setVolumeRows] = useState<WeeklyVolumeRow[]>([]);
  const [athleteDirectory, setAthleteDirectory] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [chartInstances, setChartInstances] = useState<StatisticsChartInstance[]>([]);
  const [period, setPeriod] = useState<StatisticsPeriodFilter>({
    preset: "last_4",
  });
  const [referenceMaxes, setReferenceMaxes] =
    useState<Record<SbdLift, number | null>>(EMPTY_MAXES);
  const [headerPortal, setHeaderPortal] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (embedded) {
      deferEffectUpdate(() => {
        setHeaderPortal(document.getElementById("statistics-header-actions"));
      });
    }
  }, [embedded]);

  const athleteOptions = useMemo(() => {
    const unique: Record<string, string> = {};

    athleteDirectory.forEach((athlete) => {
      unique[athlete.id] = athlete.name;
    });

    return Object.entries(unique)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteDirectory]);

  useEffect(() => {
    if (!selectedAthleteId && athleteOptions[0]) {
      deferEffectUpdate(() => {
        setSelectedAthleteId(athleteOptions[0].id);
      });
    }
  }, [athleteOptions, selectedAthleteId]);

  useEffect(() => {
    if (!selectedAthleteId) return;
    deferEffectUpdate(() => {
      const loaded = loadAthleteChartInstances(selectedAthleteId);
      setChartInstances(
        loaded.filter((item) => !CORE_OVERVIEW_CHART_IDS.has(item.chartId)),
      );
    });
  }, [selectedAthleteId]);

  useEffect(() => {
    if (!selectedAthleteId) return;

    void loadAthleteCurrentMaxes(selectedAthleteId).then((maxes) => {
      setReferenceMaxes({
        squat: maxes.current_max_squat,
        bench: maxes.current_max_bench,
        deadlift: maxes.current_max_deadlift,
      });
    });

    void loadAthleteSbdVolumeData(selectedAthleteId)
      .then(setVolumeRows)
      .catch(() => setVolumeRows([]));
  }, [selectedAthleteId]);

  const athleteSetRows = useMemo(
    () =>
      applyReferenceMaxesToRows(
        setRows.filter((row) => row.athleteId === selectedAthleteId),
        referenceMaxes,
      ),
    [setRows, selectedAthleteId, referenceMaxes],
  );

  const athleteBwRows = useMemo(
    () => bwRows.filter((row) => row.athleteId === selectedAthleteId),
    [bwRows, selectedAthleteId],
  );

  const athleteFatigueRows = useMemo(
    () => fatigueRows.filter((row) => row.athleteId === selectedAthleteId),
    [fatigueRows, selectedAthleteId],
  );

  const athleteRecoveryRows = useMemo(
    () => recoveryRows.filter((row) => row.athleteId === selectedAthleteId),
    [recoveryRows, selectedAthleteId],
  );

  const blockMetas = useMemo(
    () => getOverviewBlockMetas(athleteSetRows, athleteBwRows, volumeRows),
    [athleteSetRows, athleteBwRows, volumeRows],
  );

  useEffect(() => {
    if (period.preset !== "custom" || blockMetas.length === 0) return;
    deferEffectUpdate(() => {
      setPeriod((current) => ({
        ...current,
        fromBlockId: current.fromBlockId || blockMetas[0]?.blockId,
        toBlockId: current.toBlockId || blockMetas[blockMetas.length - 1]?.blockId,
      }));
    });
  }, [period.preset, blockMetas]);

  const extraChartInstances = useMemo(
    () =>
      chartInstances.filter(
        (instance) => !CORE_OVERVIEW_CHART_IDS.has(instance.chartId),
      ),
    [chartInstances],
  );

  const exerciseNames = useMemo(
    () => getProgramExerciseNames(athleteSetRows),
    [athleteSetRows],
  );

  const accessoryExerciseNames = useMemo(
    () => getAccessoryExerciseNames(athleteSetRows),
    [athleteSetRows],
  );

  function persistInstances(next: StatisticsChartInstance[]) {
    setChartInstances(next);
    if (selectedAthleteId) {
      saveAthleteChartInstances(selectedAthleteId, next);
    }
  }

  function handleAddInstance(instance: StatisticsChartInstance) {
    persistInstances([...chartInstances, instance]);
  }

  function handleRemoveInstance(instanceId: string) {
    persistInstances(chartInstances.filter((item) => item.instanceId !== instanceId));
  }

  function handleUpdateInstance(instance: StatisticsChartInstance) {
    persistInstances(
      chartInstances.map((item) =>
        item.instanceId === instance.instanceId ? instance : item,
      ),
    );
  }

  const headerFilters = (
    <StatsFilterBar
      compact
      athleteOptions={athleteOptions}
      selectedAthleteId={selectedAthleteId}
      onAthleteChange={setSelectedAthleteId}
      period={period}
      onPeriodChange={setPeriod}
      blockMetas={blockMetas}
      chartInstances={chartInstances}
      exerciseNames={exerciseNames}
      accessoryExerciseNames={accessoryExerciseNames}
      onAddChart={handleAddInstance}
    />
  );

  const chartPickerBar = (
    <StatsFilterBar
      athleteOptions={athleteOptions}
      selectedAthleteId={selectedAthleteId}
      onAthleteChange={setSelectedAthleteId}
      period={period}
      onPeriodChange={setPeriod}
      blockMetas={blockMetas}
      chartInstances={chartInstances}
      exerciseNames={exerciseNames}
      accessoryExerciseNames={accessoryExerciseNames}
      onAddChart={handleAddInstance}
    />
  );

  async function loadStatisticsData() {
    setLoading(true);
    setErrorMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setErrorMessage(profileError.message);
      setLoading(false);
      return;
    }

    const { data: hierarchy, error: hierarchyError } = await loadProgramHierarchy({
      userId: user.id,
      role: profile?.role || "",
    });

    if (hierarchyError || !hierarchy) {
      setErrorMessage(hierarchyError || "Data laden mislukt.");
      setLoading(false);
      return;
    }

    const {
      blocks,
      sets: setRowsData,
      checkins: dayCheckinsData,
      athleteNames,
      blockById,
      weekById,
      dayById,
      exerciseById,
    } = hierarchy;

    setAthleteDirectory(
      Object.entries(athleteNames).map(([id, name]) => ({ id, name })),
    );

    if (blocks.length === 0) {
      setSetRows([]);
      setBwRows([]);
      setFatigueRows([]);
      setRecoveryRows([]);
      setLoading(false);
      return;
    }

    setSetRows(
      buildStatisticsSetRows({
        sets: setRowsData as AthleteExerciseSet[],
        exerciseById,
        dayById,
        weekById,
        blockById,
        referenceMaxes: EMPTY_MAXES,
      }),
    );

    setBwRows(
      buildStatisticsBwRows({
        checkins: (dayCheckinsData || []) as AthleteDayCheckin[],
        dayById,
        weekById,
        blockById,
      }),
    );

    setFatigueRows(
      buildStatisticsFatigueRows({
        checkins: (dayCheckinsData || []) as AthleteDayCheckin[],
        dayById,
        weekById,
        blockById,
      }),
    );

    setRecoveryRows(
      buildStatisticsRecoveryRows({
        checkins: (dayCheckinsData || []) as AthleteDayCheckin[],
        dayById,
        weekById,
        blockById,
      }),
    );

    setLoading(false);
  }

  useEffect(() => {
    deferEffectUpdate(() => {
      void loadStatisticsData();
    });
  }, []);

  const content = (
    <>
      {embedded && headerPortal
        ? createPortal(headerFilters, headerPortal)
        : headerFilters}

      {loading ? (
        <div className="flex min-h-[50vh] items-center justify-center">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-brand-purple border-t-transparent"
            role="status"
            aria-label="Statistieken laden"
          />
        </div>
      ) : (
        <>
          {chartPickerBar}

          {errorMessage ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-red-400">
              {errorMessage}
            </div>
          ) : (
            <div className="space-y-8">
              <StatisticsOverviewDashboard
                setRows={athleteSetRows}
                bwRows={athleteBwRows}
                volumeRows={volumeRows}
                fatigueRows={athleteFatigueRows}
                recoveryRows={athleteRecoveryRows}
                period={period}
                blockMetas={blockMetas}
                referenceMaxes={referenceMaxes}
              />

              {extraChartInstances.length > 0 ? (
                <div className="space-y-4">
                  <div>
                    <h2 className="text-[15px] font-semibold text-app-text">
                      Extra grafieken
                    </h2>
                    <p className="mt-1 text-sm text-app-muted">
                      Aangepaste grafieken die je hebt toegevoegd.
                    </p>
                  </div>
                  <StatisticsChartsSection
                    instances={extraChartInstances}
                    setRows={athleteSetRows}
                    bwRows={athleteBwRows}
                    fatigueRows={athleteFatigueRows}
                    recoveryRows={athleteRecoveryRows}
                    volumeRows={volumeRows}
                    onRemoveInstance={handleRemoveInstance}
                    onUpdateInstance={handleUpdateInstance}
                  />
                </div>
              ) : null}
            </div>
          )}
        </>
      )}
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <main className="min-h-[100dvh] bg-app-bg">
      <section className="flex-1 p-8 pb-24">{content}</section>
      <AppSidebar />
    </main>
  );
}
