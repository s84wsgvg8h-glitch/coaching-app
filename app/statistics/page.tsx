"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type ProgramBlock = {
  id: string;
  title: string;
  athlete_id: string | null;
  start_date: string | null;
};

type ProgramWeek = {
  id: string;
  title: string;
  week_number: number;
  program_block_id: string;
};

type ProgramDay = {
  id: string;
  title: string;
  day_number: number;
  program_week_id: string;
};

type ProgramExercise = {
  id: string;
  program_day_id: string;
  name: string;
  sets: string | null;
  reps: string | null;
  load: string | null;
  rpe: string | null;
  exercise_number: number | null;
};

type AthleteExerciseSet = {
  program_exercise_id: string;
  athlete_id: string;
  set_number: number;
  reps: string | null;
  weight: string | null;
  rpe: string | null;
};

type AthleteDayCheckin = {
  program_day_id: string;
  athlete_id: string;
  bw: string | null;
  recovery: number | null;
  fatigue: number | null;
  notes: string | null;
};

type ChartRow = {
  athleteId: string;
  athleteName: string;
  blockTitle: string;
  weekTitle: string;
  weekNumber: number;
  exerciseName: string;
  reps: number | null;
  weight: number | null;
  e1rm: number | null;
};

type BwRow = {
  athleteId: string;
  blockTitle: string;
  weekTitle: string;
  weekNumber: number;
  bw: number;
  weekStartDate: string | null;
};

type BwChartRow = {
  name: string;
  weekNumber: number;
  blockTitle: string;
  date: string | null;
  value: number | null;
  targetValue: number | null;
  low: number;
  band: number;
};

type LiftType = "squat" | "bench" | "deadlift";

