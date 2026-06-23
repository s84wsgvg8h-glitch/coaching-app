export type AutoregulationSuggestion = {
  label: string;
  detail: string;
  kind: "increase" | "repeat" | "none";
};

function parseRpe(value: string | null | undefined) {
  const match = (value || "").replace(",", ".").match(/[\d.]+/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

export function getAutoregulationSuggestion(input: {
  targetRpe: string | null | undefined;
  loggedRpes: string[];
}): AutoregulationSuggestion | null {
  const target = parseRpe(input.targetRpe);
  if (target === null) return null;

  const logged = input.loggedRpes
    .map(parseRpe)
    .filter((n): n is number => n !== null);

  if (logged.length === 0) return null;

  const avg =
    logged.reduce((sum, value) => sum + value, 0) / logged.length;

  if (avg <= target - 1) {
    return {
      kind: "increase",
      label: "+2,5 kg",
      detail: `Gem. RPE ${avg.toFixed(1)} onder target ${target}`,
    };
  }

  if (avg >= target + 0.5) {
    return {
      kind: "repeat",
      label: "Herhaal gewicht",
      detail: `Gem. RPE ${avg.toFixed(1)} op/ boven target ${target}`,
    };
  }

  return {
    kind: "none",
    label: "Op schema",
    detail: `Gem. RPE ${avg.toFixed(1)} ≈ target ${target}`,
  };
}
