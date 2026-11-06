"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { formatProgramBlockOverlapMessage } from "@/lib/programBlockOverlap";

type ProgramBlockOverlapWarningProps = {
  overlappingTitles: string[];
  /** Actieve (donkere) block-rij: lichtere icoonkleur. */
  onDark?: boolean;
  className?: string;
};

export default function ProgramBlockOverlapWarning({
  overlappingTitles,
  onDark = false,
  className = "",
}: ProgramBlockOverlapWarningProps) {
  const tooltipId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  const message = formatProgramBlockOverlapMessage(overlappingTitles);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <span
      ref={rootRef}
      className={`group/overlap pointer-events-auto inline-flex shrink-0 ${className}`}
    >
      <button
        type="button"
        className={`inline-flex h-5 w-5 items-center justify-center rounded-md transition ${
          onDark
            ? "text-amber-300 hover:bg-white/15"
            : "text-amber-500 hover:bg-amber-500/10"
        }`}
        aria-label={message}
        aria-describedby={open ? tooltipId : undefined}
        title={message}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((current) => !current);
        }}
      >
        <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" strokeWidth={2.25} />
      </button>

      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none absolute left-1/2 top-full z-50 mt-1 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-app-border bg-app-surface px-2.5 py-1.5 text-left text-[11px] font-semibold leading-snug text-app-text shadow-lg transition ${
          open
            ? "opacity-100"
            : "opacity-0 group-hover/overlap:opacity-100 group-focus-within/overlap:opacity-100"
        }`}
      >
        {message}
      </span>
    </span>
  );
}
