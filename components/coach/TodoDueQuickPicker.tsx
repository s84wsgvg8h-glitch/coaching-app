"use client";

import { useMemo } from "react";
import { formatTodoDueAt } from "@/lib/todoDueStyle";

export type TodoDuePreset = "" | "today" | "tomorrow" | "3days" | "week";

const PRESETS: Array<{ value: TodoDuePreset; label: string }> = [
  { value: "", label: "Geen" },
  { value: "today", label: "Vandaag" },
  { value: "tomorrow", label: "Morgen" },
  { value: "3days", label: "3 dagen" },
  { value: "week", label: "1 week" },
];

export function dueAtFromPreset(preset: TodoDuePreset, endOfDay = true) {
  if (!preset) return null;

  const date = new Date();
  if (preset === "tomorrow") date.setDate(date.getDate() + 1);
  if (preset === "3days") date.setDate(date.getDate() + 3);
  if (preset === "week") date.setDate(date.getDate() + 7);

  if (endOfDay) {
    date.setHours(23, 59, 0, 0);
  }

  return date.toISOString();
}

export function presetFromDueAt(dueAt: string | null | undefined): TodoDuePreset {
  if (!dueAt) return "";

  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return "";

  const startOfDay = (d: Date) => {
    const copy = new Date(d);
    copy.setHours(0, 0, 0, 0);
    return copy.getTime();
  };

  const dueDay = startOfDay(due);
  const today = startOfDay(new Date());

  const dayDiff = Math.round((dueDay - today) / (24 * 60 * 60 * 1000));

  if (dayDiff === 0) return "today";
  if (dayDiff === 1) return "tomorrow";
  if (dayDiff === 3) return "3days";
  if (dayDiff === 7) return "week";

  return "";
}

type TodoDueQuickPickerProps = {
  value: TodoDuePreset;
  onChange: (preset: TodoDuePreset) => void;
  dueAt?: string | null;
  compact?: boolean;
  className?: string;
};

export default function TodoDueQuickPicker({
  value,
  onChange,
  dueAt,
  compact = false,
  className = "",
}: TodoDueQuickPickerProps) {
  const customDueLabel = useMemo(() => {
    if (!dueAt || value) return "";
    return formatTodoDueAt(dueAt);
  }, [dueAt, value]);

  return (
    <div className={className}>
      <div
        className={`apple-segmented w-full flex-wrap ${compact ? "" : "mt-1"}`}
        role="group"
        aria-label="Einddatum"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset.value || "none"}
            type="button"
            onClick={() => onChange(preset.value)}
            data-active={value === preset.value}
            className={`apple-segment flex-1 min-w-0 ${value === preset.value ? "active" : ""}`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {customDueLabel ? (
        <p className="mt-1.5 text-[11px] text-app-muted">Eindigt {customDueLabel}</p>
      ) : null}
    </div>
  );
}
