import assert from "node:assert/strict";
import {
  averageAthleteLoadKg,
  formatCoachProgressionCellContent,
} from "../lib/programWeek/progressionView";
import type {
  AthleteExerciseSet,
  ProgramExercise,
} from "../lib/programWeek/types";

const baseExercise: ProgramExercise = {
  id: "ex-1",
  program_day_id: "day-1",
  name: "Benchpress",
  sets: "3",
  reps: "5",
  load: "110kg",
  rpe: null,
  notes: null,
  exercise_number: 1,
};

function makeSet(weight: string, setNumber: number): AthleteExerciseSet {
  return {
    program_exercise_id: "ex-1",
    athlete_id: "athlete-1",
    set_number: setNumber,
    reps: "5",
    weight,
    rpe: null,
  };
}

assert.equal(averageAthleteLoadKg([makeSet("110", 1), makeSet("112,5", 2), makeSet("110", 3)]), 110.8);

const sameLoad = formatCoachProgressionCellContent(
  baseExercise,
  { showLoad: true, showReps: true, showRpe: false },
  [makeSet("110", 1), makeSet("110", 2), makeSet("110", 3)],
);
assert.equal(sameLoad.loadDiffers, false);
assert.equal(sameLoad.plainText, "110kg x 5");

const differentLoad = formatCoachProgressionCellContent(
  baseExercise,
  { showLoad: true, showReps: true, showRpe: false },
  [makeSet("110", 1), makeSet("112.5", 2), makeSet("110", 3)],
);
assert.equal(differentLoad.loadDiffers, true);
assert.equal(differentLoad.coachLoad, "110kg");
assert.equal(differentLoad.athleteLoad, "110,8kg");
assert.equal(differentLoad.plainText, "110kg · 110,8kg x 5");

const repsOnly = formatCoachProgressionCellContent(
  baseExercise,
  { showLoad: false, showReps: true, showRpe: true },
  [makeSet("110", 1)],
);
assert.equal(repsOnly.loadDiffers, false);
assert.equal(repsOnly.plainText, "5 -");

const percentExercise: ProgramExercise = {
  ...baseExercise,
  load: "-10%",
  rpe: null,
};

const loadOnlyPercent = formatCoachProgressionCellContent(
  percentExercise,
  { showLoad: true, showReps: false, showRpe: false },
);
assert.equal(loadOnlyPercent.plainText, "-");
assert.equal(loadOnlyPercent.loadDiffers, false);

const intensityOnlyPercent = formatCoachProgressionCellContent(
  percentExercise,
  { showLoad: false, showReps: false, showRpe: true },
);
assert.equal(intensityOnlyPercent.plainText, "-10%");

const percentWithAthleteKg = formatCoachProgressionCellContent(
  percentExercise,
  { showLoad: true, showReps: false, showRpe: false },
  [makeSet("80", 1), makeSet("80", 2)],
);
assert.equal(percentWithAthleteKg.loadDiffers, true);
assert.equal(percentWithAthleteKg.coachLoad, "-");
assert.equal(percentWithAthleteKg.athleteLoad, "80kg");
assert.equal(percentWithAthleteKg.plainText, "80kg");

console.log("progression-view.test.ts: all assertions passed");
