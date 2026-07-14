"use client";

import { CheckSquare, List, UserPlus } from "lucide-react";
import {
  athletesPillBtnGhost,
  athletesPillBtnPrimary,
} from "@/components/coach/athletes/athletesCrmClasses";

type AthletesHeaderProps = {
  pendingCount: number;
  selectionMode: boolean;
  selectedCount: number;
  onToggleSelection: () => void;
  onInvite?: () => void;
};

export default function AthletesHeader({
  pendingCount,
  selectionMode,
  selectedCount,
  onToggleSelection,
  onInvite,
}: AthletesHeaderProps) {
  return (
    <header className="mb-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[28px] font-bold tracking-tight text-app-text md:text-[34px] md:leading-none">
              Atleten
            </h1>
            {pendingCount > 0 ? (
              <span className="athletes-status-badge athletes-status-badge--muted">
                {pendingCount} in afwachting
              </span>
            ) : null}
          </div>
          <p className="mt-2.5 max-w-2xl text-[13px] leading-relaxed text-app-subtle/90 md:text-[14px]">
            Overzicht van al je atleten en hun voortgang, betalingen en engagement.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelection}
            className={`inline-flex h-11 w-11 items-center justify-center rounded-full border transition app-focus-ring ${
              selectionMode
                ? "border-app-accent/40 bg-app-accent/10 text-app-accent"
                : "border-app-border/80 bg-app-surface/40 text-app-muted hover:border-app-border hover:text-app-text"
            }`}
            aria-label={selectionMode ? "Selectie afronden" : "Atleten selecteren"}
            title={selectionMode ? "Klaar" : "Selecteren"}
          >
            {selectionMode ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <List className="h-4 w-4" />
            )}
          </button>
          {selectionMode && selectedCount > 0 ? (
            <span className="rounded-full border border-app-border/70 bg-app-surface/60 px-3 py-1.5 text-[12px] text-app-muted">
              {selectedCount} geselecteerd
            </span>
          ) : null}
          {onInvite ? (
            <button type="button" onClick={onInvite} className={athletesPillBtnPrimary}>
              <UserPlus className="h-4 w-4" />
              Uitnodigen
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
