"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import { useRef } from "react";
import ProgramBlockDateField from "@/components/programs/ProgramBlockDateField";
import ProgramMobileNavMenu from "@/components/programs/week/ProgramMobileNavMenu";
import { CreateTemplateButton } from "@/components/programs/ProgramTemplateActions";
import {
  CoachProgramEditorViewSelect,
  type EditorView,
} from "@/components/programs/coach/CoachProgramWeekHeader";
import CoachProgramWeekCompareView from "@/components/programs/coach/CoachProgramWeekCompareView";
import { isCoachLikeRole } from "@/lib/authRoles";
import { DELETE_X_BTN } from "@/lib/programWeek/constants";
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
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type {
  ProgramBlock,
  ProgramDay,
  ProgramExercise,
  ProgramWeek,
} from "@/lib/programWeek/types";
import type { ProgramWeekAddMenuProps } from "./ProgramWeekAddMenu";

export type ProgramWeekBlockWeekNavProps = {
  role: string;
  userId: string;
  blockId: string;
  weekId: string;
  navBlocks: ProgramBlock[];
  navMacrocycles: ProgramMacrocycle[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  currentBlock: ProgramBlock | null;
  week: ProgramWeek | null;
  blockNavRef: RefObject<HTMLDivElement | null>;
  weekNavRef: RefObject<HTMLDivElement | null>;
  blockNavOpen: boolean;
  weekNavOpen: boolean;
  setBlockNavOpen: Dispatch<SetStateAction<boolean>>;
  setWeekNavOpen: Dispatch<SetStateAction<boolean>>;
  goToBlock: (targetBlockId: string) => void;
  goToProgram: (targetBlockId: string, targetWeekId: string) => void;
  creatingMacrocycle: boolean;
  creatingBlock: boolean;
  creatingWeekBlockId: string;
  newMacrocycleTitle: string;
  newBlockTitle: string;
  newBlockStartDate: string;
  newBlockDescription: string;
  newBlockMacrocycleId: string;
  newWeekTitle: string;
  setNewMacrocycleTitle: Dispatch<SetStateAction<string>>;
  setNewBlockTitle: Dispatch<SetStateAction<string>>;
  setNewBlockStartDate: Dispatch<SetStateAction<string>>;
  setNewBlockDescription: Dispatch<SetStateAction<string>>;
  setNewBlockMacrocycleId: Dispatch<SetStateAction<string>>;
  setNewWeekTitle: Dispatch<SetStateAction<string>>;
  setCreatingMacrocycle: Dispatch<SetStateAction<boolean>>;
  setCreatingBlock: Dispatch<SetStateAction<boolean>>;
  setCreatingWeekBlockId: Dispatch<SetStateAction<string>>;
  createMacrocycle: () => void | Promise<void>;
  createBlock: () => void | Promise<void>;
  createWeek: (targetBlockId: string) => void | Promise<void>;
  duplicateBlock: (block: ProgramBlock) => void | Promise<void>;
  deleteBlock: (block: ProgramBlock) => void | Promise<void>;
  pendingBlockAction: { blockId: string; type: "duplicate" | "delete" } | null;
  duplicateWeek: (week: ProgramWeek) => void | Promise<void>;
  deleteWeek: (week: ProgramWeek) => void | Promise<void>;
  setEditingBlockId: Dispatch<SetStateAction<string>>;
  setEditingBlockTitle: Dispatch<SetStateAction<string>>;
  setEditingBlockStartDate: Dispatch<SetStateAction<string>>;
  setEditingBlockMacrocycleId: Dispatch<SetStateAction<string>>;
  setEditingWeekId: Dispatch<SetStateAction<string>>;
  setEditingWeekTitle: Dispatch<SetStateAction<string>>;
  editorView?: EditorView;
  onEditorViewChange?: (view: EditorView) => void;
  showEditorViewToggle?: boolean;
  showCompareView?: boolean;
  compareCurrentDays?: ProgramDay[];
  compareCurrentExercisesByDay?: Record<string, ProgramExercise[]>;
} & Pick<
  ProgramWeekAddMenuProps,
  | "programAddMenuOpen"
  | "setProgramAddMenuOpen"
  | "onAddMacrocycle"
  | "onAddTemplate"
  | "onAddBlock"
  | "onAddWeek"
>;

export default function ProgramWeekBlockWeekNav({
  role,
  userId,
  blockId,
  weekId,
  navBlocks,
  navMacrocycles,
  weeksByBlock,
  currentBlock,
  week,
  blockNavRef,
  weekNavRef,
  blockNavOpen,
  weekNavOpen,
  setBlockNavOpen,
  setWeekNavOpen,
  goToBlock,
  goToProgram,
  programAddMenuOpen,
  setProgramAddMenuOpen,
  onAddMacrocycle,
  onAddTemplate,
  onAddBlock,
  onAddWeek,
  creatingMacrocycle,
  creatingBlock,
  creatingWeekBlockId,
  newMacrocycleTitle,
  newBlockTitle,
  newBlockStartDate,
  newBlockDescription,
  newBlockMacrocycleId,
  newWeekTitle,
  setNewMacrocycleTitle,
  setNewBlockTitle,
  setNewBlockStartDate,
  setNewBlockDescription,
  setNewBlockMacrocycleId,
  setNewWeekTitle,
  setCreatingMacrocycle,
  setCreatingBlock,
  setCreatingWeekBlockId,
  createMacrocycle,
  createBlock,
  createWeek,
  duplicateBlock,
  deleteBlock,
  pendingBlockAction,
  duplicateWeek,
  deleteWeek,
  setEditingBlockId,
  setEditingBlockTitle,
  setEditingBlockStartDate,
  setEditingBlockMacrocycleId,
  setEditingWeekId,
  setEditingWeekTitle,
  editorView = "card",
  onEditorViewChange,
  showEditorViewToggle = false,
  showCompareView = false,
  compareCurrentDays = [],
  compareCurrentExercisesByDay = {},
}: ProgramWeekBlockWeekNavProps) {
  const isCoach = isCoachLikeRole(role);
  const darkNav = role === "atleet" || isCoach;
  const isBlockActionPending = (targetBlockId: string) =>
    pendingBlockAction?.blockId === targetBlockId;
  const blockButtonRef = useRef<HTMLButtonElement | null>(null);
  const weekButtonRef = useRef<HTMLButtonElement | null>(null);
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

  return (

      <div
        className={`program-mobile-week-nav relative z-30 -mx-3 mb-3 space-y-2 overflow-visible px-3 pb-2 pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur lg:hidden md:-mx-6 md:px-6 ${
          darkNav ? "program-mobile-week-nav--dark" : "border-b border-gray-200 bg-gray-100/95"
        }${isCoach ? " program-mobile-week-nav--coach-compact" : ""}`}
      >
        <div className="grid grid-cols-2 gap-2">
          <div ref={blockNavRef} className="relative min-w-0">
            <button
              ref={blockButtonRef}
              type="button"
              onClick={openBlockMenu}
              aria-expanded={blockNavOpen}
              aria-haspopup="menu"
              className={`program-mobile-week-nav-chip flex w-full items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-bold transition active:scale-95 ${
                blockNavOpen || blockId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeBlock?.title || "Block"}
                <span
                  className={`block text-[10px] font-semibold ${
                    blockId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeBlockStart, activeBlockEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-[10px] ${
                  blockId ? "text-white/70" : "text-gray-400"
                }`}
              >
                {blockNavOpen ? "▲" : "▼"}
              </span>
            </button>
          </div>

          <div ref={weekNavRef} className="relative min-w-0">
            <button
              ref={weekButtonRef}
              type="button"
              onClick={openWeekMenu}
              aria-expanded={weekNavOpen}
              aria-haspopup="menu"
              className={`program-mobile-week-nav-chip flex w-full items-center justify-between gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-bold transition active:scale-95 ${
                weekNavOpen || weekId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeWeek?.title || "Week"}
                <span
                  className={`block text-[10px] font-semibold ${
                    weekId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeWeekStart, activeWeekEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-[10px] ${
                  weekId ? "text-white/70" : "text-gray-400"
                }`}
              >
                {weekNavOpen ? "▲" : "▼"}
              </span>
            </button>
          </div>
        </div>

        <ProgramMobileNavMenu
          open={blockNavOpen}
          anchorRef={blockButtonRef}
          onClose={closeMenus}
          wide={isCoach}
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
                <div
                  key={block.id}
                  className={`program-mobile-week-nav-menu-row ${
                    isActive ? "is-active" : ""
                  }`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenus();
                      goToBlock(block.id);
                    }}
                    className="program-mobile-week-nav-menu-row-main"
                  >
                    <span className="truncate text-sm font-bold">{block.title}</span>
                    <span className="text-[11px] font-semibold opacity-80">
                      {formatDateRangeLabel(blockStart, blockEnd)}
                    </span>
                  </button>

                  {isCoach ? (
                    <div className="program-mobile-week-nav-menu-row-actions">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          closeMenus();
                          setEditingBlockId(block.id);
                          setEditingBlockTitle(block.title);
                          setEditingBlockStartDate(block.start_date || "");
                          setEditingBlockMacrocycleId(block.macrocycle_id || "");
                        }}
                        className="program-mobile-week-nav-menu-action"
                        title="Aanpassen"
                        aria-label={`${block.title} aanpassen`}
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        disabled={Boolean(pendingBlockAction)}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          closeMenus();
                          void duplicateBlock(block);
                        }}
                        className="program-mobile-week-nav-menu-action disabled:cursor-not-allowed disabled:opacity-60"
                        title="Dupliceren"
                        aria-label={`${block.title} dupliceren`}
                        aria-busy={
                          isBlockActionPending(block.id) &&
                          pendingBlockAction?.type === "duplicate"
                        }
                      >
                        {isBlockActionPending(block.id) &&
                        pendingBlockAction?.type === "duplicate" ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        ) : (
                          "⧉"
                        )}
                      </button>

                      <CreateTemplateButton
                        coachId={userId}
                        blockId={block.id}
                        actingUserId={userId}
                        actingRole={role}
                        compact
                        activeTone={isActive ? "dark" : "light"}
                      />

                      <button
                        type="button"
                        disabled={Boolean(pendingBlockAction)}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          closeMenus();
                          void deleteBlock(block);
                        }}
                        className={`${DELETE_X_BTN} program-mobile-week-nav-menu-action program-mobile-week-nav-menu-action--delete disabled:cursor-not-allowed disabled:opacity-60`}
                        title="Verwijderen"
                        aria-label={`${block.title} verwijderen`}
                        aria-busy={
                          isBlockActionPending(block.id) &&
                          pendingBlockAction?.type === "delete"
                        }
                      >
                        {isBlockActionPending(block.id) &&
                        pendingBlockAction?.type === "delete" ? (
                          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />
                        ) : (
                          "✕"
                        )}
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          {isCoach && !creatingBlock ? (
            <button
              type="button"
              onClick={() => {
                closeMenus();
                onAddBlock();
              }}
              className="program-mobile-week-nav-menu-add-week"
            >
              + Block toevoegen
            </button>
          ) : null}
        </ProgramMobileNavMenu>

        <ProgramMobileNavMenu
          open={weekNavOpen}
          anchorRef={weekButtonRef}
          onClose={closeMenus}
          wide={isCoach}
        >
          {blockWeeks.length === 0 ? (
            <p className="px-4 py-3 text-sm text-app-muted">Geen weken in dit block.</p>
          ) : (
            blockWeeks.map((item) => {
              const weekStart =
                activeBlock
                  ? getWeekStartDateObject(activeBlock, item, blockWeeks)
                  : null;
              const weekEnd =
                activeBlock
                  ? getWeekEndDateObject(activeBlock, item, blockWeeks)
                  : null;
              const isActive = item.id === weekId;

              return (
                <div
                  key={item.id}
                  className={`program-mobile-week-nav-menu-row ${
                    isActive ? "is-active" : ""
                  }`}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      closeMenus();
                      goToProgram(blockId, item.id);
                    }}
                    className="program-mobile-week-nav-menu-row-main"
                  >
                    <span className="truncate text-sm font-bold">{item.title}</span>
                    <span className="text-[11px] font-semibold opacity-80">
                      {formatDateRangeLabel(weekStart, weekEnd)}
                    </span>
                  </button>

                  {isCoach ? (
                    <div className="program-mobile-week-nav-menu-row-actions">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          closeMenus();
                          setEditingWeekId(item.id);
                          setEditingWeekTitle(item.title);
                        }}
                        className="program-mobile-week-nav-menu-action"
                        title="Aanpassen"
                        aria-label={`${item.title} aanpassen`}
                      >
                        ✎
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          closeMenus();
                          void duplicateWeek(item);
                        }}
                        className="program-mobile-week-nav-menu-action"
                        title="Dupliceren"
                        aria-label={`${item.title} dupliceren`}
                      >
                        ⧉
                      </button>

                      <CreateTemplateButton
                        coachId={userId}
                        weekId={item.id}
                        actingUserId={userId}
                        actingRole={role}
                        compact
                        activeTone={isActive ? "dark" : "light"}
                      />

                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          closeMenus();
                          void deleteWeek(item);
                        }}
                        className={`${DELETE_X_BTN} program-mobile-week-nav-menu-action program-mobile-week-nav-menu-action--delete`}
                        title="Verwijderen"
                        aria-label={`${item.title} verwijderen`}
                      >
                        ✕
                      </button>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          {isCoach && creatingWeekBlockId !== blockId ? (
            <button
              type="button"
              onClick={() => {
                closeMenus();
                setCreatingWeekBlockId(blockId);
                setNewWeekTitle(`Week ${blockWeeks.length + 1}`);
              }}
              className="program-mobile-week-nav-menu-add-week"
            >
              + Week toevoegen
            </button>
          ) : null}
        </ProgramMobileNavMenu>

        {isCoach && showEditorViewToggle && onEditorViewChange ? (
          <div className="program-mobile-week-nav-toolbar flex items-center gap-2 overflow-visible">
            {showCompareView ? (
              <CoachProgramWeekCompareView
                className="program-mobile-week-nav-compare"
                currentBlockId={blockId}
                currentWeekId={weekId}
                currentBlock={currentBlock}
                currentWeek={week}
                currentDays={compareCurrentDays}
                currentExercisesByDay={compareCurrentExercisesByDay}
                navBlocks={navBlocks}
                weeksByBlock={weeksByBlock}
                userId={userId}
                role={role}
                onOpenWeek={goToProgram}
              />
            ) : null}
            <CoachProgramEditorViewSelect
              editorView={editorView}
              onEditorViewChange={onEditorViewChange}
              className="program-mobile-week-nav-view-select"
            />
          </div>
        ) : null}

        {isCoachLikeRole(role) && creatingMacrocycle && (
          <div className="rounded-2xl border border-purple-200 bg-white p-3 shadow-sm">
            <input
              value={newMacrocycleTitle}
              onChange={(e) => setNewMacrocycleTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createMacrocycle();
              }}
              placeholder="Naam macrocycle"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={createMacrocycle}
                className="flex-1 rounded-xl bg-purple-700 px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingMacrocycle(false);
                  setNewMacrocycleTitle("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {isCoachLikeRole(role) && creatingBlock && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <input
              value={newBlockTitle}
              onChange={(e) => setNewBlockTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createBlock();
              }}
              placeholder="Naam block"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <ProgramBlockDateField
              value={newBlockStartDate}
              onChange={setNewBlockStartDate}
              className="mb-2"
            />
            <textarea
              value={newBlockDescription}
              onChange={(e) => setNewBlockDescription(e.target.value)}
              placeholder="Beschrijving"
              className="mb-2 min-h-[70px] w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            {navMacrocycles.length > 0 && (
              <select
                value={newBlockMacrocycleId}
                onChange={(e) => setNewBlockMacrocycleId(e.target.value)}
                className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
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
                onClick={createBlock}
                className="flex-1 rounded-xl bg-black px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingBlock(false);
                  setNewBlockTitle("");
                  setNewBlockDescription("");
                  setNewBlockStartDate("");
                  setNewBlockMacrocycleId("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}

        {isCoachLikeRole(role) && creatingWeekBlockId === blockId && (
          <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
            <input
              value={newWeekTitle}
              onChange={(e) => setNewWeekTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") createWeek(blockId);
              }}
              placeholder="Naam week"
              className="mb-2 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-base text-black outline-none md:text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => createWeek(blockId)}
                className="flex-1 rounded-xl bg-black px-3 py-2 text-sm text-white"
              >
                Opslaan
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatingWeekBlockId("");
                  setNewWeekTitle("");
                }}
                className="flex-1 rounded-xl bg-gray-100 px-3 py-2 text-sm text-black"
              >
                Annuleer
              </button>
            </div>
          </div>
        )}
      </div>
  );
}
