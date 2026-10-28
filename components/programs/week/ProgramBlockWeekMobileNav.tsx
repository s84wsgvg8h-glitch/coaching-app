"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import {
  useRef,
  useState,
  type ReactNode,
} from "react";
import ProgramBlockDateField from "@/components/programs/ProgramBlockDateField";
import ProgramMobileNavMenu from "@/components/programs/week/ProgramMobileNavMenu";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  formatDateRangeLabel,
  getBlockEndDateObject,
  getBlockStartDateObject,
  getWeekEndDateObject,
  getWeekStartDateObject,
} from "@/lib/programWeek/dateFormatting";
import {
  resolveBlockWeeksForDisplay,
  resolveNavBlocksForDisplay,
} from "@/lib/programWeek/navDisplay";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";

export type ProgramBlockWeekMobileNavProps = {
  role: string;
  backHref?: string;
  blockId: string;
  weekId: string;
  navBlocks: ProgramBlock[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  currentBlock: ProgramBlock | null;
  week: ProgramWeek | null;
  navMacrocycles: ProgramMacrocycle[];
  onGoToBlock: (targetBlockId: string) => void;
  onGoToProgram: (targetBlockId: string, targetWeekId: string) => void;
  programAddMenu: ReactNode;
  creatingMacrocycle: boolean;
  newMacrocycleTitle: string;
  onNewMacrocycleTitleChange: (value: string) => void;
  onCreateMacrocycle: () => void;
  onCancelMacrocycle: () => void;
  creatingBlock: boolean;
  newBlockTitle: string;
  newBlockDescription: string;
  newBlockStartDate: string;
  newBlockMacrocycleId: string;
  onNewBlockTitleChange: (value: string) => void;
  onNewBlockDescriptionChange: (value: string) => void;
  onNewBlockStartDateChange: (value: string) => void;
  onNewBlockMacrocycleIdChange: (value: string) => void;
  onCreateBlock: () => void;
  onCancelBlock: () => void;
  creatingWeekBlockId: string;
  newWeekTitle: string;
  onNewWeekTitleChange: (value: string) => void;
  onCreateWeek: (targetBlockId: string) => void;
  onCancelWeek: () => void;
};

export default function ProgramBlockWeekMobileNav({
  role,
  backHref,
  blockId,
  weekId,
  navBlocks,
  weeksByBlock,
  currentBlock,
  week,
  navMacrocycles,
  onGoToBlock,
  onGoToProgram,
  programAddMenu,
  creatingMacrocycle,
  newMacrocycleTitle,
  onNewMacrocycleTitleChange,
  onCreateMacrocycle,
  onCancelMacrocycle,
  creatingBlock,
  newBlockTitle,
  newBlockDescription,
  newBlockStartDate,
  newBlockMacrocycleId,
  onNewBlockTitleChange,
  onNewBlockDescriptionChange,
  onNewBlockStartDateChange,
  onNewBlockMacrocycleIdChange,
  onCreateBlock,
  onCancelBlock,
  creatingWeekBlockId,
  newWeekTitle,
  onNewWeekTitleChange,
  onCreateWeek,
  onCancelWeek,
}: ProgramBlockWeekMobileNavProps) {
  const [blockNavOpen, setBlockNavOpen] = useState(false);
  const [weekNavOpen, setWeekNavOpen] = useState(false);
  const blockButtonRef = useRef<HTMLButtonElement | null>(null);
  const weekButtonRef = useRef<HTMLButtonElement | null>(null);

  function closeMenus() {
    setBlockNavOpen(false);
    setWeekNavOpen(false);
  }

  function openBlockMenu() {
    setWeekNavOpen(false);
    setBlockNavOpen((current) => !current);
  }

  function openWeekMenu() {
    setBlockNavOpen(false);
    setWeekNavOpen((current) => !current);
  }

  const darkNav = role === "atleet" || isCoachLikeRole(role);
  const athleteMobileNav = role === "atleet";
  const athleteCompact = athleteMobileNav;
  const displayNavBlocks = resolveNavBlocksForDisplay(
    navBlocks,
    currentBlock,
    blockId,
  );
  const blockWeeks = resolveBlockWeeksForDisplay(
    weeksByBlock,
    blockId,
    week,
    weekId,
  );
  const activeBlock =
    displayNavBlocks.find((block) => block.id === blockId) || currentBlock;
  const activeWeek = blockWeeks.find((item) => item.id === weekId) || week;

  const activeBlockStart = activeBlock
    ? getBlockStartDateObject(activeBlock)
    : null;
  const activeBlockEnd = activeBlock
    ? getBlockEndDateObject(activeBlock, blockWeeks)
    : null;
  const activeWeekStart =
    activeBlock && activeWeek
      ? getWeekStartDateObject(activeBlock, activeWeek, blockWeeks)
      : null;
  const activeWeekEnd =
    activeBlock && activeWeek
      ? getWeekEndDateObject(activeBlock, activeWeek, blockWeeks)
      : null;

  const blockSelectorButton = (
    <button
      ref={blockButtonRef}
      type="button"
      onClick={openBlockMenu}
      aria-expanded={blockNavOpen}
      aria-haspopup="menu"
      className={`flex w-full min-w-0 items-center justify-between gap-1.5 rounded-full border px-3 py-1.5 text-left text-sm font-bold transition active:scale-95 ${
        athleteCompact ? "program-mobile-week-nav-chip" : ""
      } ${
        blockNavOpen || blockId
          ? "border-app-accent/40 bg-app-accent/10 text-app-text"
          : "border-app-border bg-app-surface text-app-text"
      }`}
    >
      <span className="min-w-0 truncate">
        {activeBlock?.title || "Block"}
        <span
          className="block truncate text-[11px] font-semibold text-app-muted"
        >
          {formatDateRangeLabel(activeBlockStart, activeBlockEnd)}
        </span>
      </span>
      <span className="shrink-0 text-xs text-app-muted">
        {blockNavOpen ? "▲" : "▼"}
      </span>
    </button>
  );

  const weekSelectorButton = (
    <button
      ref={weekButtonRef}
      type="button"
      onClick={openWeekMenu}
      aria-expanded={weekNavOpen}
      aria-haspopup="menu"
      className={`flex w-full min-w-0 items-center justify-between gap-1.5 rounded-full border px-3 py-1.5 text-left text-sm font-bold transition active:scale-95 ${
        athleteCompact ? "program-mobile-week-nav-chip" : ""
      } ${
        weekNavOpen || weekId
          ? "border-app-accent/40 bg-app-accent/10 text-app-text"
          : "border-app-border bg-app-surface text-app-text"
      }`}
    >
      <span className="min-w-0 truncate">
        {activeWeek?.title || "Week"}
        <span
          className="block truncate text-[11px] font-semibold text-app-muted"
        >
          {formatDateRangeLabel(activeWeekStart, activeWeekEnd)}
        </span>
      </span>
      <span className="shrink-0 text-xs text-app-muted">
        {weekNavOpen ? "▲" : "▼"}
      </span>
    </button>
  );

  return (
    <div
      className={`program-mobile-week-nav relative z-30 w-full max-w-full overflow-visible backdrop-blur lg:hidden ${
        athleteCompact
          ? "program-mobile-week-nav--athlete-compact px-3 pb-1 pt-[max(0.375rem,env(safe-area-inset-top))]"
          : "sticky top-0 -mx-3 mb-4 space-y-3 px-3 pb-3 pt-[max(0.375rem,env(safe-area-inset-top))] md:-mx-6 md:px-6"
      } ${
        darkNav
          ? "program-mobile-week-nav--dark"
          : "border-b border-app-border bg-app-surface/95"
      }`}
    >
      <div
        className={
          athleteCompact
            ? "mx-auto grid w-full max-w-md grid-cols-2 gap-2"
            : "grid grid-cols-2 gap-2"
        }
      >
        {athleteCompact && backHref ? (
          <Link
            href={backHref}
            className="program-mobile-week-nav-back app-focus-ring"
            aria-label="Terug"
          >
            <ChevronLeft className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
        ) : null}

        <div className="relative min-w-0">
          {blockSelectorButton}
        </div>

        <div className="relative min-w-0">
          {weekSelectorButton}
        </div>
      </div>

      <ProgramMobileNavMenu
        open={blockNavOpen}
        anchorRef={blockButtonRef}
        onClose={closeMenus}
      >
        {displayNavBlocks.length === 0 ? (
          <p className="px-4 py-3 text-sm text-app-muted">Geen blocks gevonden.</p>
        ) : (
          displayNavBlocks.map((block) => {
            const weeksForBlock = weeksByBlock[block.id] || [];
            const blockStart = getBlockStartDateObject(block);
            const blockEnd = getBlockEndDateObject(block, weeksForBlock);
            const isActive = block.id === blockId;

            return (
              <button
                key={block.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenus();
                  onGoToBlock(block.id);
                }}
                className={`program-mobile-week-nav-menu-item flex w-full flex-col px-4 py-2.5 text-left transition ${
                  isActive ? "is-active" : ""
                }`}
              >
                <span className="truncate text-sm font-bold">{block.title}</span>
                <span className="text-[11px] font-semibold opacity-80">
                  {formatDateRangeLabel(blockStart, blockEnd)}
                </span>
              </button>
            );
          })
        )}
      </ProgramMobileNavMenu>

      <ProgramMobileNavMenu
        open={weekNavOpen}
        anchorRef={weekButtonRef}
        onClose={closeMenus}
      >
        {blockWeeks.length === 0 ? (
          <p className="px-4 py-3 text-sm text-app-muted">Geen weken in dit block.</p>
        ) : (
          blockWeeks.map((item) => {
            const weekStart = activeBlock
              ? getWeekStartDateObject(activeBlock, item, blockWeeks)
              : null;
            const weekEnd = activeBlock
              ? getWeekEndDateObject(activeBlock, item, blockWeeks)
              : null;
            const isActive = item.id === weekId;

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenus();
                  onGoToProgram(blockId, item.id);
                }}
                className={`program-mobile-week-nav-menu-item flex w-full flex-col px-4 py-2.5 text-left transition ${
                  isActive ? "is-active" : ""
                }`}
              >
                <span className="truncate text-sm font-bold">{item.title}</span>
                <span className="text-[11px] font-semibold opacity-80">
                  {formatDateRangeLabel(weekStart, weekEnd)}
                </span>
              </button>
            );
          })
        )}
      </ProgramMobileNavMenu>

      {isCoachLikeRole(role) && (
        <div className="flex flex-wrap gap-2">{programAddMenu}</div>
      )}

      {isCoachLikeRole(role) && creatingMacrocycle && (
        <div className="rounded-2xl border border-app-border bg-app-surface p-3 shadow-sm">
          <input
            value={newMacrocycleTitle}
            onChange={(e) => onNewMacrocycleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateMacrocycle();
            }}
            placeholder="Naam macrocycle"
            className="mb-2 w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-base text-app-text outline-none md:text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCreateMacrocycle}
              className="flex-1 rounded-xl bg-app-accent px-3 py-2 text-sm font-semibold text-white"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={onCancelMacrocycle}
              className="flex-1 rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-muted"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {isCoachLikeRole(role) && creatingBlock && (
        <div className="rounded-2xl border border-app-border bg-app-surface p-3 shadow-sm">
          <input
            value={newBlockTitle}
            onChange={(e) => onNewBlockTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateBlock();
            }}
            placeholder="Naam block"
            className="mb-2 w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-base text-app-text outline-none md:text-sm"
          />
          <ProgramBlockDateField
            value={newBlockStartDate}
            onChange={onNewBlockStartDateChange}
            className="mb-2"
          />
          <textarea
            value={newBlockDescription}
            onChange={(e) => onNewBlockDescriptionChange(e.target.value)}
            placeholder="Beschrijving"
            className="mb-2 min-h-[70px] w-full resize-none rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-base text-app-text outline-none md:text-sm"
          />
          {navMacrocycles.length > 0 && (
            <select
              value={newBlockMacrocycleId}
              onChange={(e) => onNewBlockMacrocycleIdChange(e.target.value)}
              className="mb-2 w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-base text-app-text outline-none md:text-sm"
            >
              <option value="">Geen macrocycle</option>
              {navMacrocycles.map((macrocycle) => (
                <option key={macrocycle.id} value={macrocycle.id}>
                  {macrocycle.title}
                </option>
              ))}
            </select>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCreateBlock}
              className="flex-1 rounded-xl bg-app-accent px-3 py-2 text-sm font-semibold text-white"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={onCancelBlock}
              className="flex-1 rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-muted"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}

      {isCoachLikeRole(role) && creatingWeekBlockId === blockId && (
        <div className="rounded-2xl border border-app-border bg-app-surface p-3 shadow-sm">
          <input
            value={newWeekTitle}
            onChange={(e) => onNewWeekTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onCreateWeek(blockId);
            }}
            placeholder="Naam week"
            className="mb-2 w-full rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-base text-app-text outline-none md:text-sm"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onCreateWeek(blockId)}
              className="flex-1 rounded-xl bg-app-accent px-3 py-2 text-sm font-semibold text-white"
            >
              Opslaan
            </button>
            <button
              type="button"
              onClick={onCancelWeek}
              className="flex-1 rounded-xl border border-app-border bg-app-surface-muted px-3 py-2 text-sm text-app-muted"
            >
              Annuleer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
