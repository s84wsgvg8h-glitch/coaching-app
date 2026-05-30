export type WarmupSet = {
  step: number;
  label: string;
  weightLabel: string;
  weightRange?: string;
  reps: string;
  note?: string;
};

function roundToPlate(weight: number) {
  return Math.round(weight / 2.5) * 2.5;
}

function formatWeightRange(min: number, max: number) {
  return `${roundToPlate(min)}–${roundToPlate(max)} kg`;
}

export function calculateWarmupSets(firstSetWeight: number): WarmupSet[] {
  if (!Number.isFinite(firstSetWeight) || firstSetWeight <= 0) {
    return [];
  }

  return [
    {
      step: 1,
      label: "Warm-up set 1",
      weightLabel: "Lege stang",
      reps: "8–12",
      note: "Begin met de lege stang en warm op voor 8–12 herhalingen.",
    },
    {
      step: 2,
      label: "Warm-up set 2",
      weightLabel: formatWeightRange(firstSetWeight * 0.4, firstSetWeight * 0.5),
      weightRange: "40–50% van je eerste werkset",
      reps: "6",
      note: "Sla deze set over als de lege stang al binnen dit percentage valt.",
    },
    {
      step: 3,
      label: "Warm-up set 3",
      weightLabel: formatWeightRange(firstSetWeight * 0.6, firstSetWeight * 0.65),
      weightRange: "60–65% van je eerste werkset",
      reps: "1–3",
    },
    {
      step: 4,
      label: "Warm-up set 4",
      weightLabel: formatWeightRange(firstSetWeight * 0.7, firstSetWeight * 0.8),
      weightRange: "70–80% van je eerste werkset",
      reps: "1",
    },
    {
      step: 5,
      label: "Warm-up set 5",
      weightLabel: formatWeightRange(firstSetWeight * 0.85, firstSetWeight * 0.9),
      weightRange: "85–90% van je eerste werkset",
      reps: "1",
    },
    {
      step: 6,
      label: "Warm-up set 6",
      weightLabel: formatWeightRange(firstSetWeight * 0.9, firstSetWeight * 0.95),
      weightRange: "90–95% van je eerste werkset",
      reps: "1",
      note: "Start daarna met je werksets.",
    },
  ];
}
