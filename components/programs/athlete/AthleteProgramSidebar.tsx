"use client";

import { Calendar, ChevronDown, ChevronRight, StickyNote } from "lucide-react";
import ProgramNavSidebarRail from "@/components/programs/ProgramNavSidebarRail";

export type AthleteProgramSidebarBlock = {
  id: string;
  title: string;
  dateRange: string;
  isActive: boolean;
  isOpen: boolean;
  weeks: Array<{
    id: string;
    title: string;
    dateRange: string;
    isActive: boolean;
  }>;
};

type AthleteProgramSidebarProps = {
  blocks: AthleteProgramSidebarBlock[];
  onToggleBlock: (blockId: string) => void;
  onSelectWeek: (blockId: string, weekId: string) => void;
};

export default function AthleteProgramSidebar({
  blocks,
  onToggleBlock,
  onSelectWeek,
}: AthleteProgramSidebarProps) {
  const activeBlock =
    blocks.find((block) => block.isActive) ||
    blocks.find((block) => block.weeks.some((week) => week.isActive)) ||
    blocks[0];

  const railWeeks = (activeBlock?.weeks ?? []).map((week) => ({
    id: week.id,
    label: week.title,
    isActive: week.isActive,
  }));

  return (
    <aside className="program-nav-sidebar athlete-program-sidebar hidden lg:flex">
      <ProgramNavSidebarRail
        weeks={railWeeks}
        onSelectWeek={(weekId) => {
          if (activeBlock) onSelectWeek(activeBlock.id, weekId);
        }}
      />

      <div className="program-nav-sidebar-flyout athlete-program-sidebar-flyout">
        <div className="athlete-program-sidebar-header">
          <h2 className="text-[17px] font-semibold text-app-text">Programma</h2>
          <p className="mt-0.5 text-[12px] text-app-muted">
            Macrocycles, blocks en weken
          </p>
        </div>

        <div className="athlete-program-sidebar-tree">
          {blocks.map((block, blockIndex) => (
            <div
              key={block.id}
              className={`athlete-program-sidebar-block athlete-program-sidebar-block-tone-${
                blockIndex % 5
              }`}
            >
              <button
                type="button"
                onClick={() => onToggleBlock(block.id)}
                className={`athlete-program-sidebar-block-toggle ${
                  block.isActive ? "is-active-block" : ""
                }`}
              >
                <span className="flex min-w-0 flex-1 flex-col items-start text-left">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                    {block.title}
                  </span>
                  <span className="mt-0.5 text-[11px] text-app-muted">
                    {block.dateRange}
                  </span>
                </span>
                {block.isOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0 text-app-muted" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-app-muted" />
                )}
              </button>

              {block.isOpen ? (
                <div className="athlete-program-sidebar-weeks">
                  {block.weeks.map((week) => (
                    <button
                      key={week.id}
                      type="button"
                      onClick={() => onSelectWeek(block.id, week.id)}
                      className={`athlete-program-sidebar-week ${
                        week.isActive ? "is-active" : ""
                      }`}
                    >
                      <span className="text-[13px] font-semibold">
                        {week.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] opacity-80">
                        {week.dateRange}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function AthleteProgramDayHeader({
  title,
  dateLabel,
  hasNote = false,
  notesOpen = false,
  onToggleNotes,
}: {
  title: string;
  dateLabel: string;
  hasNote?: boolean;
  notesOpen?: boolean;
  onToggleNotes?: () => void;
}) {
  return (
    <div className="athlete-program-day-header">
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold text-app-text">{title}</h2>
        <p className="text-[12px] text-app-muted">{dateLabel}</p>
      </div>
      {onToggleNotes ? (
        <button
          type="button"
          onClick={onToggleNotes}
          aria-pressed={notesOpen}
          aria-label="Notitie voor deze dag"
          title="Notitie"
          className={`athlete-program-note-icon ${hasNote ? "has-note" : ""} ${
            notesOpen ? "is-open" : ""
          }`}
        >
          <StickyNote className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : (
        <Calendar
          className="h-4 w-4 shrink-0 text-app-muted"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
