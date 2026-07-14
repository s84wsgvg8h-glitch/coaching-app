"use client";

import { Plus } from "lucide-react";
import { useRef } from "react";
import { getTodoTitleSuggestions } from "@/lib/todoTitleSuggestions";

type TodoComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  saving?: boolean;
  athleteOptions: Array<{ id: string; full_name: string | null }>;
};

export default function TodoComposer({
  value,
  onChange,
  onSubmit,
  saving = false,
  athleteOptions,
}: TodoComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestions = getTodoTitleSuggestions(value, athleteOptions);

  return (
    <div className="todo-composer mt-5">
      <button
        type="button"
        onClick={() => inputRef.current?.focus()}
        className="todo-composer-plus"
        aria-label="Nieuwe taak"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
      </button>

      <div className="relative min-w-0 flex-1">
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") onSubmit();
          }}
          placeholder='Nieuwe taak — bv. "programma maken voor ..."'
          className="todo-composer-input"
        />
        {suggestions.length > 0 ? (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-xl border border-white/10 bg-[#111827] shadow-xl">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => {
                  onChange(suggestion);
                  inputRef.current?.focus();
                }}
                className="block w-full px-3 py-2 text-left text-[13px] text-app-text hover:bg-app-surface-hover"
              >
                {suggestion}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <p className="hidden shrink-0 text-[12px] text-app-muted xl:block">
        Druk op Enter om toe te voegen
      </p>

      <button
        type="button"
        onClick={onSubmit}
        disabled={saving || !value.trim()}
        className="todo-composer-submit"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        Toevoegen
      </button>
    </div>
  );
}
