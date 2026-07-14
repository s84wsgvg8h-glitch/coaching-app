"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppSidebar from "@/components/AppSidebar";
import { supabase } from "@/lib/supabaseClient";
import {
  loadProgramHierarchy,
  type AthleteDayCheckin,
  type AthleteExerciseSet,
  type ProgramBlock,
  type ProgramDay,
  type ProgramExercise,
  type ProgramWeek,
} from "@/lib/programData";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type AthleteExerciseNote = {
  id?: string;
  program_exercise_id: string;
  athlete_id: string;
  notes: string | null;
};

type RawExerciseRow = {
  exercise: ProgramExercise;
  setRows: AthleteExerciseSet[];
  athleteNote: string;
};

type RawDay = {
  day: ProgramDay;
  checkin: AthleteDayCheckin | null;
  exercises: RawExerciseRow[];
};

type RawWeek = {
  week: ProgramWeek;
  block: ProgramBlock;
  athleteName: string;
  days: RawDay[];
};

type RawBlock = {
  block: ProgramBlock;
  athleteName: string;
  weeks: RawWeek[];
};

type ViewMode = "all" | "week" | "progression";

export default function RawDataView({
  embeddedInUnifiedPage = false,
}: {
  embeddedInUnifiedPage?: boolean;
}) {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-app-muted">
          Data laden...
        </div>
      }
    >
      <RawDataPageContent embeddedInUnifiedPage={embeddedInUnifiedPage} />
    </Suspense>
  );
}

