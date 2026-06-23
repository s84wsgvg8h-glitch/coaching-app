"use client";

import type { ProgramExercise } from "@/lib/programWeek/types";

type CoachExerciseFormatFieldsProps = {
  exercise: ProgramExercise;
  disabled?: boolean;
  onChangeLocal: (
    field: "exercise_format" | "superset_group" | "rest_seconds",
    value: string,
  ) => void;
  onSave: (
    field: "exercise_format" | "superset_group" | "rest_seconds",
    value: string,
  ) => void;
};

export default function CoachExerciseFormatFields({
  exercise,
  disabled = false,
  onChangeLocal,
  onSave,
}: CoachExerciseFormatFieldsProps) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      <div>
        <p className="text-[8px] font-bold mb-0.5 text-gray-500">FORMAT</p>
        <select
          value={exercise.exercise_format || "normal"}
          disabled={disabled}
          onChange={(event) => {
            onChangeLocal("exercise_format", event.target.value);
            onSave("exercise_format", event.target.value);
          }}
          className="h-7 w-full rounded-md border border-gray-300 bg-white px-1 text-xs text-black outline-none"
        >
          <option value="normal">Normaal</option>
          <option value="amrap">AMRAP</option>
          <option value="superset">Superset</option>
        </select>
      </div>
      <div>
        <p className="text-[8px] font-bold mb-0.5 text-gray-500">SS GROEP</p>
        <input
          value={exercise.superset_group || ""}
          disabled={disabled}
          onChange={(event) => onChangeLocal("superset_group", event.target.value)}
          onBlur={(event) => onSave("superset_group", event.target.value.trim())}
          placeholder="A"
          className="h-7 w-full rounded-md border border-gray-300 bg-white px-1 text-center text-xs text-black outline-none"
        />
      </div>
      <div>
        <p className="text-[8px] font-bold mb-0.5 text-gray-500">RUST (s)</p>
        <input
          value={exercise.rest_seconds != null ? String(exercise.rest_seconds) : ""}
          disabled={disabled}
          inputMode="numeric"
          onChange={(event) => onChangeLocal("rest_seconds", event.target.value)}
          onBlur={(event) => onSave("rest_seconds", event.target.value.trim())}
          placeholder="90"
          className="h-7 w-full rounded-md border border-gray-300 bg-white px-1 text-center text-xs text-black outline-none"
        />
      </div>
    </div>
  );
}
