"use client";

import { Search, X } from "lucide-react";

type ChatSearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  accent?: boolean;
  className?: string;
};

export default function ChatSearchField({
  value,
  onChange,
  placeholder,
  accent = false,
  className = "",
}: ChatSearchFieldProps) {
  return (
    <label
      className={`flex items-center gap-3 rounded-xl border px-4 py-2.5 ${
        accent
          ? "border-emerald-500 bg-white"
          : "border-gray-200 bg-gray-50"
      } ${className}`}
    >
      <Search
        className={`h-4 w-4 shrink-0 ${accent ? "text-emerald-600" : "text-gray-400"}`}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-black outline-none placeholder:text-gray-400"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-black"
          aria-label="Zoekopdracht wissen"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </label>
  );
}
