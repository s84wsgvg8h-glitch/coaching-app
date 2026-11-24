import assert from "node:assert/strict";
import { classifyMovement } from "../lib/pose/movementPattern";
import { angleDegrees, mapVideoPointToCover, readPoseChannels, type PoseLandmark } from "../lib/pose/poseGeometry";
import {
  createMovementCounter,
  flushMovementCounter,
  stepMovementCounter,
} from "../lib/pose/repCounter";
import type { MovementPattern } from "../lib/pose/movementPattern";

assert.equal(Math.round(angleDegrees({ x: 1, y: 0 }, { x: 0, y: 0 }, { x: 0, y: 1 }) ?? 0), 90);
assert.equal(Math.round(angleDegrees({ x: -1, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }) ?? 0), 180);

const center = mapVideoPointToCover(0.5, 0.5, 1920, 1080, 390, 844);
assert.ok(Math.abs(center.x - 195) < 1);
assert.ok(Math.abs(center.y - 422) < 1);

assert.equal(classifyMovement("High Bar Squat"), "knee");
assert.equal(classifyMovement("Pause Bench Press"), "elbow");
assert.equal(classifyMovement("Bankdrukken"), "elbow");
assert.equal(classifyMovement("Sumo Deadlift"), "hip");
assert.equal(classifyMovement("Romanian Deadlift"), "hip");
assert.equal(classifyMovement("Overhead Press"), "elbow");
assert.equal(classifyMovement("Hip Thrust"), "hip");
assert.equal(classifyMovement("Lateral Raise"), "shoulder");
assert.equal(classifyMovement("Pull-up"), "elbow");
assert.equal(classifyMovement("Leg Curl"), "knee");
assert.equal(classifyMovement("Bicep Curl"), "elbow");
assert.equal(classifyMovement("Calf Raise"), "ankle");
assert.equal(classifyMovement("Barbell Row"), "elbow");
assert.equal(classifyMovement("Face Pull"), "elbow");
assert.equal(classifyMovement("Onbekende oefening"), "auto");

const bentKnee = blankPose();
bentKnee[23] = landmark(0, 1, 0);
bentKnee[25] = landmark(0, 0, 0);
bentKnee[27] = landmark(1, 0, 0);
assert.equal(Math.round(readPoseChannels(null, bentKnee).knee ?? 0), 90);

assert.equal(countReps("knee", squatWave(3)), 3);
assert.equal(countReps("knee", shallowWave()), 0);
assert.equal(countReps("knee", noiseWave()), 0);
assert.equal(countReps("hip", hipThrustWave()), 2);
assert.equal(countReps("elbow", squatWave(2)), 2);

const autoState = runCounter(
  "auto",
  squatWave(2).map((knee) => ({ knee, elbow: 170 })),
);
assert.equal(autoState.reps, 2);
assert.equal(autoState.locked, "knee");

console.log("pose rep counter tests passed");

function countReps(
  pattern: MovementPattern,
  samples: Array<number | Record<string, number>>,
) {
  return runCounter(pattern, samples).reps;
}

function runCounter(
  pattern: MovementPattern,
  samples: Array<number | Record<string, number>>,
) {
  let state = createMovementCounter();

  samples.forEach((sample, index) => {
    const channels = typeof sample === "number" ? { [pattern]: sample } : sample;
    state = stepMovementCounter(state, channels, index * 50, pattern);
  });

  return flushMovementCounter(state, samples.length * 50, pattern);
}

function squatWave(reps: number) {
  const rep = [
    ...hold(168, 400),
    ...ramp(168, 78, 800),
    ...hold(78, 250),
    ...ramp(78, 168, 800),
    ...hold(168, 300),
  ];

  return Array.from({ length: reps }, () => rep).flat();
}

function shallowWave() {
  return Array.from({ length: 6 }, () => [
    ...ramp(165, 150, 400),
    ...ramp(150, 165, 400),
  ]).flat();
}

function noiseWave() {
  return Array.from({ length: 50 }, (_, index) => 166 + (index % 2 === 0 ? 3 : -3));
}

function hipThrustWave() {
  return [
    ...hold(75, 300),
    ...ramp(75, 165, 700),
    ...hold(165, 250),
    ...ramp(165, 75, 700),
    ...hold(75, 200),
    ...ramp(75, 165, 700),
    ...hold(165, 300),
  ];
}

function hold(value: number, ms: number) {
  return Array.from({ length: Math.round(ms / 50) }, () => value);
}

function ramp(from: number, to: number, ms: number) {
  const count = Math.max(2, Math.round(ms / 50));
  return Array.from({ length: count }, (_, index) => from + ((to - from) * index) / (count - 1));
}

function blankPose(): PoseLandmark[] {
  return Array.from({ length: 33 }, () => landmark(0, 0, 0));
}

function landmark(x: number, y: number, z: number): PoseLandmark {
  return { x, y, z, visibility: 1 };
}
