export type HabitFrequency = "daily" | "every_other_day" | "weekly";

export const HABIT_FREQUENCY_OPTIONS: {
  value: HabitFrequency;
  label: string;
  shortLabel: string;
}[] = [
  { value: "daily", label: "Elke dag", shortLabel: "Dagelijks" },
  { value: "every_other_day", label: "Om de dag", shortLabel: "Om de dag" },
  { value: "weekly", label: "Elke week", shortLabel: "Wekelijks" },
];

export function getHabitFrequencyLabel(
  frequency: HabitFrequency | null | undefined,
): string {
  if (!frequency) return "";
  const match = HABIT_FREQUENCY_OPTIONS.find((opt) => opt.value === frequency);
  return match?.shortLabel ?? "";
}
