"use client";

import { useEffect, useRef, useState } from "react";
import { CheckSquare, List, Search, UserPlus } from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { PageHeader } from "@/components/ui/design-system";
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
    <div className="mb-1 lg:mb-3">
      <PageHeader
        eyebrow="Coach"
        title="Atleten"
        actions={
          <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            {pendingCount > 0 ? (
              <span className="athletes-status-badge athletes-status-badge--warning">
                {pendingCount} in afwachting
              </span>
            ) : null}
            {onSearchChange ? (
              <button
                type="button"
                onClick={toggleSearch}
                className={`${athletesIconBtnBase} ${
                  showSearchField
                    ? "border-app-accent bg-app-accent text-white"
                    : "border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover hover:text-app-text"
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
                  ? "border-app-accent bg-app-accent text-white"
                  : "border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover hover:text-app-text"
              }`}
              aria-label={
                selectionMode ? "Selectie afronden" : "Atleten selecteren"
              }
              title={selectionMode ? "Klaar" : "Selecteren"}
            >
              {selectionMode ? (
                <CheckSquare className="h-4 w-4" />
              ) : (
                <List className="h-4 w-4" />
              )}
            </button>
            {selectionMode && selectedCount > 0 ? (
              <span className="rounded-full border border-app-border bg-app-surface px-3 py-1.5 text-[12px] text-app-muted">
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
        }
      />

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
    </div>
  );
}
