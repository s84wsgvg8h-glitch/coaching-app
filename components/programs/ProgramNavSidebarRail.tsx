"use client";

import Link from "next/link";
import { Home, Plus } from "lucide-react";

export type ProgramNavRailWeek = {
  id: string;
  label: string;
  isActive: boolean;
};

function weekRailLabel(title: string) {
  const match = title.match(/(\d+)/);
  return match ? match[1] : title.slice(0, 2);
}

type ProgramNavSidebarRailProps = {
  weeks: ProgramNavRailWeek[];
  onSelectWeek: (weekId: string) => void;
  showAddButton?: boolean;
  onAddClick?: () => void;
};

export default function ProgramNavSidebarRail({
  weeks,
  onSelectWeek,
  showAddButton,
  onAddClick,
}: ProgramNavSidebarRailProps) {
  return (
    <div className="program-nav-sidebar-rail" aria-label="Programma navigatie">
      <Link
        href="/dashboard"
        className="program-nav-sidebar-rail-icon"
        title="Dashboard"
        aria-label="Naar dashboard"
      >
        <Home className="h-5 w-5" aria-hidden="true" />
      </Link>

      <div className="program-nav-sidebar-rail-weeks">
        {weeks.map((week) => (
          <button
            key={week.id}
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSelectWeek(week.id)}
            className={`program-nav-sidebar-rail-week ${
              week.isActive ? "is-active" : ""
            }`}
            title={week.label}
            aria-current={week.isActive ? "page" : undefined}
          >
            {weekRailLabel(week.label)}
          </button>
        ))}
      </div>

      {showAddButton && onAddClick ? (
        <button
          type="button"
          onClick={onAddClick}
          className="program-nav-sidebar-rail-add"
          title="Toevoegen"
          aria-label="Toevoegen"
        >
          <Plus className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
