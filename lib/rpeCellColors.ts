/** RPE table cell colors: dark red (RPE 10 × 1 rep) → light green (RPE 0 × 12 reps). */
export function getRpeCellIntensity(rpe: number, reps: number) {
  const rpeFactor = Math.max(0, Math.min(1, rpe / 10));
  const repFactor = Math.max(0, Math.min(1, 1 - (reps - 1) / 11));
  return rpeFactor * repFactor;
}

export function getRpeCellColor(rpe: number, reps: number) {
  const intensity = getRpeCellIntensity(rpe, reps);
  const hue = (1 - intensity) * 120;
  const saturation = 50 + intensity * 28;
  const lightness = 78 - intensity * 40;
  return `hsl(${hue.toFixed(1)}, ${saturation.toFixed(1)}%, ${lightness.toFixed(1)}%)`;
}

export function getRpeCellTextColor(rpe: number, reps: number) {
  return getRpeCellIntensity(rpe, reps) > 0.52 ? "#ffffff" : "#18181b";
}
