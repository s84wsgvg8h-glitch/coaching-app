"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { athletesGlassInput } from "@/components/coach/athletes/athletesCrmClasses";

type AthletesSearchBarProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function AthletesSearchBar({ value, onChange }: AthletesSearchBarProps) {
  const [expanded, setExpanded] = useState(Boolean(value));
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) setExpanded(true);
  }, [value]);

  useEffect(() => {
    if (expanded) inputRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (wrapRef.current?.contains(event.target as Node)) return;
      if (!value) setExpanded(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [value]);

  return (
    <div
      ref={wrapRef}
      className={`athletes-search-bar ${athletesGlassInput} ${expanded ? "athletes-search-bar--expanded" : ""}`}
    >
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-app-subtle transition hover:bg-white/5 hover:text-app-text app-focus-ring"
        aria-label="Zoeken"
      >
        <Search className="h-[16px] w-[16px]" />
      </button>
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setExpanded(true)}
        placeholder="Zoek atleet…"
        className="athletes-search-bar-input min-w-0 flex-1 bg-transparent text-[13px] text-app-text placeholder:text-app-subtle/80 focus:outline-none"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-app-muted transition hover:bg-app-surface-raised/60 app-focus-ring"
          aria-label="Zoekopdracht wissen"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
