"use client";

import { useEffect, useRef } from "react";

type CoachExerciseNameInputProps = {
  exerciseId: string;
  initialName: string;
  disabled?: boolean;
  className?: string;
  onCommit: (value: string) => void;
};

export default function CoachExerciseNameInput({
  exerciseId,
  initialName,
  disabled = false,
  className = "",
  onCommit,
}: CoachExerciseNameInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const exerciseIdRef = useRef(exerciseId);

  if (exerciseIdRef.current !== exerciseId) {
    exerciseIdRef.current = exerciseId;
    if (inputRef.current) {
      inputRef.current.value = initialName;
    }
  }

  useEffect(() => {
    const input = inputRef.current;
    if (!input || document.activeElement === input) return;
    if (input.value !== initialName) {
      input.value = initialName;
    }
  }, [initialName, exerciseId]);

  return (
    <input
      ref={inputRef}
      type="text"
      defaultValue={initialName}
      disabled={disabled}
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      onMouseDown={(event) => {
        event.stopPropagation();
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      onBlur={(event) => {
        onCommit(event.currentTarget.value);
      }}
      className={className}
      aria-label="Oefeningnaam"
    />
  );
}
