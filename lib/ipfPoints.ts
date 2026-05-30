export type Gender = "male" | "female";

export function calculateWilks(
  totalKg: number,
  bodyweightKg: number,
  gender: Gender = "male",
): number {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;

  const coeffs =
    gender === "male"
      ? [-216.0475144, 16.2606339, -0.002388645, -0.00113732, 7.01863e-6, -1.291e-8]
      : [594.31747775582, -27.23842536447, 0.82112226871, -0.00930733913, 4.731582e-5, -9.054e-8];

  const [a, b, c, d, e, f] = coeffs;
  const denom =
    a +
    b * bodyweightKg +
    c * bodyweightKg ** 2 +
    d * bodyweightKg ** 3 +
    e * bodyweightKg ** 4 +
    f * bodyweightKg ** 5;

  if (denom === 0) return 0;

  return (totalKg * 500) / denom;
}

export function calculateDots(
  totalKg: number,
  bodyweightKg: number,
  gender: Gender = "male",
): number {
  if (totalKg <= 0 || bodyweightKg <= 0) return 0;

  const coeffs =
    gender === "male"
      ? [-307.75076, 24.0900756, -0.1918759221, 0.0007391293, -0.000001093, 0.0000007857]
      : [-57.96288, 13.6175032, -0.1126655495, 0.0005158568, -0.0000010706, 0.0000008227];

  const [a, b, c, d, e, f] = coeffs;
  const denom =
    a +
    b * bodyweightKg +
    c * bodyweightKg ** 2 +
    d * bodyweightKg ** 3 +
    e * bodyweightKg ** 4 +
    f * bodyweightKg ** 5;

  if (denom === 0) return 0;

  return (totalKg * 500) / denom;
}

export function calculateTotal(
  squat: number | null,
  bench: number | null,
  deadlift: number | null,
): number {
  return (squat || 0) + (bench || 0) + (deadlift || 0);
}

export const LIMITLESS_CHART_COLORS = {
  primary: "#7c3aed",
  secondary: "#c084fc",
  squat: "#7c3aed",
  bench: "#2563eb",
  deadlift: "#059669",
  accent: "#eab308",
  muted: "#9ca3af",
} as const;
