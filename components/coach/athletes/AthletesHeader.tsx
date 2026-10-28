"use client";

import { useEffect, useRef, useState } from "react";
import { CheckSquare, List, Search, UserPlus } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { athletesPillBtnPrimary } from "@/components/coach/athletes/athletesCrmClasses";

const athletesIconBtnBase =
  "athletes-header-icon-btn inline-flex shrink-0 items-center justify-center rounded-full border transition app-focus-ring";

type AthletesHeaderProps = {
  pendingCount: number;
  selectionMode: boolean;
  selectedCount: number;
  onToggleSelection: () => void;
  onInvite?: () => void;
  search?: string;
  onSearchChange?: (value: string) => void;
};

export default function AthletesHeader({
  pendingCount,
  selectionMode,
  selectedCount,
  onToggleSelection,
  onInvite,
  search = "",
  onSearchChange,
}: AthletesHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(Boolean(search));
  const mobileSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (search) setSearchOpen(true);
  }, [search]);

  useEffect(() => {
    if (!searchOpen) return;
    window.requestAnimationFrame(() => {
      mobileSearchRef.current?.focus();
    });
  }, [searchOpen]);

  function handleSearchChange(value: string) {
    onSearchChange?.(value);
    if (value) setSearchOpen(true);
  }

  function toggleSearch() {
    if (searchOpen || search.length > 0) {
      setSearchOpen(false);
      onSearchChange?.("");
      mobileSearchRef.current?.blur();
      return;
    }
    setSearchOpen(true);
  }

  const showSearchField = Boolean(onSearchChange) && searchOpen;

  return (
    <header className="mb-4 lg:mb-7">
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
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {onSearchChange ? (
            <button
              type="button"
              onClick={toggleSearch}
              className={`${athletesIconBtnBase} ${
                showSearchField
                  ? "border-app-accent/40 bg-app-accent/10 text-app-accent"
                  : "border-app-border/80 bg-app-surface/40 text-app-muted hover:border-app-border hover:text-app-text"
              }`}
              aria-label="Atleten zoeken"
              title="Zoeken"
            >
              <Search className="h-4 w-4" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onToggleSelection}
            className={`${athletesIconBtnBase} ${
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
            <button
              type="button"
              onClick={onInvite}
              className={`${athletesIconBtnBase} ${athletesPillBtnPrimary}`}
              aria-label="Atleet uitnodigen"
              title="Uitnodigen"
            >
              <UserPlus className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      {showSearchField && onSearchChange ? (
        <div className="mt-3">
          <SearchInput
            ref={mobileSearchRef}
            value={search}
            onChange={handleSearchChange}
            placeholder="Zoek atleet..."
            variant="rounded"
            className="w-full athletes-header-search-field"
            inputClassName="text-base"
            aria-label="Zoek atleet"
          />
        </div>
      ) : null}
    </header>
  );
}
