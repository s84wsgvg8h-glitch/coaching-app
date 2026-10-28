"use client";

import { useEffect, useState } from "react";
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

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={active}
      className={`coach-apply-all-weeks-btn ${active ? "is-active" : ""} ${
        fullWidth ? "is-full" : ""
      }`}
    >
      Alle weken aanpassen
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
