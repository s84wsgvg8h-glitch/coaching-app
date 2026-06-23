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
      className={`chat-search-field ${
        accent ? "chat-search-field-accent" : ""
      } ${className}`}
    >
      <Search
        className={`h-4 w-4 shrink-0 ${accent ? "text-app-accent" : "text-app-subtle"}`}
      />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="chat-search-input"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="shrink-0 p-0.5 text-app-subtle transition hover:text-app-text"
          aria-label="Zoekopdracht wissen"
        >
          <X className="h-3.5 w-3.5 stroke-[2]" />
        </button>
      )}
    </div>
  );
}