function RawDataPageContent({
  embeddedInUnifiedPage = false,
}: {
  embeddedInUnifiedPage?: boolean;
}) {
  const searchParams = useSearchParams();
  const embeddedAthleteId = searchParams.get("athlete") || "";
  const embeddedInChat = searchParams.get("embedded") === "chat";
  const compactShell = embeddedInChat || embeddedInUnifiedPage;

  const [loading, setLoading] = useState(true);
  const [rawBlocks, setRawBlocks] = useState<RawBlock[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [disabledExerciseNames, setDisabledExerciseNames] = useState<string[]>([]);
  const [disabledDayKeys, setDisabledDayKeys] = useState<string[]>([]);
  const [showNotes, setShowNotes] = useState(true);

  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [leftSelection, setLeftSelection] = useState("");
  const [rightSelection, setRightSelection] = useState("");
  const [selectedProgressionBlockId, setSelectedProgressionBlockId] = useState("");

  useEffect(() => {
    deferEffectUpdate(() => {
      void loadRawData();
    });
  }, []);

  const athleteOptions = useMemo(() => {
    const uniqueAthletes: Record<string, string> = {};

    rawBlocks.forEach((rawBlock) => {
      if (rawBlock.block.athlete_id) {
        uniqueAthletes[rawBlock.block.athlete_id] = rawBlock.athleteName;
      }
    });

    return Object.entries(uniqueAthletes)
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rawBlocks]);

  useEffect(() => {
    if (!embeddedAthleteId) return;

    deferEffectUpdate(() => {
      setSelectedAthleteId(embeddedAthleteId);
    });
  }, [embeddedAthleteId]);

  useEffect(() => {
    if (athleteOptions.length === 0) return;
    if (embeddedAthleteId) return;

    const savedAthleteId =
      typeof window !== "undefined"
        ? window.localStorage.getItem("rawDataSelectedAthleteId") || ""
        : "";

    const savedAthleteStillExists = athleteOptions.some(
      (athlete) => athlete.id === savedAthleteId,
    );

    if (!selectedAthleteId) {
      deferEffectUpdate(() => {
        setSelectedAthleteId(
          savedAthleteStillExists ? savedAthleteId : athleteOptions[0].id,
        );
      });
      return;
    }

    const currentAthleteStillExists = athleteOptions.some(
      (athlete) => athlete.id === selectedAthleteId,
    );

    if (!currentAthleteStillExists) {
      deferEffectUpdate(() => {
        setSelectedAthleteId(athleteOptions[0].id);
      });
    }
  }, [athleteOptions, selectedAthleteId]);

  useEffect(() => {
    if (!selectedAthleteId || typeof window === "undefined") return;
    if (embeddedInChat) return;

    window.localStorage.setItem("rawDataSelectedAthleteId", selectedAthleteId);
  }, [selectedAthleteId, embeddedInChat]);

  const filteredRawBlocks = useMemo(() => {
    if (!selectedAthleteId) return [];

    return rawBlocks.filter(
      (rawBlock) => rawBlock.block.athlete_id === selectedAthleteId,
    );
  }, [rawBlocks, selectedAthleteId]);

  const allWeeks = useMemo(() => {
    return filteredRawBlocks.flatMap((rawBlock) => rawBlock.weeks);
  }, [filteredRawBlocks]);

  const allDays = useMemo(() => {
    return allWeeks.flatMap((rawWeek) =>
      rawWeek.days.map((rawDay) => ({
        rawDay,
        rawWeek,
      })),
    );
  }, [allWeeks]);

  useEffect(() => {
    deferEffectUpdate(() => {
      setLeftSelection("");
      setRightSelection("");
      setDisabledExerciseNames([]);
      setDisabledDayKeys([]);
      setSelectedProgressionBlockId("");
    });
  }, [selectedAthleteId]);

  useEffect(() => {
    if (viewMode === "week") {
      deferEffectUpdate(() => {
        if (!leftSelection && allWeeks[0]) setLeftSelection(allWeeks[0].week.id);
        if (!rightSelection && allWeeks[1]) setRightSelection(allWeeks[1].week.id);
      });
    }
  }, [viewMode, allWeeks, leftSelection, rightSelection]);

  useEffect(() => {
    deferEffectUpdate(() => {
      setDisabledExerciseNames([]);
      setDisabledDayKeys([]);
    });
  }, [leftSelection, rightSelection, viewMode]);

  useEffect(() => {
    if (viewMode !== "progression") return;
    if (selectedProgressionBlockId) return;
    if (filteredRawBlocks[0]) {
      deferEffectUpdate(() => {
        setSelectedProgressionBlockId(filteredRawBlocks[0].block.id);
      });
    }
  }, [viewMode, filteredRawBlocks, selectedProgressionBlockId]);

  function switchMode(mode: ViewMode) {
    setViewMode(mode);
    setLeftSelection("");
    setRightSelection("");
    setDisabledExerciseNames([]);
    setDisabledDayKeys([]);

    if (mode !== "progression") {
      setSelectedProgressionBlockId("");
    }
  }

  async function loadRawData() {
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
      setLoading(false);
      setErrorMessage(profileError.message);
      return;
    }

    const role = profile?.role || "";

    const { data: hierarchy, error: hierarchyError } = await loadProgramHierarchy({
      userId: user.id,
      role,
    });

    if (hierarchyError || !hierarchy) {
      setLoading(false);
      setErrorMessage(hierarchyError || "Kon programmagegevens niet laden");
      return;
    }

    const {
      blocks,
      weeks,
      days,
      exercises,
      sets: setRowsData,
      checkins: dayCheckinsData,
      athleteNames: athleteNameById,
    } = hierarchy;

    const athleteIds = Array.from(
      new Set(blocks.map((block) => block.athlete_id).filter(Boolean)),
    ) as string[];

    if (blocks.length === 0) {
      setRawBlocks([]);
      setLoading(false);
      return;
    }

    const exerciseIds = exercises.map((exercise) => exercise.id);

    const { data: athleteNotesData, error: athleteNotesError } =
      exerciseIds.length > 0 && athleteIds.length > 0
        ? await supabase
            .from("athlete_exercise_notes")
            .select("*")
            .in("athlete_id", athleteIds)
            .in("program_exercise_id", exerciseIds)
        : { data: [], error: null };

    if (athleteNotesError) {
      setLoading(false);
      setErrorMessage(athleteNotesError.message);
      return;
    }

    const weeksByBlock: Record<string, ProgramWeek[]> = {};
    const daysByWeek: Record<string, ProgramDay[]> = {};
    const exercisesByDay: Record<string, ProgramExercise[]> = {};
    const setsByExercise: Record<string, AthleteExerciseSet[]> = {};
    const athleteNotesByExercise: Record<string, AthleteExerciseNote[]> = {};
    const dayCheckinsByDay: Record<string, AthleteDayCheckin[]> = {};

    blocks.forEach((block) => {
      weeksByBlock[block.id] = [];
    });

    weeks.forEach((week) => {
      if (!weeksByBlock[week.program_block_id]) weeksByBlock[week.program_block_id] = [];
      weeksByBlock[week.program_block_id].push(week);
      daysByWeek[week.id] = [];
    });

    days.forEach((day) => {
      if (!daysByWeek[day.program_week_id]) daysByWeek[day.program_week_id] = [];
      daysByWeek[day.program_week_id].push(day);
      exercisesByDay[day.id] = [];
      dayCheckinsByDay[day.id] = [];
    });

    exercises.forEach((exercise) => {
      if (!exercisesByDay[exercise.program_day_id]) exercisesByDay[exercise.program_day_id] = [];
      exercisesByDay[exercise.program_day_id].push(exercise);
      setsByExercise[exercise.id] = [];
      athleteNotesByExercise[exercise.id] = [];
    });

    (setRowsData || []).forEach((row: AthleteExerciseSet) => {
      if (!setsByExercise[row.program_exercise_id]) setsByExercise[row.program_exercise_id] = [];
      setsByExercise[row.program_exercise_id].push(row);
    });

    (athleteNotesData || []).forEach((note: AthleteExerciseNote) => {
      if (!athleteNotesByExercise[note.program_exercise_id]) {
        athleteNotesByExercise[note.program_exercise_id] = [];
      }

      athleteNotesByExercise[note.program_exercise_id].push(note);
    });

    (dayCheckinsData || []).forEach((checkin: AthleteDayCheckin) => {
      if (!dayCheckinsByDay[checkin.program_day_id]) {
        dayCheckinsByDay[checkin.program_day_id] = [];
      }

      dayCheckinsByDay[checkin.program_day_id].push(checkin);
    });

    const blockById: Record<string, ProgramBlock> = {};
    blocks.forEach((block) => {
      blockById[block.id] = block;
    });

    const builtBlocks: RawBlock[] = blocks.map((block) => {
      const athleteName =
        block.athlete_id && athleteNameById[block.athlete_id]
          ? athleteNameById[block.athlete_id]
          : "Geen atleet";

      return {
        block,
        athleteName,
        weeks: (weeksByBlock[block.id] || []).map((week) => ({
          week,
          block,
          athleteName,
          days: (daysByWeek[week.id] || []).map((day) => {
            const dayCheckin =
              (dayCheckinsByDay[day.id] || []).find(
                (checkin) =>
                  !block.athlete_id || checkin.athlete_id === block.athlete_id,
              ) || null;

            return {
              day,
              checkin: dayCheckin,
              exercises: (exercisesByDay[day.id] || []).map((exercise) => {
              const notes = athleteNotesByExercise[exercise.id] || [];
              const athleteNoteText = notes
                .filter(
                  (note) =>
                    !block.athlete_id || note.athlete_id === block.athlete_id,
                )
                .map((note) => note.notes || "")
                .filter((note) => note.trim())
                .join(" | ");

              return {
                exercise,
                setRows: (setsByExercise[exercise.id] || []).filter(
                  (setRow) =>
                    !block.athlete_id || setRow.athlete_id === block.athlete_id,
                ),
                athleteNote: athleteNoteText,
              };
            }),
            };
          }),
        })),
      };
    });

    setRawBlocks(builtBlocks);
    setLoading(false);
  }

  function formatDate(date: string | null) {
    if (!date) return "";

    const parsedDate = new Date(date);
    const day = parsedDate.getDate();
    const month = parsedDate.toLocaleDateString("nl-NL", { month: "long" });
    const year = String(parsedDate.getFullYear()).slice(-2);

    return `${day} ${month} '${year}`;
  }

  function parseNumberValue(value: string | null | undefined) {
    if (!value) return null;

    const cleanValue = value.toString().replace(",", ".").trim();
    const match = cleanValue.match(/-?\d+(\.\d+)?/);

    if (!match) return null;

    const numberValue = Number(match[0]);
    return Number.isFinite(numberValue) ? numberValue : null;
  }

  function formatAverageValue(value: number) {
    const roundedValue = Math.round(value * 10) / 10;

    if (Number.isInteger(roundedValue)) return String(roundedValue);

    return roundedValue.toFixed(1).replace(".", ",");
  }

  function getAverageFromRows(
    rows: AthleteExerciseSet[],
    field: "reps" | "weight" | "rpe",
  ) {
    const values = rows
      .map((row) => parseNumberValue(row[field]))
      .filter((value): value is number => value !== null);

    if (values.length === 0) return "-";

    const average =
      values.reduce((total, value) => total + value, 0) / values.length;

    return formatAverageValue(average);
  }

  function getDisplayReps(exercise: ProgramExercise, rows: AthleteExerciseSet[]) {
    const athleteAverage = getAverageFromRows(rows, "reps");

    if (athleteAverage !== "-") return athleteAverage;

    return (exercise.reps || "").trim() || "-";
  }

  function getDisplayRpe(exercise: ProgramExercise, rows: AthleteExerciseSet[]) {
    const athleteAverage = getAverageFromRows(rows, "rpe");

    if (athleteAverage !== "-") return athleteAverage;

    return (exercise.rpe || "").trim() || "-";
  }

  function getDisplayWeight(exercise: ProgramExercise, rows: AthleteExerciseSet[]) {
    const athleteAverage = getAverageFromRows(rows, "weight");

    if (athleteAverage !== "-") return athleteAverage;

    const load = (exercise.load || "").trim();

    if (!load) return "-";
    if (load.includes("%")) return load;
    if (load.toLowerCase().includes("kg")) {
      return load.replace("KG", "").replace("kg", "").trim() || "-";
    }

    return load;
  }

  function getProgramLoad(exercise: ProgramExercise) {
    const load = (exercise.load || "").trim();
    const rpe = (exercise.rpe || "").trim();

    if (load) {
      if (load.toLowerCase().includes("kg")) return load.replace("KG", "kg");
      if (load.includes("%")) return load;
      return `${load}kg`;
    }

    if (rpe) return `RPE ${rpe}`;

    return "-";
  }

  function getExercisePrescription(exercise: ProgramExercise) {
    const sets = (exercise.sets || "").trim();
    const reps = (exercise.reps || "").trim();

    if (sets && reps) return `${sets}x${reps}`;
    if (sets) return sets;
    if (reps) return reps;

    return "-";
  }

  function getRawSetText(rows: AthleteExerciseSet[]) {
    if (rows.length === 0) return "-";

    return rows
      .map((row) => {
        const reps = row.reps?.trim() || "-";
        const weight = row.weight?.trim() || "-";
        const rpe = row.rpe?.trim() || "-";

        return `S${row.set_number}: ${reps}/${weight}kg/RPE${rpe}`;
      })
      .join(" | ");
  }

  function getDayLabel(item: { rawDay: RawDay; rawWeek: RawWeek }) {
    return `${item.rawWeek.block.title} · ${item.rawWeek.week.title} · ${item.rawDay.day.title}`;
  }

  function getWeekLabel(rawWeek: RawWeek) {
    return `${rawWeek.block.title} · ${rawWeek.week.title}`;
  }

  function getSelectedDay(dayId: string) {
    return allDays.find((item) => item.rawDay.day.id === dayId) || null;
  }

  function getSelectedWeek(weekId: string) {
    return allWeeks.find((rawWeek) => rawWeek.week.id === weekId) || null;
  }

  function getSetCount(exercise: ProgramExercise) {
    const rawSets = (exercise.sets || "").trim();
    const match = rawSets.match(/\d+/);

    if (!match) return 1;

    const count = Number(match[0]);

    if (!Number.isFinite(count) || count < 1) return 1;
    if (count > 20) return 20;

    return count;
  }

  function getRowTimestamp(row: AthleteExerciseSet) {
    const value = row.updated_at || row.created_at || "";
    const timestamp = value ? new Date(value).getTime() : 0;
    return Number.isFinite(timestamp) ? timestamp : 0;
  }

  function getLatestRowsBySetNumber(rows: AthleteExerciseSet[]) {
    const latestRows: Record<number, AthleteExerciseSet> = {};

    rows.forEach((row) => {
      const currentRow = latestRows[row.set_number];

      if (!currentRow || getRowTimestamp(row) >= getRowTimestamp(currentRow)) {
        latestRows[row.set_number] = row;
      }
    });

    return Object.values(latestRows).sort((a, b) => a.set_number - b.set_number);
  }

  function buildDisplaySetRows(row: RawExerciseRow) {
    const enteredRows = getLatestRowsBySetNumber(row.setRows);
    const setCount = Math.max(getSetCount(row.exercise), enteredRows.length, 1);

    return Array.from({ length: setCount }, (_, index) => {
      const setNumber = index + 1;
      const enteredRow = enteredRows.find((item) => item.set_number === setNumber);

      return {
        program_exercise_id: row.exercise.id,
        athlete_id: enteredRow?.athlete_id || "",
        set_number: setNumber,
        reps: enteredRow?.reps || "",
        weight: enteredRow?.weight || "",
        rpe: enteredRow?.rpe || "",
      } as AthleteExerciseSet;
    });
  }

  function getDisplaySetReps(exercise: ProgramExercise, row: AthleteExerciseSet) {
    return row.reps?.trim() || exercise.reps?.trim() || "-";
  }

  function getDisplaySetWeight(exercise: ProgramExercise, row: AthleteExerciseSet) {
    const athleteWeight = row.weight?.trim();

    if (athleteWeight) return athleteWeight;

    const load = exercise.load?.trim() || "";

    if (!load) return "-";
    if (load.includes("%")) return load;
    if (load.toLowerCase().includes("kg")) {
      return load.replace("KG", "").replace("kg", "").trim() || "-";
    }

    return load;
  }

  function getDisplaySetRpe(exercise: ProgramExercise, row: AthleteExerciseSet) {
    return row.rpe?.trim() || exercise.rpe?.trim() || "-";
  }

  function getEstimatedOneRepMaxNumber(
    exercise: ProgramExercise,
    row: AthleteExerciseSet,
  ) {
    const weightValue = getDisplaySetWeight(exercise, row);
    const repsValue = getDisplaySetReps(exercise, row);

    if (!weightValue || weightValue === "-" || weightValue.includes("%")) {
      return null;
    }

    const weight = parseNumberValue(weightValue);
    const reps = parseNumberValue(repsValue);

    if (weight === null || reps === null || weight <= 0 || reps <= 0) {
      return null;
    }

    // Brzycki formula — rounded to whole number
    const denominator = 1.0278 - 0.0278 * reps;
    if (denominator <= 0) return null;
    return Math.round(weight / denominator);
  }

  function getEstimatedOneRepMax(exercise: ProgramExercise, row: AthleteExerciseSet) {
    const e1rm = getEstimatedOneRepMaxNumber(exercise, row);

    if (e1rm === null) return "-";

    return `${formatAverageValue(e1rm)}kg`;
  }

  function getSetTonnage(exercise: ProgramExercise, row: AthleteExerciseSet) {
    const weightValue = getDisplaySetWeight(exercise, row);
    const repsValue = getDisplaySetReps(exercise, row);

    if (!weightValue || weightValue === "-" || weightValue.includes("%")) {
      return "-";
    }

    const weight = parseNumberValue(weightValue);
    const reps = parseNumberValue(repsValue);

    if (weight === null || reps === null || weight <= 0 || reps <= 0) {
      return "-";
    }

    return `${formatAverageValue(weight * reps)}kg`;
  }

  function getSetIntensity(exercise: ProgramExercise, row: AthleteExerciseSet) {
    const weightValue = getDisplaySetWeight(exercise, row);

    if (!weightValue || weightValue === "-" || weightValue.includes("%")) {
      return "-";
    }

    const weight = parseNumberValue(weightValue);
    const e1rm = getEstimatedOneRepMaxNumber(exercise, row);

    if (weight === null || e1rm === null || weight <= 0 || e1rm <= 0) {
      return "-";
    }

    return `${formatAverageValue((weight / e1rm) * 100)}%`;
  }

  function renderExerciseRows(exercises: RawExerciseRow[]) {
    const visibleExercises = filterExercisesForView(exercises);
    const displayRows = visibleExercises.flatMap((row) =>
      buildDisplaySetRows(row).map((setRow) => ({
        rawRow: row,
        setRow,
      })),
    );

    if (displayRows.length === 0) {
      return (
        <div className="bg-app-surface-muted rounded-xl p-3 text-xs text-app-muted">
          Geen oefeningen.
        </div>
      );
    }

    const gridColumns = showNotes
      ? "grid-cols-[1.25fr_0.3fr_0.45fr_0.55fr_0.5fr_0.6fr_1.05fr_1fr_0.7fr_0.75fr]"
      : "grid-cols-[1.35fr_0.35fr_0.5fr_0.6fr_0.55fr_0.65fr]";

    return (
      <div className="overflow-visible">
        <div className="w-full">
          <div
            className={`grid ${gridColumns} gap-2 px-2 py-1.5 bg-app-surface-hover rounded-lg text-[10px] font-black text-app-muted uppercase leading-none`}
          >
            <div>Oefening</div>
            <div>Set</div>
            <div>Reps</div>
            <div>Kg / Load</div>
            <div>RPE</div>
            <div>e1RM</div>
            {showNotes && <div>Athlete notes</div>}
            {showNotes && <div>Coach notes</div>}
            {showNotes && <div>Tonnage</div>}
            {showNotes && <div>Intensiteit</div>}
          </div>

          <div className="mt-1 space-y-1">
            {displayRows.map(({ rawRow, setRow }) => {
              const { exercise, athleteNote } = rawRow;

              return (
                <div
                  key={`${exercise.id}-${setRow.set_number}`}
                  className={`grid ${gridColumns} gap-2 px-2 py-1.5 bg-app-surface-muted border border-app-border rounded-lg text-[12px] leading-tight text-black items-start`}
                >
                  <div className="font-bold break-words">
                    {exercise.name || "Oefening"}
                  </div>

                  <div>1</div>
                  <div>{getDisplaySetReps(exercise, setRow)}</div>
                  <div>{getDisplaySetWeight(exercise, setRow)}</div>
                  <div>{getDisplaySetRpe(exercise, setRow)}</div>
                  <div>{getEstimatedOneRepMax(exercise, setRow)}</div>

                  {showNotes && (
                    <div className="text-[11px] leading-tight text-app-text whitespace-pre-wrap">
                      {athleteNote || "-"}
                    </div>
                  )}

                  {showNotes && (
                    <div className="text-[11px] leading-tight text-app-text whitespace-pre-wrap">
                      {exercise.notes?.trim() || "-"}
                    </div>
                  )}

                  {showNotes && (
                    <div className="text-[11px] leading-tight text-app-text font-bold">
                      {getSetTonnage(exercise, setRow)}
                    </div>
                  )}

                  {showNotes && (
                    <div className="text-[11px] leading-tight text-app-text font-bold">
                      {getSetIntensity(exercise, setRow)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  function renderDayCard(rawDay: RawDay, rawWeek: RawWeek) {
    if (!dayIsVisible(rawDay)) return null;
    if (filterExercisesForView(rawDay.exercises).length === 0) return null;

    return (
      <div className="bg-app-surface rounded-2xl border border-app-border shadow p-4 w-full">
        <div className="mb-3">
          <p className="text-xs text-app-muted font-semibold">
            {rawWeek.athleteName} · {rawWeek.block.title} · {rawWeek.week.title}
          </p>
          <h3 className="text-xl font-black text-app-text">{rawDay.day.title}</h3>
        </div>

        {showNotes && rawDay.day.warmup?.trim() && (
          <div className="mb-2 bg-blue-50 border border-blue-200 rounded-xl p-2">
            <p className="text-[10px] font-black text-blue-700 uppercase">
              Warmup
            </p>
            <p className="text-xs text-blue-950 whitespace-pre-wrap">
              {rawDay.day.warmup}
            </p>
          </div>
        )}

        {showNotes && rawDay.day.notes?.trim() && (
          <div className="mb-2 bg-yellow-50 border border-yellow-200 rounded-xl p-2">
            <p className="text-[10px] font-black text-yellow-700 uppercase">
              Dag notes
            </p>
            <p className="text-xs text-yellow-950 whitespace-pre-wrap">
              {rawDay.day.notes}
            </p>
          </div>
        )}

        {renderExerciseRows(rawDay.exercises)}
      </div>
    );
  }

  function renderWeekCard(rawWeek: RawWeek) {
    const visibleDays = rawWeek.days.filter(
      (rawDay) =>
        dayIsVisible(rawDay) &&
        filterExercisesForView(rawDay.exercises).length > 0,
    );

    if (visibleDays.length === 0) {
      return (
        <div className="bg-app-surface rounded-2xl border border-app-border shadow p-4 w-full">
          <div className="mb-4">
            <p className="text-xs text-app-muted font-semibold">
              {rawWeek.block.title}
            </p>
            <h3 className="text-xl font-black text-app-text">{rawWeek.week.title}</h3>
          </div>

          <div className="bg-app-surface-muted rounded-xl p-3 text-xs text-app-muted">
            Geen dagen met deze oefening(en).
          </div>
        </div>
      );
    }

    return (
      <div className="bg-app-surface rounded-2xl border border-app-border shadow p-4 w-full">
        <div className="mb-4">
          <p className="text-xs text-app-muted font-semibold">
            {rawWeek.athleteName} · {rawWeek.block.title}
            {rawWeek.block.start_date
              ? ` · start ${formatDate(rawWeek.block.start_date)}`
              : ""}
          </p>
          <h3 className="text-xl font-black text-app-text">{rawWeek.week.title}</h3>
        </div>

        {visibleDays.length === 0 ? (
          <div className="bg-app-surface-muted rounded-xl p-3 text-xs text-app-muted">
            Geen dagen in deze week.
          </div>
        ) : (
          <div className="space-y-4">
            {visibleDays.map((rawDay) => (
              <div key={rawDay.day.id}>
                <h4 className="text-base font-black text-black mb-2">
                  {rawDay.day.title}
                </h4>

                {renderExerciseRows(rawDay.exercises)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }



  function getProgressionBlock() {
    if (!selectedProgressionBlockId) return filteredRawBlocks[0] || null;

    return (
      filteredRawBlocks.find(
        (rawBlock) => rawBlock.block.id === selectedProgressionBlockId,
      ) || filteredRawBlocks[0] || null
    );
  }

  function normalizeProgressionExerciseName(name: string | null | undefined) {
    return (name || "").trim().toLowerCase();
  }

  function formatProgressionNumber(value: number) {
    const rounded = Math.round(value * 10) / 10;

    if (Number.isInteger(rounded)) return String(rounded);

    return String(rounded).replace(".", ",");
  }

  function parseProgressionNumber(value: string | null | undefined) {
    if (!value || value === "-") return null;

    const cleanValue = value
      .replace("kg", "")
      .replace("KG", "")
      .replace("%", "")
      .replace(",", ".")
      .trim();

    const parsedValue = Number(cleanValue);

    return Number.isFinite(parsedValue) ? parsedValue : null;
  }

  function getCoachRepsNumber(exercise: ProgramExercise) {
    return parseProgressionNumber(exercise.reps);
  }

  function getCoachRpeNumber(exercise: ProgramExercise) {
    return parseProgressionNumber(exercise.rpe);
  }

  function getAverageOrFallback(
    athleteValues: Array<string | null | undefined>,
    fallbackValue: number | null,
  ) {
    const parsedValues = athleteValues
      .map((value) => parseProgressionNumber(value))
      .filter((value): value is number => value !== null);

    if (parsedValues.length > 0) {
      return formatProgressionNumber(
        parsedValues.reduce((total, value) => total + value, 0) /
          parsedValues.length,
      );
    }

    if (fallbackValue !== null) {
      return formatProgressionNumber(fallbackValue);
    }

    return "-";
  }

  function getAverageWeightText(row: RawExerciseRow, setRows: AthleteExerciseSet[]) {
    const athleteWeightValues = setRows
      .map((setRow) => parseProgressionNumber(setRow.weight))
      .filter((value): value is number => value !== null);

    if (athleteWeightValues.length > 0) {
      return formatProgressionNumber(
        athleteWeightValues.reduce((total, value) => total + value, 0) /
          athleteWeightValues.length,
      );
    }

    const coachLoad = (row.exercise.load || "").trim();

    if (!coachLoad) return "-";

    const coachLoadNumber = parseProgressionNumber(coachLoad);

    if (coachLoadNumber === null) return "-";

    if (coachLoad.includes("%")) {
      return `${formatProgressionNumber(coachLoadNumber)}%`;
    }

    return formatProgressionNumber(coachLoadNumber);
  }

  function getProgressionCellText(rows: RawExerciseRow[]) {
    if (rows.length === 0) return "—";

    return rows
      .map((row) => {
        const setRows = buildDisplaySetRows(row);

        const averageWeight = getAverageWeightText(row, setRows);

        const averageReps = getAverageOrFallback(
          setRows.map((setRow) => setRow.reps),
          getCoachRepsNumber(row.exercise),
        );

        const averageRpe = getAverageOrFallback(
          setRows.map((setRow) => setRow.rpe),
          getCoachRpeNumber(row.exercise),
        );

        const weightText =
          averageWeight === "-"
            ? "-"
            : averageWeight.includes("%")
              ? averageWeight
              : `${averageWeight}kg`;

        const repsText = averageReps === "-" ? "-" : averageReps;
        const rpeText = averageRpe === "-" ? "-" : averageRpe;

        return `${weightText} x ${repsText} rpe ${rpeText}`;
      })
      .join("\n");
  }

  function getDayShortName(dayTitle: string | null | undefined, dayNumber: number) {
    const cleanTitle = (dayTitle || "").trim().toLowerCase();

    if (cleanTitle.includes("maandag")) return "ma";
    if (cleanTitle.includes("dinsdag")) return "di";
    if (cleanTitle.includes("woensdag")) return "wo";
    if (cleanTitle.includes("donderdag")) return "do";
    if (cleanTitle.includes("vrijdag")) return "vr";
    if (cleanTitle.includes("zaterdag")) return "za";
    if (cleanTitle.includes("zondag")) return "zo";

    const byNumber = ["ma", "di", "wo", "do", "vr", "za", "zo"];
    return byNumber[Math.max(0, Math.min(dayNumber - 1, 6))] || `d${dayNumber}`;
  }

  function getProgressionExercisePrescription(row: RawExerciseRow) {
    const sets = (row.exercise.sets || "").trim();
    const reps = (row.exercise.reps || "").trim();

    if (sets && reps) return `${sets}x${reps}`;
    if (sets) return sets;
    if (reps) return reps;

    const displaySets = Math.max(getSetCount(row.exercise), row.setRows.length, 1);
    const displayReps = getDisplaySetReps(
      row.exercise,
      buildDisplaySetRows(row)[0],
    );

    if (displayReps && displayReps !== "-") return `${displaySets}x${displayReps}`;

    return `${displaySets}x-`;
  }

  function getProgressionGroupPriority(name: string) {
    const cleanName = name.toLowerCase();

    if (cleanName.includes("squat")) return 1;
    if (cleanName.includes("bench")) return 2;
    if (cleanName.includes("deadlift")) return 3;

    return 4;
  }

  function buildProgressionRows(rawBlock: RawBlock) {
    type ProgressionRow = {
      key: string;
      name: string;
      baseName: string;
      dayShort: string;
      dayNumber: number;
      exerciseNumber: number;
      prescription: string;
      cells: Record<string, RawExerciseRow[]>;
    };

    const rowMap = new Map<string, ProgressionRow>();

    rawBlock.weeks.forEach((rawWeek) => {
      rawWeek.days.forEach((rawDay) => {
        rawDay.exercises.forEach((row, exerciseIndex) => {
          const baseName = row.exercise.name || "Oefening";
          const cleanName = normalizeProgressionExerciseName(baseName);

          if (!cleanName) return;

          const dayShort = getDayShortName(rawDay.day.title, rawDay.day.day_number);
          const exerciseNumber =
            row.exercise.exercise_number || exerciseIndex + 1;
          const prescription = getProgressionExercisePrescription(row);

          /*
            Belangrijk:
            De key bevat dag + volgorde + voorschrift + exercise_number.
            Meerdere rijen met hetzelfde voorschrift (bijv. drie 1x2 bench)
            blijven apart; varianten met ander voorschrift ook (1x3 vs 4x5).
          */
          const key = [
            cleanName,
            rawDay.day.day_number,
            prescription.toLowerCase(),
            String(exerciseNumber),
          ].join("__");

          if (!rowMap.has(key)) {
            rowMap.set(key, {
              key,
              name: `${baseName} ${dayShort} ${prescription}`,
              baseName,
              dayShort,
              dayNumber: rawDay.day.day_number,
              exerciseNumber,
              prescription,
              cells: {},
            });
          }

          const item = rowMap.get(key)!;
          item.exerciseNumber = Math.min(item.exerciseNumber, exerciseNumber);

          if (!item.cells[rawWeek.week.id]) {
            item.cells[rawWeek.week.id] = [];
          }

          item.cells[rawWeek.week.id].push(row);
        });
      });
    });

    return Array.from(rowMap.values()).sort((a, b) => {
      const priorityA = getProgressionGroupPriority(a.baseName);
      const priorityB = getProgressionGroupPriority(b.baseName);

      if (priorityA !== priorityB) return priorityA - priorityB;

      if (priorityA === 4) {
        const nameCompare = a.baseName.localeCompare(b.baseName);
        if (nameCompare !== 0) return nameCompare;
      }

      if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
      if (a.exerciseNumber !== b.exerciseNumber) {
        return a.exerciseNumber - b.exerciseNumber;
      }

      return a.prescription.localeCompare(b.prescription);
    });
  }

  function getProgressionExerciseColorClass(exerciseName: string) {
    const cleanName = exerciseName.toLowerCase();

    if (cleanName.includes("squat")) {
      return "border-l-[#6fa8dc]";
    }

    if (
      cleanName.includes("benchpress") ||
      cleanName.includes("bench press") ||
      cleanName.includes("bench")
    ) {
      return "border-l-[#9fc5e8]";
    }

    if (cleanName.includes("deadlift")) {
      return "border-l-[#cfe2f3]";
    }

    return "border-l-gray-300";
  }

  function renderProgressionView() {
    const rawBlock = getProgressionBlock();

    if (!rawBlock) {
      return (
        <div className="bg-app-surface rounded-2xl border border-app-border shadow p-6 text-app-muted">
          Geen block gevonden voor deze atleet.
        </div>
      );
    }

    const progressionRows = buildProgressionRows(rawBlock);
    const weeks = rawBlock.weeks;
    const compact = embeddedInChat;
    const exerciseColumnWidth = compact ? 88 : 320;
    const weekColumnWidth = compact ? 52 : 240;
    const gridMinWidth = exerciseColumnWidth + weeks.length * weekColumnWidth;

    return (
      <div className={compact ? "space-y-3" : "space-y-5"}>
        <div
          className={`bg-app-surface rounded-2xl border border-app-border shadow ${
            compact ? "p-2.5" : "p-4"
          }`}
        >
          <p
            className={`font-black text-app-muted uppercase ${
              compact ? "mb-1.5 text-[10px]" : "mb-2 text-xs"
            }`}
          >
            Kies block
          </p>

          <div className={`flex flex-wrap ${compact ? "gap-1.5" : "gap-2"}`}>
            {filteredRawBlocks.map((blockItem) => {
              const active = blockItem.block.id === rawBlock.block.id;

              return (
                <button
                  key={blockItem.block.id}
                  type="button"
                  onClick={() => setSelectedProgressionBlockId(blockItem.block.id)}
                  className={`rounded-xl font-bold border transition ${
                    compact ? "px-2.5 py-1 text-[11px]" : "px-4 py-2 text-sm"
                  } ${
                    active
                      ? "bg-black text-white border-black"
                      : "bg-app-surface-muted text-app-text border-app-border hover:border-black"
                  }`}
                >
                  {blockItem.block.title || "Block"}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-app-surface rounded-3xl border border-app-border shadow overflow-hidden">
          <div
            className={`border-b border-app-border ${compact ? "p-3" : "p-5"}`}
          >
            <h2
              className={`font-black text-black ${
                compact ? "text-base" : "text-2xl"
              }`}
            >
              {rawBlock.block.title || "Block"}
            </h2>

            <p
              className={`text-app-muted ${compact ? "mt-0.5 text-[11px]" : "mt-1 text-sm"}`}
            >
              {rawBlock.athleteName}
              {rawBlock.block.start_date
                ? ` · start ${formatDate(rawBlock.block.start_date)}`
                : ""}
            </p>
          </div>

          {weeks.length === 0 || progressionRows.length === 0 ? (
            <div
              className={`text-app-muted ${compact ? "p-3 text-xs" : "p-5 text-sm"}`}
            >
              Geen progression data gevonden in dit block.
            </div>
          ) : (
            <div
              className={`overflow-auto ${
                compact
                  ? "max-h-[calc(100vh-210px)]"
                  : "max-h-[calc(100vh-320px)]"
              }`}
            >
              <div
                className="grid"
                style={{
                  minWidth: `${gridMinWidth}px`,
                  gridTemplateColumns: `${exerciseColumnWidth}px repeat(${weeks.length}, minmax(${weekColumnWidth}px, 1fr))`,
                }}
              >
                <div
                  className={`sticky top-0 left-0 z-30 bg-app-surface-hover border-b border-r border-gray-300 font-black text-app-muted uppercase ${
                    compact
                      ? "px-1 py-1 text-[9px] leading-tight"
                      : "p-3 text-xs"
                  }`}
                >
                  Oefening
                </div>

                {weeks.map((rawWeek) => (
                  <div
                    key={rawWeek.week.id}
                    className={`sticky top-0 z-20 bg-app-surface-hover border-b border-r border-gray-300 font-black text-app-muted uppercase ${
                      compact
                        ? "px-1 py-1 text-[9px] leading-tight"
                        : "p-3 text-xs"
                    }`}
                  >
                    {rawWeek.week.title || `Week ${rawWeek.week.week_number}`}
                  </div>
                ))}

                {progressionRows.map((row, rowIndex) => (
                  <div key={row.key} className="contents">
                    <div
                      className={`sticky left-0 z-10 border-r border-b border-app-border border-l-4 ${getProgressionExerciseColorClass(
                        row.baseName,
                      )} font-black text-black ${
                        compact
                          ? "px-1 py-1 text-[10px] leading-tight"
                          : "p-3 text-sm"
                      } ${rowIndex % 2 === 0 ? "bg-app-surface" : "bg-gray-50"}`}
                    >
                      {row.name}
                    </div>

                    {weeks.map((rawWeek) => {
                      const rows = row.cells[rawWeek.week.id] || [];

                      return (
                        <div
                          key={`${row.key}-${rawWeek.week.id}`}
                          className={`border-r border-b border-app-border leading-tight whitespace-pre-wrap ${
                            compact
                              ? "px-1 py-1 text-[9px]"
                              : "p-3 text-xs"
                          } ${
                            rowIndex % 2 === 0 ? "bg-app-surface" : "bg-gray-50"
                          } ${rows.length === 0 ? "text-app-muted" : "text-app-text"}`}
                        >
                          {getProgressionCellText(rows)}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderDayExternals(rawDay: RawDay) {
    const checkin = rawDay.checkin;

    const bw = checkin?.bw?.trim() || "-";
    const recovery =
      checkin?.recovery !== null && checkin?.recovery !== undefined
        ? checkin.recovery
        : "-";
    const fatigue =
      checkin?.fatigue !== null && checkin?.fatigue !== undefined
        ? checkin.fatigue
        : "-";
    const notes = checkin?.notes?.trim() || "-";

    return (
      <div className="mb-2 rounded-lg border border-app-border bg-app-surface-muted px-2 py-1 text-[10px] leading-tight text-app-muted">
        <span className="font-black text-gray-800">bw:</span> {bw}
        <span className="mx-1 text-gray-300">|</span>
        <span className="font-black text-gray-800">herstel:</span> {recovery}
        <span className="mx-1 text-gray-300">|</span>
        <span className="font-black text-gray-800">fatigue:</span> {fatigue}
        <span className="mx-1 text-gray-300">|</span>
        <span className="font-black text-gray-800">notes:</span> {notes}
      </div>
    );
  }

  function renderAllData() {
    return (
      <div className="space-y-10">
        {filteredRawBlocks.map((rawBlock) => (
          <div
            key={rawBlock.block.id}
            className="bg-app-surface rounded-3xl border border-app-border shadow p-6"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-black text-app-text">
                {rawBlock.block.title || "Block"}
              </h2>

              <p className="text-sm text-app-muted mt-1">
                {rawBlock.athleteName}
                {rawBlock.block.start_date
                  ? ` · start ${formatDate(rawBlock.block.start_date)}`
                  : ""}
              </p>
            </div>

            {rawBlock.weeks.length === 0 ? (
              <div className="bg-app-surface-muted rounded-2xl p-4 text-sm text-app-muted">
                Geen weken in dit block.
              </div>
            ) : (
              <div className="space-y-8">
                {rawBlock.weeks.map((rawWeek) => (
                  <div key={rawWeek.week.id} className="space-y-5">
                    <h3 className="text-xl font-black text-app-text">
                      {rawWeek.week.title || `Week ${rawWeek.week.week_number}`}
                    </h3>

                    {rawWeek.days.length === 0 ? (
                      <div className="bg-app-surface-muted rounded-2xl p-4 text-sm text-app-muted">
                        Geen dagen in deze week.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {rawWeek.days.map((rawDay) => (
                          <div key={rawDay.day.id}>
                            <h4 className="text-lg font-black text-black mb-2">
                              {rawDay.day.title || "Dag"}
                            </h4>

                            {renderDayExternals(rawDay)}

                            {showNotes && rawDay.day.warmup?.trim() && (
                              <div className="mb-2 bg-blue-50 border border-blue-200 rounded-xl p-2">
                                <p className="text-[10px] font-black text-blue-700 uppercase">
                                  Warmup
                                </p>
                                <p className="text-xs text-blue-950 whitespace-pre-wrap">
                                  {rawDay.day.warmup}
                                </p>
                              </div>
                            )}

                            {showNotes && rawDay.day.notes?.trim() && (
                              <div className="mb-2 bg-yellow-50 border border-yellow-200 rounded-xl p-2">
                                <p className="text-[10px] font-black text-yellow-700 uppercase">
                                  Dag notes
                                </p>
                                <p className="text-xs text-yellow-950 whitespace-pre-wrap">
                                  {rawDay.day.notes}
                                </p>
                              </div>
                            )}

                            {renderExerciseRows(rawDay.exercises)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }



  function normalizeExerciseName(name: string | null | undefined) {
    return (name || "").trim().toLowerCase();
  }

  function getComparableExercises() {
    if (viewMode === "all" || viewMode === "progression") return [];

    const leftExercises =
      selectedLeftWeek?.days.flatMap((rawDay) => rawDay.exercises) || [];

    const rightExercises =
      selectedRightWeek?.days.flatMap((rawDay) => rawDay.exercises) || [];

    const names = [...leftExercises, ...rightExercises]
      .map((row) => row.exercise.name || "")
      .filter((name) => name.trim());

    return Array.from(new Set(names.map((name) => name.trim()))).sort((a, b) => {
      const getExercisePriority = (name: string) => {
        const cleanName = name.toLowerCase();

        if (cleanName.includes("squat")) return 1;
        if (cleanName.includes("bench")) return 2;
        if (cleanName.includes("deadlift")) return 3;

        return 4;
      };

      const priorityA = getExercisePriority(a);
      const priorityB = getExercisePriority(b);

      if (priorityA !== priorityB) return priorityA - priorityB;

      return a.localeCompare(b);
    });
  }

  function getDayKey(rawDay: RawDay) {
    const cleanTitle = (rawDay.day.title || "").trim().toLowerCase();
    return cleanTitle || `day-${rawDay.day.day_number}`;
  }

  function getComparableDays() {
    if (viewMode === "all" || viewMode === "progression") return [];

    const leftDays = selectedLeftWeek?.days || [];
    const rightDays = selectedRightWeek?.days || [];

    const dayMap = new Map<string, string>();

    [...leftDays, ...rightDays].forEach((rawDay) => {
      dayMap.set(getDayKey(rawDay), rawDay.day.title || `Dag ${rawDay.day.day_number}`);
    });

    return Array.from(dayMap.entries())
      .map(([key, title]) => ({ key, title }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  function dayIsVisible(rawDay: RawDay) {
    if (viewMode === "all" || viewMode === "progression") return true;
    return !disabledDayKeys.includes(getDayKey(rawDay));
  }

  function exerciseIsVisible(exercise: ProgramExercise) {
    if (viewMode === "all" || viewMode === "progression") return true;

    return !disabledExerciseNames
      .map((name) => normalizeExerciseName(name))
      .includes(normalizeExerciseName(exercise.name));
  }

  function filterExercisesForView(exercises: RawExerciseRow[]) {
    return exercises.filter((row) => exerciseIsVisible(row.exercise));
  }

  function toggleExerciseFilter(name: string) {
    setDisabledExerciseNames((current) =>
      current.includes(name)
        ? current.filter((item) => item !== name)
        : [...current, name],
    );
  }

  function selectAllComparableExercises() {
    setDisabledExerciseNames([]);
  }

  function hideAllComparableExercises() {
    setDisabledExerciseNames(getComparableExercises());
  }

  function toggleDayFilter(dayKey: string) {
    setDisabledDayKeys((current) =>
      current.includes(dayKey)
        ? current.filter((item) => item !== dayKey)
        : [...current, dayKey],
    );
  }

  function selectAllComparableDays() {
    setDisabledDayKeys([]);
  }

  function hideAllComparableDays() {
    setDisabledDayKeys(getComparableDays().map((day) => day.key));
  }

  function renderDayFilterButtons() {
    if (viewMode === "all" || viewMode === "progression") return null;

    const days = getComparableDays();

    if (days.length === 0) return null;

    return (
      <div className="mt-4 border-t border-app-border pt-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-black text-app-muted uppercase">
            Dagen filteren
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllComparableDays}
              className="text-[11px] font-bold bg-app-surface-hover hover:bg-gray-200 text-black px-2 py-1 rounded-lg"
            >
              Alles aan
            </button>

            <button
              type="button"
              onClick={hideAllComparableDays}
              className="text-[11px] font-bold bg-app-surface-hover hover:bg-gray-200 text-black px-2 py-1 rounded-lg"
            >
              Alles uit
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {days.map((day) => {
            const active = !disabledDayKeys.includes(day.key);

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => toggleDayFilter(day.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  active
                    ? "bg-black text-white border-black"
                    : "bg-app-surface text-app-muted border-app-border hover:border-black"
                }`}
              >
                {day.title}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function renderExerciseFilterButtons() {
    if (viewMode === "all" || viewMode === "progression") return null;

    const exerciseNames = getComparableExercises();

    if (exerciseNames.length === 0) return null;

    return (
      <div className="mt-4 border-t border-app-border pt-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-xs font-black text-app-muted uppercase">
            Oefeningen filteren
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAllComparableExercises}
              className="text-[11px] font-bold bg-app-surface-hover hover:bg-gray-200 text-black px-2 py-1 rounded-lg"
            >
              Alles aan
            </button>

            <button
              type="button"
              onClick={hideAllComparableExercises}
              className="text-[11px] font-bold bg-app-surface-hover hover:bg-gray-200 text-black px-2 py-1 rounded-lg"
            >
              Alles uit
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {exerciseNames.map((name) => {
            const active = !disabledExerciseNames.includes(name);

            return (
              <button
                key={name}
                type="button"
                onClick={() => toggleExerciseFilter(name)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                  active
                    ? "bg-black text-white border-black"
                    : "bg-app-surface text-app-muted border-app-border hover:border-black"
                }`}
              >
                {name}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function getPickerItems() {
    return allWeeks;
  }

  function getPickerItemId(item: RawWeek) {
    return item.week.id;
  }

  function getPickerItemLabel(item: RawWeek) {
    return getWeekLabel(item);
  }

  function renderPickerSide(side: "left" | "right") {
    if (viewMode === "all" || viewMode === "progression") return null;

    const selectedValue = side === "left" ? leftSelection : rightSelection;
    const setSelectedValue = side === "left" ? setLeftSelection : setRightSelection;

    return (
      <div className="flex-1 min-w-[320px]">
        <p className="text-xs font-black text-app-muted uppercase mb-2">
          {side === "left" ? "Links" : "Rechts"}
        </p>

        <div className="max-h-[92px] overflow-y-auto rounded-xl border border-app-border bg-app-surface-muted p-2 grid grid-cols-1 gap-1">
          {getPickerItems().map((item: RawWeek) => {
            const id = getPickerItemId(item);
            const active = selectedValue === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedValue(id)}
                className={`w-full text-left rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  active
                    ? "bg-black text-white"
                    : "bg-app-surface text-app-text hover:bg-gray-100"
                }`}
              >
                {getPickerItemLabel(item)}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  function downloadCsv() {
    const lines = ["block,week,day,exercise,set,reps,weight,rpe,bw,recovery,fatigue"];

    for (const rawBlock of filteredRawBlocks) {
      for (const rawWeek of rawBlock.weeks) {
        for (const rawDay of rawWeek.days) {
          for (const row of rawDay.exercises) {
            const setRows =
              row.setRows.length > 0
                ? row.setRows
                : [{ set_number: 1, reps: "", weight: "", rpe: "" }];

            for (const setRow of setRows) {
              lines.push(
                [
                  rawBlock.block.title,
                  rawWeek.week.title,
                  rawDay.day.title,
                  row.exercise.name,
                  setRow.set_number,
                  setRow.reps || "",
                  setRow.weight || "",
                  setRow.rpe || "",
                  rawDay.checkin?.bw || "",
                  rawDay.checkin?.recovery ?? "",
                  rawDay.checkin?.fatigue ?? "",
                ]
                  .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                  .join(","),
              );
            }
          }
        }
      }
    }

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "ruwe-data-export.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const selectedLeftWeek = viewMode === "week" ? getSelectedWeek(leftSelection) : null;
  const selectedRightWeek = viewMode === "week" ? getSelectedWeek(rightSelection) : null;

  return (
    <main
      className={
        compactShell ? "min-h-full bg-gray-100" : "min-h-[100dvh] bg-gray-100"
      }
    >
      <section
        className={
          compactShell ? "flex-1 p-3 pb-4" : "flex-1 p-8 pb-24"
        }
      >
          <div
            className={`flex items-end justify-between gap-4 ${
              compactShell ? "mb-3" : "mb-6"
            }`}
          >
            <div className="min-w-0">
              {!embeddedInUnifiedPage && (
                <>
                  <h1
                    className={`font-bold text-black ${
                      compactShell ? "text-lg" : "text-3xl"
                    }`}
                  >
                    Raw Data
                  </h1>
                  {!compactShell && (
                    <p className="text-app-muted mt-2">
                      Bekijk alle data, vergelijk weken of bekijk progression per block.
                    </p>
                  )}
                </>
              )}
            </div>

            {!compactShell && (
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={downloadCsv}
                  className="rounded-xl border border-app-border bg-app-surface px-3 py-2 text-sm font-semibold text-black shadow hover:bg-gray-50"
                >
                  Export CSV
                </button>
                <div className="min-w-[280px]">
                  <p className="text-xs font-black text-app-muted uppercase mb-1">
                    Atleet
                  </p>

                  <select
                    value={selectedAthleteId}
                    onChange={(e) => setSelectedAthleteId(e.target.value)}
                    className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-sm outline-none text-black shadow"
                  >
                    {!selectedAthleteId && (
                      <option value="">Kies atleet</option>
                    )}
                    {athleteOptions.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {!embeddedInUnifiedPage && (
              <button
                type="button"
                onClick={loadRawData}
                className="bg-black text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Ververs
              </button>
            )}
          </div>

          {embeddedInUnifiedPage && (
            <div className="mb-4 flex flex-wrap items-end justify-end gap-3">
              <div className="min-w-[280px]">
                <p className="text-xs font-black text-app-muted uppercase mb-1">
                  Atleet
                </p>
                <select
                  value={selectedAthleteId}
                  onChange={(e) => setSelectedAthleteId(e.target.value)}
                  className="w-full bg-app-surface border border-app-border rounded-xl px-3 py-2 text-sm outline-none text-black shadow"
                >
                  {!selectedAthleteId && <option value="">Kies atleet</option>}
                  {athleteOptions.map((athlete) => (
                    <option key={athlete.id} value={athlete.id}>
                      {athlete.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                onClick={loadRawData}
                className="bg-black text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition"
              >
                Ververs
              </button>
            </div>
          )}

          {loading && (
            <div className="bg-app-surface rounded-2xl border border-app-border shadow p-6 text-app-muted">
              Data laden...
            </div>
          )}

          {!loading && errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-5">
              {errorMessage}
            </div>
          )}

          {!loading && !errorMessage && rawBlocks.length === 0 && (
            <div className="bg-app-surface rounded-2xl border border-app-border shadow p-6 text-app-muted">
              Geen raw data gevonden.
            </div>
          )}

          {!loading && !errorMessage && rawBlocks.length > 0 && (
            <>
              <div className="bg-app-surface rounded-2xl border border-app-border shadow p-4 mb-6">
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <p className="text-xs font-black text-app-muted uppercase mb-1">
                      Weergave
                    </p>
                    <div className="flex bg-app-surface-hover rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => switchMode("all")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                          viewMode === "all"
                            ? "bg-black text-white"
                            : "text-app-muted hover:bg-app-surface"
                        }`}
                      >
                        Alle data
                      </button>

                      <button
                        type="button"
                        onClick={() => switchMode("week")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                          viewMode === "week"
                            ? "bg-black text-white"
                            : "text-app-muted hover:bg-app-surface"
                        }`}
                      >
                        2 weken vergelijken
                      </button>

                      <button
                        type="button"
                        onClick={() => switchMode("progression")}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                          viewMode === "progression"
                            ? "bg-black text-white"
                            : "text-app-muted hover:bg-app-surface"
                        }`}
                      >
                        Progression view
                      </button>
                    </div>
                  </div>

                  {renderPickerSide("left")}

                  {renderPickerSide("right")}

                  {viewMode !== "progression" && (
                    <button
                      type="button"
                      onClick={() => setShowNotes((current: boolean) => !current)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                        showNotes
                          ? "bg-black text-white"
                          : "bg-app-surface-hover text-app-muted hover:bg-gray-200"
                      }`}
                    >
                      Notes aan/uit
                    </button>
                  )}
                </div>

                {renderDayFilterButtons()}
                {renderExerciseFilterButtons()}
              </div>

              {viewMode === "all" ? (
                renderAllData()
              ) : viewMode === "progression" ? (
                renderProgressionView()
              ) : (
                <div
                  className={`grid grid-cols-2 gap-5 items-start overflow-hidden ${
                    embeddedInChat
                      ? "h-[calc(100vh-220px)] min-h-[360px]"
                      : "h-[calc(100vh-300px)] min-h-[520px]"
                  }`}
                >
                  <div className="h-full overflow-y-auto overflow-x-hidden pr-2 rounded-2xl">
                    {selectedLeftWeek ? renderWeekCard(selectedLeftWeek) : null}
                  </div>

                  <div className="h-full overflow-y-auto overflow-x-hidden pr-2 rounded-2xl">
                    {selectedRightWeek ? renderWeekCard(selectedRightWeek) : null}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      {!compactShell && <AppSidebar />}
    </main>
  );
}
