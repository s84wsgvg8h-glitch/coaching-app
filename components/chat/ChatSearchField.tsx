"use client";

import { Search, X } from "lucide-react";

type ChatSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accent?: boolean;
  className?: string;
  autoFocus?: boolean;
};

export default function ChatSearchField({
  value,
  onChange,
  placeholder,
  accent = false,
  className = "",
  autoFocus = false,
}: ChatSearchFieldProps) {
  const hasValue = value.length > 0;

  return (
    <div
      className={`relative flex items-center gap-2 rounded-xl border px-3 py-2 ${
        accent
          ? "border-emerald-500 bg-white"
          : "border-gray-200 bg-gray-50"
      } ${className}`}
    >
      <Search
        className={`h-4 w-4 shrink-0 ${accent ? "text-emerald-600" : "text-gray-500"}`}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 p-0.5 text-gray-400 transition hover:text-gray-700"
          aria-label="Zoekopdracht wissen"
        >
          <X className="h-3.5 w-3.5 stroke-[2]" />
        </button>
      )}
    </div>
  );
}
