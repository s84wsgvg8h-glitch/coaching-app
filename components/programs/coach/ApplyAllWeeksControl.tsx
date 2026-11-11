"use client";

import { useEffect, useState } from "react";
import { Layers2 } from "lucide-react";
import {
  APPLY_ALL_WEEKS_EVENT,
  readApplyAllWeeks,
  setApplyAllWeeks,
} from "@/lib/programWeek/applyExerciseAcrossBlock";

function useApplyAllWeeks(blockId: string) {
  const [until, setUntil] = useState<number | null>(null);

  useEffect(() => {
    const sync = () => {
      setUntil(readApplyAllWeeks(blockId).until);
    };

    sync();
    window.addEventListener(APPLY_ALL_WEEKS_EVENT, sync);
    const timer = window.setInterval(sync, 1000);
    return () => {
      window.removeEventListener(APPLY_ALL_WEEKS_EVENT, sync);
      window.clearInterval(timer);
    };
  }, [blockId]);

  const active = until !== null && until > Date.now();

  return {
    active,
    toggle: () =>
      setApplyAllWeeks(blockId, !readApplyAllWeeks(blockId).active),
  };
}

export function ApplyAllWeeksButton({
  blockId,
  fullWidth = false,
}: {
  blockId: string;
  fullWidth?: boolean;
}) {
  const { active, toggle } = useApplyAllWeeks(blockId);
  const label = active ? "Alle weken aanpassen (aan)" : "Alle weken aanpassen";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`coach-program-header-seg coach-apply-all-weeks-btn ${
        fullWidth ? "is-full" : ""
      }`}
    >
      <span
        className={`coach-program-header-seg-btn coach-apply-all-weeks-btn-icon${
          active ? " is-active" : ""
        }`}
      >
        <Layers2 className="h-4 w-4 shrink-0" aria-hidden="true" />
        {fullWidth ? <span>Alle weken aanpassen</span> : null}
      </span>
    </button>
  );
}

export function ApplyAllWeeksBadge({ blockId }: { blockId: string }) {
  const { active } = useApplyAllWeeks(blockId);
  if (!active) return null;

  return (
    <div className="coach-apply-all-weeks-badge" role="status">
      Alle weken aangepast
    </div>
  );
}
