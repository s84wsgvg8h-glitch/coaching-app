import {
  applyIntensityInput,
  applyLoadKgInput,
  getIntensityInputDisplay,
  getLoadKgInputDisplay,
} from "@/lib/programWeek/intensityInput";
import type {
  AthleteExerciseSet,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";

export type CoachProgressionRow = {
  key: string;
  name: string;
  baseName: string;
  dayNumber: number;
  exerciseNumber: number;
  prescription: string;
  cells: Record<string, ProgramExercise | null>;
};

export type BlockProgressionSnapshot = {
  weeks: ProgramWeek[];
  daysByWeek: Record<string, ProgramDay[]>;
  exercisesByDay: Record<string, ProgramExercise[]>;
  athleteSetsByExerciseId: Record<string, AthleteExerciseSet[]>;
};

export type ProgressionCellContent = {
  plainText: string;
  loadDiffers: boolean;
  coachLoad: string | null;
  athleteLoad: string | null;
  rest: string;
};

function normalizeProgressionExerciseName(name: string | null | undefined) {
  return (name || "").trim().toLowerCase();
}

export function formatProgressionNumber(value: number) {
  const rounded = Math.round(value * 10) / 10;
  if (Number.isInteger(rounded)) return String(rounded);
  return String(rounded).replace(".", ",");
}

function parseProgressionNumber(value: string | null | undefined) {
  if (!value || value === "-") return null;
  const cleanValue = value
    .replace(/kg/gi, "")
    .replace("%", "")
    .replace(",", ".")
    .trim();
  const parsedValue = Number(cleanValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
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

function getCoachPrescription(exercise: ProgramExercise) {
  const sets = (exercise.sets || "").trim();
  const reps = (exercise.reps || "").trim();
  if (sets && reps) return `${sets}x${reps}`;
  if (sets) return sets;
  if (reps) return reps;
  return "1x-";
}

function getProgressionGroupPriority(name: string) {
  const category = getProgressionExerciseCategory(name);
  if (category === "squat") return 1;
  if (category === "bench") return 2;
  if (category === "deadlift") return 3;
  return 4;
}

export type ProgressionLiftCategory = "squat" | "bench" | "deadlift" | "overig";

export type ProgressionLiftFilter = {
  showSquat: boolean;
  showBench: boolean;
  showDeadlift: boolean;
  showOverig: boolean;
};

export const DEFAULT_PROGRESSION_LIFT_FILTER: ProgressionLiftFilter = {
  showSquat: true,
  showBench: true,
  showDeadlift: true,
  showOverig: true,
};

export function getProgressionExerciseCategory(
  exerciseName: string,
): ProgressionLiftCategory {
  const cleanName = exerciseName.toLowerCase();
  if (cleanName.includes("deadlift")) return "deadlift";
  if (cleanName.includes("benchpress") || cleanName.includes("bench press")) {
    return "bench";
  }
  if (cleanName.includes("bench")) return "bench";
  if (cleanName.includes("squat")) return "squat";
  return "overig";
}

export function filterCoachProgressionRows(
  rows: CoachProgressionRow[],
  filter: ProgressionLiftFilter,
) {
  return rows.filter((row) => {
    const category = getProgressionExerciseCategory(row.baseName);
    if (category === "squat") return filter.showSquat;
    if (category === "bench") return filter.showBench;
    if (category === "deadlift") return filter.showDeadlift;
    return filter.showOverig;
  });
}

export type ProgressionCellDisplay = {
  showLoad: boolean;
  showReps: boolean;
  showRpe: boolean;
};

export const DEFAULT_PROGRESSION_CELL_DISPLAY: ProgressionCellDisplay = {
  showLoad: true,
  showReps: true,
  showRpe: true,
};

function formatLoadKgText(exercise: ProgramExercise): string {
  const loadKg = getLoadKgInputDisplay(exercise);
  if (!loadKg) return "";

  const numeric = parseProgressionNumber(loadKg);
  if (numeric !== null) {
    return `${formatProgressionNumber(numeric)}kg`;
  }

  return loadKg.includes("kg") ? loadKg : `${loadKg}kg`;
}

function formatLoadKgFromNumber(value: number) {
  return `${formatProgressionNumber(value)}kg`;
}

export function averageAthleteLoadKg(
  athleteSets: AthleteExerciseSet[] | undefined,
) {
  if (!athleteSets?.length) return null;

  const weights = athleteSets
    .map((set) => parseProgressionNumber(set.weight))
    .filter((value): value is number => value !== null && value > 0);

  if (weights.length === 0) return null;

  const average =
    weights.reduce((total, value) => total + value, 0) / weights.length;
  return Math.round(average * 10) / 10;
}

function getCoachLoadLabel(exercise: ProgramExercise) {
  return formatLoadKgText(exercise);
}

function buildProgressionLoadComparison(
  exercise: ProgramExercise,
  athleteSets?: AthleteExerciseSet[],
) {
  const coachKg = getCoachLoadLabel(exercise);
  const coachLabel = coachKg || "-";
  const athleteAverage = averageAthleteLoadKg(athleteSets);
  const athleteLabel =
    athleteAverage !== null ? formatLoadKgFromNumber(athleteAverage) : null;

  if (!athleteLabel) {
    return {
      plainText: coachLabel,
      differs: false,
      coachLabel,
      athleteLabel: null as string | null,
    };
  }

  if (!coachKg) {
    return {
      plainText: athleteLabel,
      differs: true,
      coachLabel: "-",
      athleteLabel,
    };
  }

  const coachNumeric = parseProgressionNumber(getLoadKgInputDisplay(exercise));
  if (coachNumeric !== null && Math.abs(coachNumeric - athleteAverage!) < 0.05) {
    return {
      plainText: coachLabel,
      differs: false,
      coachLabel,
      athleteLabel: null,
    };
  }

  return {
    plainText: `${coachLabel} · ${athleteLabel}`,
    differs: true,
    coachLabel,
    athleteLabel,
  };
}

function buildProgressionCellRest(
  exercise: ProgramExercise,
  display: ProgressionCellDisplay,
) {
  const { showLoad, showReps, showRpe } = display;
  const repsPart = (exercise.reps || "").trim();
  const intensityPart = formatIntensityText(exercise);

  if (showLoad && showReps && showRpe) {
    return ` x ${repsPart || "-"} ${intensityPart || "-"}`.trimEnd();
  }
  if (!showLoad && showReps && !showRpe) {
    return repsPart || "-";
  }
  if (!showLoad && !showReps && showRpe) {
    return intensityPart || "-";
  }
  if (showLoad && showReps && !showRpe) {
    return ` x ${repsPart || "-"}`;
  }
  if (showLoad && !showReps && showRpe) {
    return intensityPart ? ` ${intensityPart}` : "";
  }
  if (!showLoad && showReps && showRpe) {
    return `${repsPart || "-"} ${intensityPart || "-"}`.trim();
  }

  return "";
}

function formatIntensityText(exercise: ProgramExercise): string {
  const intensity = getIntensityInputDisplay(exercise);
  if (!intensity) return "";
  if (intensity.includes("%")) return intensity;
  return `rpe ${intensity}`;
}

function rawLoadForEdit(exercise: ProgramExercise): string {
  const loadKg = getLoadKgInputDisplay(exercise);
  if (loadKg) return loadKg.replace(/kg/gi, "").trim();
  return "";
}

function rawIntensityForEdit(exercise: ProgramExercise): string {
  const intensity = getIntensityInputDisplay(exercise);
  if (!intensity) return "";
  if (intensity.includes("%")) {
    return intensity.replace(/%/g, "").trim();
  }
  return intensity;
}

function formatCoachProgressionCellPlainText(
  exercise: ProgramExercise | null | undefined,
  display: ProgressionCellDisplay = DEFAULT_PROGRESSION_CELL_DISPLAY,
) {
  if (!exercise) return "";

  const { showLoad, showReps, showRpe } = display;
  if (!showLoad && !showReps && !showRpe) return "";

  const loadPart = formatLoadKgText(exercise);
  const repsPart = (exercise.reps || "").trim();
  const intensityPart = formatIntensityText(exercise);

  if (showLoad && showReps && showRpe) {
    return `${loadPart || "-"} x ${repsPart || "-"} ${intensityPart || "-"}`;
  }
  if (showLoad && !showReps && !showRpe) {
    return loadPart || "-";
  }
  if (!showLoad && showReps && !showRpe) {
    return repsPart || "-";
  }
  if (!showLoad && !showReps && showRpe) {
    return intensityPart || "-";
  }
  if (showLoad && showReps && !showRpe) {
    return `${loadPart || "-"} x ${repsPart || "-"}`;
  }
  if (showLoad && !showReps && showRpe) {
    return `${loadPart || "-"} ${intensityPart || "-"}`.trim();
  }
  if (!showLoad && showReps && showRpe) {
    return `${repsPart || "-"} ${intensityPart || "-"}`.trim();
  }

  return "";
}

export function formatCoachProgressionCellContent(
  exercise: ProgramExercise | null | undefined,
  display: ProgressionCellDisplay = DEFAULT_PROGRESSION_CELL_DISPLAY,
  athleteSets?: AthleteExerciseSet[],
): ProgressionCellContent {
  if (!exercise) {
    return {
      plainText: "",
      loadDiffers: false,
      coachLoad: null,
      athleteLoad: null,
      rest: "",
    };
  }

  const { showLoad, showReps, showRpe } = display;
  if (!showLoad && !showReps && !showRpe) {
    return {
      plainText: "",
      loadDiffers: false,
      coachLoad: null,
      athleteLoad: null,
      rest: "",
    };
  }

  if (!showLoad) {
    const plainText = formatCoachProgressionCellPlainText(exercise, display);
    return {
      plainText,
      loadDiffers: false,
      coachLoad: null,
      athleteLoad: null,
      rest: plainText,
    };
  }

  const loadComparison = buildProgressionLoadComparison(exercise, athleteSets);
  const rest = buildProgressionCellRest(exercise, display);
  const plainText = `${loadComparison.plainText}${rest}`.trim();

  return {
    plainText,
    loadDiffers: loadComparison.differs,
    coachLoad: loadComparison.coachLabel,
    athleteLoad: loadComparison.athleteLabel,
    rest,
  };
}

export function formatCoachProgressionCellText(
  exercise: ProgramExercise | null | undefined,
  display: ProgressionCellDisplay = DEFAULT_PROGRESSION_CELL_DISPLAY,
  athleteSets?: AthleteExerciseSet[],
) {
  return formatCoachProgressionCellContent(exercise, display, athleteSets)
    .plainText;
}

export function formatCoachProgressionCellTextForEdit(
  exercise: ProgramExercise | null | undefined,
  display: ProgressionCellDisplay = DEFAULT_PROGRESSION_CELL_DISPLAY,
) {
  if (!exercise) return "";

  const { showLoad, showReps, showRpe } = display;
  const loadRaw = rawLoadForEdit(exercise);
  const repsRaw = (exercise.reps || "").trim();
  const intensityRaw = rawIntensityForEdit(exercise);

  if (showLoad && showReps && showRpe) {
    const parts: string[] = [];
    if (loadRaw && repsRaw) {
      parts.push(`${loadRaw} x ${repsRaw}`);
    } else if (loadRaw) {
      parts.push(loadRaw);
    } else if (repsRaw) {
      parts.push(repsRaw);
    }
    if (intensityRaw) {
      parts.push(intensityRaw);
    }
    return parts.join(" ");
  }

  if (showLoad && showReps && !showRpe) {
    if (loadRaw && repsRaw) return `${loadRaw} x ${repsRaw}`;
    if (loadRaw) return loadRaw;
    return repsRaw;
  }

  if (showLoad && !showReps && showRpe) {
    const parts = [loadRaw, intensityRaw].filter(Boolean);
    return parts.join(" ");
  }

  if (!showLoad && showReps && showRpe) {
    const parts = [repsRaw, intensityRaw].filter(Boolean);
    return parts.join(" ");
  }

  if (showLoad && !showReps && !showRpe) return loadRaw;
  if (!showLoad && showReps && !showRpe) return repsRaw;
  if (!showLoad && !showReps && showRpe) return intensityRaw;

  return "";
}

function strField(value: string | null | undefined) {
  return value?.trim() || "";
}

export function parseCoachProgressionEditText(
  text: string,
  display: ProgressionCellDisplay,
  exercise: ProgramExercise,
): { load: string; reps: string; rpe: string } | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") {
    return null;
  }

  const { showLoad, showReps, showRpe } = display;
  const result = {
    load: exercise.load?.trim() || "",
    reps: exercise.reps?.trim() || "",
    rpe: exercise.rpe?.trim() || "",
  };

  const activeCount = [showLoad, showReps, showRpe].filter(Boolean).length;

  if (activeCount === 1) {
    if (showLoad) {
      const updates = applyLoadKgInput(exercise, trimmed);
      return {
        ...result,
        load: strField(updates.load),
        rpe: strField(updates.rpe) || result.rpe,
      };
    }
    if (showReps) {
      return { ...result, reps: trimmed };
    }
    const updates = applyIntensityInput(exercise, trimmed);
    return {
      ...result,
      load: strField(updates.load),
      rpe: strField(updates.rpe),
    };
  }

  let loadInput = "";
  let repsInput = "";
  let intensityInput = "";

  function splitRepsIntensity(value: string) {
    const idx = value.lastIndexOf(" ");
    if (idx > 0) {
      repsInput = value.slice(0, idx).trim();
      intensityInput = value.slice(idx + 1).trim();
    } else {
      repsInput = value;
    }
  }

  function splitLoadIntensity(value: string) {
    const idx = value.lastIndexOf(" ");
    if (idx > 0) {
      loadInput = value.slice(0, idx).trim();
      intensityInput = value.slice(idx + 1).trim();
    } else {
      loadInput = value;
    }
  }

  if (showLoad && showReps && showRpe) {
    const xMatch = trimmed.match(/^(.+?)\s+x\s+(.+)$/i);
    if (xMatch) {
      loadInput = xMatch[1].trim();
      splitRepsIntensity(xMatch[2].trim());
    } else {
      splitRepsIntensity(trimmed);
    }
  } else if (showLoad && showReps) {
    const xMatch = trimmed.match(/^(.+?)\s+x\s+(.+)$/i);
    if (xMatch) {
      loadInput = xMatch[1].trim();
      repsInput = xMatch[2].trim();
    } else {
      loadInput = trimmed;
    }
  } else if (showLoad && showRpe) {
    splitLoadIntensity(trimmed);
  } else if (showReps && showRpe) {
    splitRepsIntensity(trimmed);
  }

  let workingExercise: Pick<ProgramExercise, "load" | "rpe"> = {
    load: result.load,
    rpe: result.rpe,
  };

  if (showLoad && loadInput) {
    const updates = applyLoadKgInput(workingExercise, loadInput);
    result.load = strField(updates.load);
    result.rpe = strField(updates.rpe) || result.rpe;
    workingExercise = { load: result.load, rpe: result.rpe };
  }

  if (showReps && repsInput) {
    result.reps = repsInput === "-" ? "" : repsInput;
  }

  if (showRpe && intensityInput) {
    const updates = applyIntensityInput(workingExercise, intensityInput);
    result.load = strField(updates.load);
    result.rpe = strField(updates.rpe);
  }

  return result;
}

export function buildCoachProgressionClearUpdates(
  exercise: ProgramExercise,
  display: ProgressionCellDisplay,
): { load: string; reps: string; rpe: string } {
  const { showLoad, showReps, showRpe } = display;

  return {
    load: showLoad ? "" : exercise.load?.trim() || "",
    reps: showReps ? "" : exercise.reps?.trim() || "",
    rpe: showRpe ? "" : exercise.rpe?.trim() || "",
  };
}

export function buildCoachProgressionRows(
  snapshot: BlockProgressionSnapshot,
): CoachProgressionRow[] {
  const rowMap = new Map<string, CoachProgressionRow>();

  for (const week of snapshot.weeks) {
    const days = snapshot.daysByWeek[week.id] || [];

    for (const day of days) {
      const exercises = [...(snapshot.exercisesByDay[day.id] || [])].sort(
        (a, b) => (a.exercise_number || 0) - (b.exercise_number || 0),
      );

      exercises.forEach((exercise, exerciseIndex) => {
        const baseName = exercise.name || "Oefening";
        const cleanName = normalizeProgressionExerciseName(baseName);
        if (!cleanName) return;

        const dayShort = getDayShortName(day.title, day.day_number);
        const exerciseNumber = exercise.exercise_number || exerciseIndex + 1;
        const prescription = getCoachPrescription(exercise);
        /*
          Key includes exercise_number so multiple rows on the same day with the
          same prescription (e.g. three 1x2 bench sets with different intensity)
          stay separate — matching the raw program layout.
          When block_slot_key is set, use it so athlete variation renames stay grouped.
        */
        const key = exercise.block_slot_key
          ? [
              exercise.block_slot_key,
              String(day.day_number),
              String(exerciseNumber),
            ].join("__")
          : [
              cleanName,
              day.day_number,
              prescription.toLowerCase(),
              String(exerciseNumber),
            ].join("__");

        if (!rowMap.has(key)) {
          rowMap.set(key, {
            key,
            name: `${dayShort.toUpperCase()} ${baseName} ${prescription}`,
            baseName,
            dayNumber: day.day_number,
            exerciseNumber,
            prescription,
            cells: {},
          });
        }

        const item = rowMap.get(key)!;
        item.exerciseNumber = Math.min(item.exerciseNumber, exerciseNumber);
        item.cells[week.id] = exercise;
      });
    }
  }

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

export function getProgressionExerciseColorClass(exerciseName: string) {
  const category = getProgressionExerciseCategory(exerciseName);
  if (category === "deadlift") return "is-deadlift";
  if (category === "bench") return "is-bench";
  if (category === "squat") return "is-squat";
  return "";
}

export function patchProgressionSnapshotExercise(
  snapshot: BlockProgressionSnapshot,
  exerciseId: string,
  updates: Partial<Pick<ProgramExercise, "load" | "reps" | "rpe">>,
): BlockProgressionSnapshot {
  let changed = false;
  const nextExercisesByDay: Record<string, ProgramExercise[]> = {};

  for (const [dayId, exercises] of Object.entries(snapshot.exercisesByDay)) {
    nextExercisesByDay[dayId] = exercises.map((exercise) => {
      if (exercise.id !== exerciseId) return exercise;
      changed = true;
      return { ...exercise, ...updates };
    });
  }

  if (!changed) return snapshot;
  return { ...snapshot, exercisesByDay: nextExercisesByDay };
}

export async function fetchBlockProgressionSnapshot(
  weeks: ProgramWeek[],
  fetchDays: (weekIds: string[]) => Promise<ProgramDay[]>,
  fetchExercises: (dayIds: string[]) => Promise<ProgramExercise[]>,
  fetchAthleteSets?: (
    exerciseIds: string[],
  ) => Promise<AthleteExerciseSet[]>,
): Promise<BlockProgressionSnapshot> {
  const sortedWeeks = [...weeks].sort(
    (a, b) => a.week_number - b.week_number,
  );
  const weekIds = sortedWeeks.map((week) => week.id);

  if (weekIds.length === 0) {
    return {
      weeks: [],
      daysByWeek: {},
      exercisesByDay: {},
      athleteSetsByExerciseId: {},
    };
  }

  const days = await fetchDays(weekIds);
  const daysByWeek: Record<string, ProgramDay[]> = {};
  weekIds.forEach((id) => {
    daysByWeek[id] = [];
  });
  days.forEach((day) => {
    if (!daysByWeek[day.program_week_id]) {
      daysByWeek[day.program_week_id] = [];
    }
    daysByWeek[day.program_week_id].push(day);
  });
  Object.values(daysByWeek).forEach((weekDays) => {
    weekDays.sort((a, b) => a.day_number - b.day_number);
  });

  const dayIds = days.map((day) => day.id);
  const exercises =
    dayIds.length > 0 ? await fetchExercises(dayIds) : [];

  const exercisesByDay: Record<string, ProgramExercise[]> = {};
  dayIds.forEach((id) => {
    exercisesByDay[id] = [];
  });
  exercises.forEach((exercise) => {
    if (!exercisesByDay[exercise.program_day_id]) {
      exercisesByDay[exercise.program_day_id] = [];
    }
    exercisesByDay[exercise.program_day_id].push(exercise);
  });

  const athleteSetsByExerciseId: Record<string, AthleteExerciseSet[]> = {};
  const exerciseIds = exercises.map((exercise) => exercise.id);

  if (fetchAthleteSets && exerciseIds.length > 0) {
    const athleteSets = await fetchAthleteSets(exerciseIds);
    athleteSets.forEach((set) => {
      if (!athleteSetsByExerciseId[set.program_exercise_id]) {
        athleteSetsByExerciseId[set.program_exercise_id] = [];
      }
      athleteSetsByExerciseId[set.program_exercise_id].push(set);
    });

    Object.values(athleteSetsByExerciseId).forEach((sets) => {
      sets.sort((a, b) => a.set_number - b.set_number);
    });
  }

  return {
    weeks: sortedWeeks,
    daysByWeek,
    exercisesByDay,
    athleteSetsByExerciseId,
  };
}