export default function StatisticsPage() {
  const router = useRouter();

  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [rows, setRows] = useState<ChartRow[]>([]);
  const [bwRows, setBwRows] = useState<BwRow[]>([]);
  const [athleteDirectory, setAthleteDirectory] = useState<
    { id: string; name: string }[]
  >([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [targetBodyweight, setTargetBodyweight] = useState("");
  const [targetBodyweightDate, setTargetBodyweightDate] = useState("");
  const [activeTargetBodyweight, setActiveTargetBodyweight] = useState("");
  const [activeTargetBodyweightDate, setActiveTargetBodyweightDate] = useState("");

  useEffect(() => {
    loadStatisticsData();
  }, []);

  const athleteOptions = useMemo(() => {
    const unique: Record<string, string> = {};

    athleteDirectory.forEach((athlete) => {
      unique[athlete.id] = athlete.name;
    });

    rows.forEach((row) => {
      unique[row.athleteId] = row.athleteName;
    });

    return Object.entries(unique)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [athleteDirectory, rows]);

  useEffect(() => {
    if (!selectedAthleteId && athleteOptions[0]) {
      setSelectedAthleteId(athleteOptions[0].id);
    }
  }, [athleteOptions, selectedAthleteId]);

  function parseNumber(value: string | null | undefined) {
    if (!value) return null;

    const cleanValue = value
      .replace(",", ".")
      .replace("kg", "")
      .replace("KG", "")
      .trim();

    const parsedValue = Number(cleanValue);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function formatNumber(value: number) {
    const rounded = Math.round(value * 10) / 10;
    return Number.isInteger(rounded)
      ? String(rounded)
      : String(rounded).replace(".", ",");
  }

  function addDays(dateString: string | null, days: number) {
    if (!dateString) return null;

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return null;

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + days);

    return date.toISOString().slice(0, 10);
  }

  function daysBetween(startDate: string | null, endDate: string | null) {
    if (!startDate || !endDate) return 0;

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;

    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    return Math.round((end.getTime() - start.getTime()) / 86400000);
  }

  function formatShortDate(dateString: string | null) {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "short",
      year: "2-digit",
    });
  }

  function getLiftChartData(lift: LiftType) {
    const grouped: Record<
      string,
      {
        label: string;
        weekNumber: number;
        blockTitle: string;
        values: number[];
      }
    > = {};

    rows
      .filter((row) => row.athleteId === selectedAthleteId)
      .filter((row) => row.e1rm !== null)
      .filter((row) => {
        const cleanName = row.exerciseName.toLowerCase();

        if (lift === "squat") return cleanName.includes("squat");
        if (lift === "bench") return cleanName.includes("bench");
        return cleanName.includes("deadlift");
      })
      .forEach((row) => {
        const key = `${row.blockTitle}-${row.weekNumber}-${row.weekTitle}`;

        if (!grouped[key]) {
          grouped[key] = {
            label: `${row.blockTitle} · ${row.weekTitle}`,
            weekNumber: row.weekNumber,
            blockTitle: row.blockTitle,
            values: [],
          };
        }

        grouped[key].values.push(row.e1rm as number);
      });

    return Object.values(grouped)
      .map((item) => ({
        name: item.label,
        value: Math.round(Math.max(...item.values) * 10) / 10,
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
      }))
      .sort((a, b) => {
        const blockCompare = a.blockTitle.localeCompare(b.blockTitle);
        if (blockCompare !== 0) return blockCompare;

        return a.weekNumber - b.weekNumber;
      });
  }

  function getExerciseGroupName(exerciseName: string) {
    const cleanName = exerciseName.toLowerCase();

    if (cleanName.includes("squat")) return "Squat";
    if (cleanName.includes("bench")) return "Bench";
    if (cleanName.includes("deadlift")) return "Deadlift";

    return exerciseName || "Oefening";
  }

  function getExerciseGroupPriority(name: string) {
    const cleanName = name.toLowerCase();

    if (cleanName.includes("squat")) return 1;
    if (cleanName.includes("bench")) return 2;
    if (cleanName.includes("deadlift")) return 3;

    return 4;
  }

  function getVolumeExerciseKeys() {
    return Array.from(
      new Set(
        rows
          .filter((row) => row.athleteId === selectedAthleteId)
          .map((row) => getExerciseGroupName(row.exerciseName)),
      ),
    ).sort((a, b) => {
      const priorityA = getExerciseGroupPriority(a);
      const priorityB = getExerciseGroupPriority(b);

      if (priorityA !== priorityB) return priorityA - priorityB;

      return a.localeCompare(b);
    });
  }

  function getSingleExerciseVolumeChartData(
    exerciseGroup: string,
    type: "sets" | "reps",
  ) {
    const grouped: Record<
      string,
      {
        name: string;
        weekNumber: number;
        blockTitle: string;
        value: number;
      }
    > = {};

    rows
      .filter((row) => row.athleteId === selectedAthleteId)
      .filter((row) => getExerciseGroupName(row.exerciseName) === exerciseGroup)
      .forEach((row) => {
        const key = `${row.blockTitle}-${row.weekNumber}-${row.weekTitle}`;

        if (!grouped[key]) {
          grouped[key] = {
            name: `${row.blockTitle} · ${row.weekTitle}`,
            weekNumber: row.weekNumber,
            blockTitle: row.blockTitle,
            value: 0,
          };
        }

        if (type === "sets") {
          grouped[key].value += 1;
        }

        if (type === "reps" && row.reps !== null) {
          grouped[key].value += row.reps;
        }
      });

    return Object.values(grouped).sort((a, b) => {
      const blockCompare = a.blockTitle.localeCompare(b.blockTitle);
      if (blockCompare !== 0) return blockCompare;

      return a.weekNumber - b.weekNumber;
    });
  }

  function getBaseBwChartData() {
    const grouped: Record<
      string,
      {
        name: string;
        weekNumber: number;
        blockTitle: string;
        date: string | null;
        values: number[];
      }
    > = {};

    bwRows
      .filter((row) => row.athleteId === selectedAthleteId)
      .forEach((row) => {
        const key = `${row.blockTitle}-${row.weekNumber}-${row.weekTitle}`;

        if (!grouped[key]) {
          grouped[key] = {
            name: `${row.blockTitle} · ${row.weekTitle}`,
            weekNumber: row.weekNumber,
            blockTitle: row.blockTitle,
            date: row.weekStartDate,
            values: [],
          };
        }

        grouped[key].values.push(row.bw);
      });

    return Object.values(grouped)
      .map((item) => ({
        name: item.name,
        weekNumber: item.weekNumber,
        blockTitle: item.blockTitle,
        date: item.date,
        value:
          Math.round(
            (item.values.reduce((total, value) => total + value, 0) /
              item.values.length) *
              10,
          ) / 10,
      }))
      .sort((a, b) => {
        if (a.date && b.date) {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
        }

        const blockCompare = a.blockTitle.localeCompare(b.blockTitle);
        if (blockCompare !== 0) return blockCompare;

        return a.weekNumber - b.weekNumber;
      });
  }

  function addTargetBwGoal() {
    const targetWeight = parseNumber(targetBodyweight);

    if (targetWeight === null) {
      alert("Vul een geldig goal BW in");
      return;
    }

    if (!targetBodyweightDate) {
      alert("Kies een einddatum");
      return;
    }

    setActiveTargetBodyweight(targetBodyweight);
    setActiveTargetBodyweightDate(targetBodyweightDate);
  }

  function getBwChartData(): BwChartRow[] {
    const baseData = getBaseBwChartData();
    const targetWeight = parseNumber(activeTargetBodyweight);

    const emptyTargetData: BwChartRow[] = baseData.map((item) => ({
      ...item,
      value: item.value,
      targetValue: null,
      low: 0,
      band: 0,
    }));

    if (
      baseData.length === 0 ||
      targetWeight === null ||
      !activeTargetBodyweightDate
    ) {
      return emptyTargetData;
    }

    const latestPoint = [...baseData]
      .filter((item) => item.value !== null && item.date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .at(-1);

    if (!latestPoint || latestPoint.value === null || !latestPoint.date) {
      return emptyTargetData;
    }

    const startDate = latestPoint.date;
    const startWeight = latestPoint.value;
    const totalDays = daysBetween(startDate, activeTargetBodyweightDate);

    if (totalDays <= 0) {
      return emptyTargetData;
    }

    const chartData: BwChartRow[] = baseData.map((item) => {
      if (!item.date) {
        return {
          ...item,
          targetValue: null,
          low: 0,
          band: 0,
        };
      }

      const currentDays = daysBetween(startDate, item.date);

      if (currentDays < 0 || currentDays > totalDays) {
        return {
          ...item,
          targetValue: null,
          low: 0,
          band: 0,
        };
      }

      const progress = currentDays / totalDays;
      const targetValue =
        Math.round((startWeight + (targetWeight - startWeight) * progress) * 10) /
        10;

      const actualValue = item.value;

      return {
        ...item,
        targetValue,
        low:
          actualValue !== null
            ? Math.min(actualValue, targetValue)
            : Math.min(startWeight, targetValue),
        band:
          actualValue !== null
            ? Math.abs(actualValue - targetValue)
            : Math.abs(startWeight - targetValue),
      };
    });

    if (!chartData.some((item) => item.date === startDate)) {
      chartData.push({
        name: `Start · ${formatShortDate(startDate)}`,
        weekNumber: latestPoint.weekNumber,
        blockTitle: latestPoint.blockTitle,
        date: startDate,
        value: startWeight,
        targetValue: startWeight,
        low: startWeight,
        band: 0,
      });
    }

    if (!chartData.some((item) => item.date === activeTargetBodyweightDate)) {
      chartData.push({
        name: `Goal · ${formatShortDate(activeTargetBodyweightDate)}`,
        weekNumber: latestPoint.weekNumber + Math.ceil(totalDays / 7),
        blockTitle: latestPoint.blockTitle,
        date: activeTargetBodyweightDate,
        value: null,
        targetValue: targetWeight,
        low: Math.min(startWeight, targetWeight),
        band: Math.abs(startWeight - targetWeight),
      });
    }

    return chartData.sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      return a.weekNumber - b.weekNumber;
    });
  }

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
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError) {
      setErrorMessage(profileError.message);
      setLoading(false);
      return;
    }

    setRole(profile?.role || "");
    setFullName(profile?.full_name || "");

    const isCoach = profile?.role === "coach";

    const { data: blocksData, error: blocksError } = isCoach
      ? await supabase.from("program_blocks").select("*")
      : await supabase
          .from("program_blocks")
          .select("*")
          .eq("athlete_id", user.id);

    if (blocksError) {
      setErrorMessage(blocksError.message);
      setLoading(false);
      return;
    }

    const blocks = (blocksData || []) as ProgramBlock[];
    const blockIds = blocks.map((block) => block.id);
    const athleteIds = Array.from(
      new Set(blocks.map((block) => block.athlete_id).filter(Boolean)),
    ) as string[];

    if (blockIds.length === 0) {
      setRows([]);
      setBwRows([]);
      setLoading(false);
      return;
    }

    const athleteNames: Record<string, string> = {};

    if (athleteIds.length > 0) {
      const { data: athletesData } = await supabase
        .from("profiles")
        .select("id, full_name, role")
        .in("id", athleteIds);

      const loadedAthletes = ((athletesData || []) as Profile[]).map(
        (athlete) => ({
          id: athlete.id,
          name: athlete.full_name || "Onbekende atleet",
        }),
      );

      loadedAthletes.forEach((athlete) => {
        athleteNames[athlete.id] = athlete.name;
      });

      setAthleteDirectory(loadedAthletes);
    } else {
      setAthleteDirectory([]);
    }

    const { data: weeksData, error: weeksError } = await supabase
      .from("program_weeks")
      .select("*")
      .in("program_block_id", blockIds)
      .order("week_number", { ascending: true });

    if (weeksError) {
      setErrorMessage(weeksError.message);
      setLoading(false);
      return;
    }

    const weeks = (weeksData || []) as ProgramWeek[];
    const weekIds = weeks.map((week) => week.id);

    if (weekIds.length === 0) {
      setRows([]);
      setBwRows([]);
      setLoading(false);
      return;
    }

    const { data: daysData, error: daysError } = await supabase
      .from("program_days")
      .select("*")
      .in("program_week_id", weekIds)
      .order("day_number", { ascending: true });

    if (daysError) {
      setErrorMessage(daysError.message);
      setLoading(false);
      return;
    }

    const days = (daysData || []) as ProgramDay[];
    const dayIds = days.map((day) => day.id);

    if (dayIds.length === 0) {
      setRows([]);
      setBwRows([]);
      setLoading(false);
      return;
    }

    const { data: exercisesData, error: exercisesError } = await supabase
      .from("program_exercises")
      .select("*")
      .in("program_day_id", dayIds)
      .order("exercise_number", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (exercisesError) {
      setErrorMessage(exercisesError.message);
      setLoading(false);
      return;
    }

    const exercises = (exercisesData || []) as ProgramExercise[];
    const exerciseIds = exercises.map((exercise) => exercise.id);

    if (exerciseIds.length === 0) {
      setRows([]);
      setBwRows([]);
      setLoading(false);
      return;
    }

    const { data: setRowsData, error: setRowsError } = await supabase
      .from("athlete_exercise_sets")
      .select("*")
      .in("program_exercise_id", exerciseIds)
      .order("set_number", { ascending: true });

    if (setRowsError) {
      setErrorMessage(setRowsError.message);
      setLoading(false);
      return;
    }

    const { data: dayCheckinsData, error: dayCheckinsError } = await supabase
      .from("athlete_day_checkins")
      .select("*")
      .in("program_day_id", dayIds);

    if (dayCheckinsError) {
      setErrorMessage(dayCheckinsError.message);
      setLoading(false);
      return;
    }

    const blockById: Record<string, ProgramBlock> = {};
    const weekById: Record<string, ProgramWeek> = {};
    const dayById: Record<string, ProgramDay> = {};
    const exerciseById: Record<string, ProgramExercise> = {};

    blocks.forEach((block) => {
      blockById[block.id] = block;
    });

    weeks.forEach((week) => {
      weekById[week.id] = week;
    });

    days.forEach((day) => {
      dayById[day.id] = day;
    });

    exercises.forEach((exercise) => {
      exerciseById[exercise.id] = exercise;
    });

    const builtRows = ((setRowsData || []) as AthleteExerciseSet[])
      .map((setRow) => {
        const exercise = exerciseById[setRow.program_exercise_id];

        if (!exercise) return null;

        const day = dayById[exercise.program_day_id];
        const week = day ? weekById[day.program_week_id] : null;
        const block = week ? blockById[week.program_block_id] : null;

        if (!day || !week || !block || !block.athlete_id) return null;
        if (setRow.athlete_id !== block.athlete_id) return null;

        const reps = parseNumber(setRow.reps);
        const weight = parseNumber(setRow.weight);
        const e1rm =
          reps !== null && weight !== null ? weight * (1 + reps / 30) : null;

        return {
          athleteId: block.athlete_id,
          athleteName: athleteNames[block.athlete_id] || "Onbekende atleet",
          blockTitle: block.title || "Block",
          weekTitle: week.title || `Week ${week.week_number}`,
          weekNumber: week.week_number,
          exerciseName: exercise.name || "Oefening",
          reps,
          weight,
          e1rm: e1rm !== null ? Math.round(e1rm * 10) / 10 : null,
        };
      })
      .filter((row): row is ChartRow => row !== null);

    const builtBwRows = ((dayCheckinsData || []) as AthleteDayCheckin[])
      .map((checkin) => {
        const day = dayById[checkin.program_day_id];
        const week = day ? weekById[day.program_week_id] : null;
        const block = week ? blockById[week.program_block_id] : null;
        const bw = parseNumber(checkin.bw);

        if (!day || !week || !block || !block.athlete_id || bw === null) {
          return null;
        }

        if (checkin.athlete_id !== block.athlete_id) return null;

        return {
          athleteId: block.athlete_id,
          blockTitle: block.title || "Block",
          weekTitle: week.title || `Week ${week.week_number}`,
          weekNumber: week.week_number,
          bw,
          weekStartDate: addDays(block.start_date, (week.week_number - 1) * 7),
        };
      })
      .filter((row): row is BwRow => row !== null);

    setRows(builtRows);
    setBwRows(builtBwRows);
    setLoading(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function renderLiftChart(title: string, lift: LiftType) {
    const data = getLiftChartData(lift);
    const bestValue =
      data.length > 0 ? Math.max(...data.map((item) => item.value)) : null;

    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow p-5 min-h-[460px]">
        <div className="mb-4">
          <p className="text-xs font-black text-gray-500 uppercase">
            Hoogste e1RM per week
          </p>
          <h2 className="text-2xl font-black text-black">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Beste: {bestValue !== null ? `${formatNumber(bestValue)}kg` : "-"}
          </p>
        </div>

        {data.length === 0 ? (
          <div className="h-[340px] flex items-center justify-center text-gray-500 text-sm">
            Geen data voor {title}.
          </div>
        ) : (
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="linear" dataKey="value" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  function renderSingleExerciseVolumeChart(
    exerciseGroup: string,
    type: "sets" | "reps",
  ) {
    const data = getSingleExerciseVolumeChartData(exerciseGroup, type);
    const title =
      type === "sets"
        ? `${exerciseGroup} sets per week`
        : `${exerciseGroup} reps per week`;

    return (
      <div
        key={`${exerciseGroup}-${type}`}
        className="bg-white rounded-3xl border border-gray-200 shadow p-5 min-h-[360px]"
      >
        <div className="mb-4">
          <p className="text-xs font-black text-gray-500 uppercase">
            {type === "sets" ? "Aantal sets" : "Totaal reps"}
          </p>
          <h2 className="text-xl font-black text-black">{title}</h2>
        </div>

        {data.length === 0 ? (
          <div className="h-[240px] flex items-center justify-center text-gray-500 text-sm">
            Geen data.
          </div>
        ) : (
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis />
                <Tooltip />
                <Line type="linear" dataKey="value" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  function renderBwChart() {
    const data = getBwChartData();
    const actualValues = data
      .map((item) => item.value)
      .filter((value): value is number => value !== null);
    const targetValues = data
      .map((item) => item.targetValue)
      .filter((value): value is number => value !== null);
    const values = [...actualValues, ...targetValues];
    const latestWeight =
      actualValues.length > 0 ? actualValues[actualValues.length - 1] : null;
    const previousWeight =
      actualValues.length > 1 ? actualValues[actualValues.length - 2] : null;
    const delta =
      latestWeight !== null && previousWeight !== null
        ? Math.round((latestWeight - previousWeight) * 10) / 10
        : null;
    const minWeight =
      values.length > 0 ? Math.floor(Math.min(...values) - 3) : 0;
    const maxWeight =
      values.length > 0 ? Math.ceil(Math.max(...values) + 3) : 100;

    return (
      <div className="bg-white rounded-3xl border border-gray-200 shadow p-5 min-h-[540px] w-full">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-xs font-black text-gray-500 uppercase">
              Gemiddelde per week
            </p>
            <h2 className="text-xl font-black text-black">BW</h2>
          </div>

          <div className="text-right">
            <p className="text-3xl font-black text-black">
              {latestWeight !== null ? `${formatNumber(latestWeight)}kg` : "-"}
            </p>

            <p
              className={`text-xs font-black ${
                delta !== null
                  ? delta >= 0
                    ? "text-green-600"
                    : "text-red-600"
                  : "text-gray-400"
              }`}
            >
              {delta !== null
                ? `${delta >= 0 ? "+" : ""}${formatNumber(delta)}kg vs vorige week`
                : "-"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3 mb-4 max-w-[680px] items-end">
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">
              Target BW
            </p>
            <input
              value={targetBodyweight}
              onChange={(e) => setTargetBodyweight(e.target.value)}
              placeholder="Bijv. 82,5"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-black"
            />
          </div>

          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase mb-1">
              Einddatum
            </p>
            <input
              type="date"
              value={targetBodyweightDate}
              onChange={(e) => setTargetBodyweightDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-black"
            />
          </div>

          <button
            onClick={addTargetBwGoal}
            className="rounded-xl bg-black px-4 py-2 font-semibold text-white hover:opacity-90"
          >
            Toevoegen
          </button>
        </div>

        {data.length === 0 ? (
          <div className="h-[220px] flex items-center justify-center text-gray-500 text-sm">
            Geen BW data.
          </div>
        ) : (
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => formatShortDate(value)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis domain={[minWeight, maxWeight]} />
                <Tooltip />
                <Area
                  type="linear"
                  dataKey="low"
                  stackId="bw-target-gap"
                  stroke="none"
                  fill="transparent"
                  isAnimationActive={false}
                />
                <Area
                  type="linear"
                  dataKey="band"
                  stackId="bw-target-gap"
                  stroke="none"
                  fill="#bfdbfe"
                  fillOpacity={0.7}
                  isAnimationActive={false}
                />
                <Line
                  type="linear"
                  dataKey="value"
                  name="BW"
                  strokeWidth={2}
                  dot
                  connectNulls
                />
                <Line
                  type="linear"
                  dataKey="targetValue"
                  name="Afval lijn"
                  stroke="#2563eb"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        <aside className="group sticky top-0 h-screen self-start relative w-20 hover:w-64 min-w-[80px] max-w-[80px] hover:max-w-[256px] bg-white shadow-xl p-3 flex flex-col transition-all duration-150 overflow-hidden z-30">
          <div className="flex items-center justify-center group-hover:justify-between mb-5 transition-all duration-150">
            <button
              type="button"
              onClick={() => router.push("/profile")}
              className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 transition rounded-xl px-2 py-2 w-full text-left"
            >
              <div className="w-9 h-9 min-w-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">
                👤
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden">
                <p className="font-semibold text-sm">{fullName}</p>
                <p className="text-xs text-gray-400 capitalize">
                  Ingelogd als {role}
                </p>
              </div>
            </button>
          </div>

          <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="relative p-3 rounded-xl transition-all duration-150 flex items-center gap-3 text-left bg-gray-100 hover:bg-gray-200"
            >
              <div className="w-9 h-9 min-w-9 rounded-lg shadow flex items-center justify-center text-lg bg-white">
                🏠
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden">
                <h3 className="font-semibold text-sm">Dashboard</h3>
                <p className="text-xs text-gray-500">Ga terug.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/raw-data")}
              className="relative p-3 rounded-xl transition-all duration-150 flex items-center gap-3 text-left bg-gray-100 hover:bg-gray-200"
            >
              <div className="w-9 h-9 min-w-9 rounded-lg shadow flex items-center justify-center text-lg bg-white">
                🧾
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden">
                <h3 className="font-semibold text-sm">Raw Data</h3>
                <p className="text-xs text-gray-500">Bekijk ruwe data.</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => router.push("/statistics")}
              className="relative p-3 rounded-xl transition-all duration-150 flex items-center gap-3 text-left bg-black text-white"
            >
              <div className="w-9 h-9 min-w-9 rounded-lg shadow flex items-center justify-center text-lg bg-white text-black">
                📈
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden">
                <h3 className="font-semibold text-sm">Statistics</h3>
                <p className="text-xs text-gray-300">SBD e1RM grafieken.</p>
              </div>
            </button>
          </nav>

          <button
            onClick={logout}
            className="bg-black text-white px-3 py-2 rounded-xl mt-5 flex items-center gap-3 hover:opacity-90 transition"
          >
            <span className="w-9 min-w-9 text-lg">🚪</span>
            <span className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden text-sm">
              Uitloggen
            </span>
          </button>
        </aside>

        <section className="flex-1 p-8">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-black">Statistics</h1>
              <p className="text-gray-500 mt-2">
                Hoogste e1RM, sets, reps en BW per week.
              </p>
            </div>

            <div className="min-w-[280px]">
              <p className="text-xs font-black text-gray-500 uppercase mb-1">
                Atleet
              </p>

              <select
                value={selectedAthleteId}
                onChange={(e) => setSelectedAthleteId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none text-black shadow"
              >
                {athleteOptions.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={loadStatisticsData}
              className="bg-black text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition"
            >
              Ververs
            </button>
          </div>

          {loading && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow p-6 text-gray-500">
              Data laden...
            </div>
          )}

          {!loading && errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-5">
                {renderLiftChart("Squat", "squat")}
                {renderLiftChart("Bench", "bench")}
                {renderLiftChart("Deadlift", "deadlift")}
              </div>

              <div className="mb-5">{renderBwChart()}</div>

              <div className="mb-5">
                <h2 className="text-2xl font-black text-black mb-3">
                  Sets per oefening
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  {getVolumeExerciseKeys().map((exerciseGroup) =>
                    renderSingleExerciseVolumeChart(exerciseGroup, "sets"),
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-black text-black mb-3">
                  Reps per oefening
                </h2>
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                  {getVolumeExerciseKeys().map((exerciseGroup) =>
                    renderSingleExerciseVolumeChart(exerciseGroup, "reps"),
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
