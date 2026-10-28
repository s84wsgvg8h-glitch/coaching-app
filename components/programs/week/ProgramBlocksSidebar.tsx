"use client";

import type { ReactNode } from "react";
import ProgramNavSidebarRail from "@/components/programs/ProgramNavSidebarRail";
import ProgramBlockDateField from "@/components/programs/ProgramBlockDateField";
import { CreateTemplateButton } from "@/components/programs/ProgramTemplateActions";
import { isCoachLikeRole } from "@/lib/authRoles";
import { formatDate } from "@/lib/programWeek/dateFormatting";
import { DELETE_X_BTN } from "@/lib/programWeek/constants";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";

export type ProgramBlocksSidebarProps = {
  role: string;
  userId: string;
  blockId: string;
  weekId: string;
  navBlocks: ProgramBlock[];
  navMacrocycles: ProgramMacrocycle[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  openBlockIds: Record<string, boolean>;
  programAddMenuOpen: boolean;
  creatingMacrocycle: boolean;
  creatingBlock: boolean;
  creatingWeekBlockId: string;
  editingBlockId: string;
  editingWeekId: string;
  newMacrocycleTitle: string;
  newBlockTitle: string;
  newBlockDescription: string;
  newBlockStartDate: string;
  newBlockMacrocycleId: string;
  newWeekTitle: string;
  onToggleProgramAddMenu: () => void;
  onNewMacrocycleTitleChange: (value: string) => void;
  onCreateMacrocycle: () => void;
  onCancelMacrocycle: () => void;
  onNewBlockTitleChange: (value: string) => void;
  onNewBlockDescriptionChange: (value: string) => void;
  onNewBlockStartDateChange: (value: string) => void;
  onNewBlockMacrocycleIdChange: (value: string) => void;
  onCreateBlock: () => void;
  onCancelBlock: () => void;
  onToggleBlockOpen: (targetBlockId: string) => void;
  onEditBlock: (block: ProgramBlock) => void;
  onDuplicateBlock: (block: ProgramBlock) => void;
  onDeleteBlock: (block: ProgramBlock) => void;
  onGoToProgram: (targetBlockId: string, targetWeekId: string) => void;
  onEditWeek: (week: ProgramWeek) => void;
  onDuplicateWeek: (week: ProgramWeek) => void;
  onDeleteWeek: (week: ProgramWeek) => void;
  onStartCreateWeek: (targetBlockId: string, defaultTitle: string) => void;
  onNewWeekTitleChange: (value: string) => void;
  onCreateWeek: (targetBlockId: string) => void;
  onCancelWeek: () => void;
  programAddMenu: ReactNode;
};

export default function ProgramBlocksSidebar({
  role,
  userId,
  blockId,
  weekId,
  navBlocks,
  navMacrocycles,
  weeksByBlock,
  openBlockIds,
  programAddMenuOpen,
  creatingMacrocycle,
  creatingBlock,
  creatingWeekBlockId,
  editingBlockId,
  editingWeekId,
  newMacrocycleTitle,
  newBlockTitle,
  newBlockDescription,
  newBlockStartDate,
  newBlockMacrocycleId,
  newWeekTitle,
  onToggleProgramAddMenu,
  onNewMacrocycleTitleChange,
  onCreateMacrocycle,
  onCancelMacrocycle,
  onNewBlockTitleChange,
  onNewBlockDescriptionChange,
  onNewBlockStartDateChange,
  onNewBlockMacrocycleIdChange,
  onCreateBlock,
  onCancelBlock,
  onToggleBlockOpen,
  onEditBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onGoToProgram,
  onEditWeek,
  onDuplicateWeek,
  onDeleteWeek,
  onStartCreateWeek,
  onNewWeekTitleChange,
  onCreateWeek,
  onCancelWeek,
  programAddMenu,
}: ProgramBlocksSidebarProps) {
  const coachProgramUi = isCoachLikeRole(role);
  const orderedSidebarBlocks = [
    ...navMacrocycles.flatMap((macrocycle) =>
      navBlocks.filter((block) => block.macrocycle_id === macrocycle.id),
    ),
    ...navBlocks.filter((block) => !block.macrocycle_id),
  ];
  const sidebarExpanded =
    programAddMenuOpen ||
    creatingMacrocycle ||
    creatingBlock ||
    Boolean(creatingWeekBlockId);

  const sidebarPinned =
    sidebarExpanded ||
    programAddMenuOpen ||
    Boolean(editingBlockId) ||
    Boolean(editingWeekId);

  const coachRailWeeks = (weeksByBlock[blockId] || []).map((item) => ({
    id: item.id,
    label: item.title,
    isActive: item.id === weekId,
  }));

  return (
    <aside
      className={
        coachProgramUi
          ? `program-nav-sidebar coach-program-sidebar sticky top-0 hidden h-screen self-start z-40 lg:flex ${
              sidebarPinned ? "is-pinned" : ""
            }`
          : `group/blocks sticky top-0 hidden h-screen self-start overflow-y-auto border-r border-app-border bg-app-surface p-3 z-20 transition-all duration-200 lg:block ${
              sidebarExpanded
                ? "w-[300px] min-w-[300px]"
                : "w-[70px] min-w-[70px] [@media(hover:hover)]:hover:w-[300px] [@media(hover:hover)]:hover:min-w-[300px]"
            }`
      }
    >
      {coachProgramUi ? (
        <ProgramNavSidebarRail
          weeks={coachRailWeeks}
          onSelectWeek={(targetWeekId) => onGoToProgram(blockId, targetWeekId)}
          showAddButton
          onAddClick={onToggleProgramAddMenu}
        />
      ) : null}

      <div
        className={
          coachProgramUi
            ? "program-nav-sidebar-flyout coach-program-sidebar-flyout"
            : undefined
        }
      >
        <div
          className={
            coachProgramUi
              ? "coach-program-sidebar-header flex items-center justify-between mb-4"
              : "flex items-center justify-between mb-4"
          }
        >
          <div
            className={
              coachProgramUi
                ? "min-w-0"
                : `transition-all duration-150 overflow-hidden whitespace-nowrap ${
                    sidebarExpanded
                      ? "opacity-100"
                      : "opacity-0 group-hover/blocks:opacity-100"
                  }`
            }
          >
            <h2 className="text-lg font-bold">Planning</h2>
          </div>

          {!coachProgramUi ? (
            <div
              className={`text-xl ${
                sidebarExpanded
                  ? "hidden"
                  : "opacity-100 group-hover/blocks:opacity-0 absolute left-5 top-5"
              }`}
            >
              📚
            </div>
          ) : null}

          {isCoachLikeRole(role) && programAddMenu}
        </div>

        <div
          className={
            coachProgramUi
              ? undefined
              : `transition-all duration-150 ${
                  sidebarExpanded
                    ? "opacity-100"
                    : "opacity-0 group-hover/blocks:opacity-100"
                }`
          }
        >
          {isCoachLikeRole(role) && creatingMacrocycle && (
            <div className="bg-purple-50 rounded-2xl p-3 mb-4 border border-purple-100">
              <input
                value={newMacrocycleTitle}
                onChange={(e) => onNewMacrocycleTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateMacrocycle();
                }}
                placeholder="Naam macrocycle"
                className="w-full border border-app-border bg-app-surface-muted rounded-xl px-3 py-2 text-sm mb-2 outline-none text-app-text"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCreateMacrocycle}
                  className="flex-1 bg-purple-700 text-white rounded-xl px-3 py-2 text-sm"
                >
                  Opslaan
                </button>
                <button
                  type="button"
                  onClick={onCancelMacrocycle}
                  className="flex-1 bg-app-surface-muted text-app-text border border-app-border rounded-xl px-3 py-2 text-sm"
                >
                  Annuleer
                </button>
              </div>
            </div>
          )}

          {isCoachLikeRole(role) && creatingBlock && (
            <div className="bg-app-surface rounded-2xl border border-app-border p-3 mb-4">
              <input
                value={newBlockTitle}
                onChange={(e) => onNewBlockTitleChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onCreateBlock();
                }}
                placeholder="Naam block"
                className="w-full border border-app-border bg-app-surface-muted rounded-xl px-3 py-2 text-sm mb-2 outline-none text-app-text"
              />

              <ProgramBlockDateField
                value={newBlockStartDate}
                onChange={onNewBlockStartDateChange}
                className="mb-2"
              />

              <textarea
                value={newBlockDescription}
                onChange={(e) => onNewBlockDescriptionChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onCreateBlock();
                  }
                }}
                placeholder="Beschrijving"
                className="w-full bg-app-surface-muted border border-app-border rounded-xl px-3 py-2 text-sm mb-2 outline-none resize-none min-h-[70px] text-app-text"
              />

              {navMacrocycles.length > 0 && (
                <select
                  value={newBlockMacrocycleId}
                  onChange={(e) => onNewBlockMacrocycleIdChange(e.target.value)}
                  className="w-full border border-app-border bg-app-surface-muted rounded-xl px-3 py-2 text-sm mb-2 outline-none text-app-text"
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
                  className="flex-1 bg-black text-white rounded-xl px-3 py-2 text-sm"
                >
                  Opslaan
                </button>

                <button
                  type="button"
                  onClick={onCancelBlock}
                  className="flex-1 bg-app-surface-muted text-app-text border border-app-border rounded-xl px-3 py-2 text-sm"
                >
                  Annuleer
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {orderedSidebarBlocks.map((block, index) => {
              const macrocycle = navMacrocycles.find(
                (item) => item.id === block.macrocycle_id,
              );
              const previousBlock = orderedSidebarBlocks[index - 1];
              const showMacrocycleHeader =
                macrocycle &&
                previousBlock?.macrocycle_id !== block.macrocycle_id;
              const showUnassignedHeader =
                !macrocycle &&
                navMacrocycles.length > 0 &&
                previousBlock?.macrocycle_id;

              const isOpen = openBlockIds[block.id];
              const activeBlock = block.id === blockId;
              const blockWeeks = weeksByBlock[block.id] || [];

              return (
                <div key={block.id}>
                  {showMacrocycleHeader && (
                    <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-purple-700">
                      {macrocycle.title}
                    </p>
                  )}
                  {showUnassignedHeader && (
                    <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Losse blocks
                    </p>
                  )}
                  <div
                    className={`rounded-2xl border overflow-hidden ${
                      activeBlock ? "border-black" : "border-gray-200"
                    }`}
                  >
                    <div
                      className={`group/block p-3 ${
                        activeBlock
                          ? "bg-black text-white"
                          : "bg-app-surface-muted text-app-text"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleBlockOpen(block.id)}
                          className="flex-1 text-left"
                        >
                          <p
                            className={`text-[10px] mb-1 ${
                              activeBlock ? "text-gray-300" : "text-gray-400"
                            }`}
                          >
                            {formatDate(block.start_date)}
                          </p>

                          <h3 className="font-bold text-sm leading-tight">
                            {isOpen ? "⌄" : "›"} {block.title}
                          </h3>
                        </button>

                        {isCoachLikeRole(role) && (
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onEditBlock(block);
                              }}
                              className={`w-7 h-7 rounded-lg text-xs ${
                                activeBlock
                                  ? "bg-app-accent/20 hover:bg-app-accent/30 text-white"
                                  : "bg-app-surface hover:bg-app-surface-hover text-app-text"
                              }`}
                              title="Aanpassen"
                            >
                              ✎
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDuplicateBlock(block);
                              }}
                              className={`w-7 h-7 rounded-lg text-xs ${
                                activeBlock
                                  ? "bg-app-accent/20 hover:bg-app-accent/30 text-white"
                                  : "bg-app-surface hover:bg-app-surface-hover text-app-text"
                              }`}
                              title="Dupliceren"
                            >
                              ⧉
                            </button>

                            <CreateTemplateButton
                              coachId={userId}
                              blockId={block.id}
                              actingUserId={userId}
                              actingRole={role}
                              compact
                              activeTone={activeBlock ? "dark" : "light"}
                            />

                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onDeleteBlock(block);
                              }}
                              className={`${DELETE_X_BTN} opacity-0 group-hover/block:opacity-100 ${
                                activeBlock ? "opacity-100" : ""
                              }`}
                              title="Verwijderen"
                            >
                              ✕
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="p-2 bg-app-surface space-y-2">
                        {blockWeeks.map((item) => {
                          const activeWeek = item.id === weekId;

                          return (
                            <div
                              key={item.id}
                              className={`group/week rounded-xl ${
                                coachProgramUi
                                  ? `coach-program-sidebar-week ${
                                      activeWeek ? "is-active" : ""
                                    }`
                                  : activeWeek
                                    ? "bg-black text-white"
                                    : "bg-app-surface-hover text-app-text"
                              }`}
                            >
                              <div className="flex items-center gap-2 p-2">
                                <button
                                  type="button"
                                  onClick={() => onGoToProgram(block.id, item.id)}
                                  className="flex-1 text-left text-sm font-semibold"
                                >
                                  {item.title}
                                </button>

                                {isCoachLikeRole(role) && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onEditWeek(item);
                                      }}
                                      className={`w-7 h-7 rounded-lg text-xs ${
                                        activeWeek
                                          ? "bg-app-accent/20 text-white"
                                          : "bg-app-surface text-app-text"
                                      }`}
                                      title="Aanpassen"
                                    >
                                      ✎
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDuplicateWeek(item);
                                      }}
                                      className={`w-7 h-7 rounded-lg text-xs ${
                                        activeWeek
                                          ? "bg-app-accent/20 text-white"
                                          : "bg-app-surface text-app-text"
                                      }`}
                                      title="Dupliceren"
                                    >
                                      ⧉
                                    </button>

                                    <CreateTemplateButton
                                      coachId={userId}
                                      weekId={item.id}
                                      actingUserId={userId}
                                      actingRole={role}
                                      compact
                                      activeTone={activeWeek ? "dark" : "light"}
                                    />

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDeleteWeek(item);
                                      }}
                                      className={`${DELETE_X_BTN} opacity-0 group-hover/week:opacity-100 ${
                                        activeWeek ? "opacity-100" : ""
                                      }`}
                                      title="Verwijderen"
                                    >
                                      ✕
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {isCoachLikeRole(role) &&
                          creatingWeekBlockId !== block.id && (
                            <button
                              type="button"
                              onClick={() =>
                                onStartCreateWeek(
                                  block.id,
                                  `Week ${blockWeeks.length + 1}`,
                                )
                              }
                              className={`w-full rounded-xl border-2 border-dashed py-2 text-sm ${
                                coachProgramUi
                                  ? "coach-program-sidebar-add-week"
                                  : "border-app-border text-app-muted hover:border-app-accent hover:text-app-text"
                              }`}
                            >
                              + Week toevoegen
                            </button>
                          )}

                        {isCoachLikeRole(role) &&
                          creatingWeekBlockId === block.id && (
                            <div className="bg-app-surface rounded-xl border border-app-border p-2">
                              <input
                                value={newWeekTitle}
                                onChange={(e) =>
                                  onNewWeekTitleChange(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") onCreateWeek(block.id);
                                }}
                                placeholder="Naam week"
                                className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-2 text-app-text bg-app-surface-muted border border-app-border"
                              />

                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => onCreateWeek(block.id)}
                                  className="flex-1 bg-black text-white rounded-xl px-2 py-1 text-xs"
                                >
                                  Opslaan
                                </button>

                                <button
                                  type="button"
                                  onClick={onCancelWeek}
                                  className="flex-1 bg-app-surface-muted text-app-text border border-app-border rounded-xl px-2 py-1 text-xs"
                                >
                                  Annuleer
                                </button>
                              </div>
                            </div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
