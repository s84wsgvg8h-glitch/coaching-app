export const RPE_ROWS = [
  10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1,
  0.5, 0,
];

export function getPercentage(repsPerformed: number, rir: number) {
  const averageRepCapacity = repsPerformed + rir;
  const percentage = 100 * Math.pow(0.9755, averageRepCapacity - 1);
  return Math.max(0, Math.min(100, percentage));
}

export function getPercentageForRpeAndReps(rpe: number, reps: number) {
  const rir = 10 - rpe;
  return getPercentage(reps, rir);
}

export function roundToPlate(weight: number) {
  return Math.round(weight / 2.5) * 2.5;
}

export function calculateWeightFromRpe(
  oneRepMax: number,
  reps: number,
  rpe: number,
) {
  if (!Number.isFinite(oneRepMax) || oneRepMax <= 0) return null;
  if (!Number.isFinite(reps) || reps <= 0) return null;
  if (!Number.isFinite(rpe) || rpe < 0 || rpe > 10) return null;

  const percentage = getPercentageForRpeAndReps(rpe, reps);
  return roundToPlate((oneRepMax * percentage) / 100);
}
