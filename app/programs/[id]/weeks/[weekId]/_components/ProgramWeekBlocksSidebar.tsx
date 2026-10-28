"use client";

import type { Dispatch, SetStateAction } from "react";
import ProgramNavSidebarRail from "@/components/programs/ProgramNavSidebarRail";
import { CreateTemplateButton } from "@/components/programs/ProgramTemplateActions";
import ProgramBlockDateField from "@/components/programs/ProgramBlockDateField";
import ProgramWeekAddMenu from "./ProgramWeekAddMenu";
import type { ProgramWeekAddMenuProps } from "./ProgramWeekAddMenu";
import { isCoachLikeRole } from "@/lib/authRoles";
import { DELETE_X_BTN } from "@/lib/programWeek/constants";
import { formatDate } from "@/lib/programWeek/dateFormatting";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import type { WeekDropIndicator } from "@/lib/programWeekMove";

export type ProgramWeekBlocksSidebarProps = {
  role: string;
  userId: string;
  blockId: string;
  weekId: string;
  navBlocks: ProgramBlock[];
  navMacrocycles: ProgramMacrocycle[];
  weeksByBlock: Record<string, ProgramWeek[]>;
  openBlockIds: Record<string, boolean>;
  setOpenBlockIds: Dispatch<SetStateAction<Record<string, boolean>>>;
  programAddMenuOpen: boolean;
  creatingMacrocycle: boolean;
  creatingBlock: boolean;
  creatingWeekBlockId: string;
  editingBlockId: string;
  editingWeekId: string;
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
  setEditingBlockId: Dispatch<SetStateAction<string>>;
  setEditingBlockTitle: Dispatch<SetStateAction<string>>;
  setEditingBlockStartDate: Dispatch<SetStateAction<string>>;
  setEditingBlockMacrocycleId: Dispatch<SetStateAction<string>>;
  setEditingWeekId: Dispatch<SetStateAction<string>>;
  setEditingWeekTitle: Dispatch<SetStateAction<string>>;
  setProgramAddMenuOpen: Dispatch<SetStateAction<boolean>>;
  goToProgram: (targetBlockId: string, targetWeekId: string) => void;
  createMacrocycle: () => void | Promise<void>;
  createBlock: () => void | Promise<void>;
  createWeek: (targetBlockId: string) => void | Promise<void>;
  duplicateBlock: (block: ProgramBlock) => void | Promise<void>;
  deleteBlock: (block: ProgramBlock) => void | Promise<void>;
  pendingBlockAction: { blockId: string; type: "duplicate" | "delete" } | null;
  duplicateWeek: (week: ProgramWeek) => void | Promise<void>;
  deleteWeek: (week: ProgramWeek) => void | Promise<void>;
  draggedWeekId?: string;
  weekDropIndicator?: WeekDropIndicator | null;
  movingWeek?: boolean;
  onWeekDragStart?: (
    event: React.DragEvent<HTMLDivElement>,
    week: ProgramWeek,
  ) => void;
  onWeekDragEnd?: () => void;
  onWeekDragOver?: (
    event: React.DragEvent<HTMLElement>,
    blockId: string,
    targetWeekId: string | null,
    position: WeekDropIndicator["position"],
  ) => void;
  onWeekListDragOver?: (
    event: React.DragEvent<HTMLElement>,
    blockId: string,
  ) => void;
} & Pick<
  ProgramWeekAddMenuProps,
  | "programAddMenuOpen"
  | "setProgramAddMenuOpen"
  | "onAddMacrocycle"
  | "onAddTemplate"
  | "onAddBlock"
  | "onAddWeek"
>;

export default function ProgramWeekBlocksSidebar({
  role,
  userId,
  blockId,
  weekId,
  navBlocks,
  navMacrocycles,
  weeksByBlock,
  openBlockIds,
  setOpenBlockIds,
  programAddMenuOpen,
  setProgramAddMenuOpen,
  onAddMacrocycle,
  onAddTemplate,
  onAddBlock,
  onAddWeek,
  creatingMacrocycle,
  creatingBlock,
  creatingWeekBlockId,
  editingBlockId,
  editingWeekId,
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
  setEditingBlockId,
  setEditingBlockTitle,
  setEditingBlockStartDate,
  setEditingBlockMacrocycleId,
  setEditingWeekId,
  setEditingWeekTitle,
  goToProgram,
  createMacrocycle,
  createBlock,
  createWeek,
  duplicateBlock,
  deleteBlock,
  pendingBlockAction,
  duplicateWeek,
  deleteWeek,
  draggedWeekId = "",
  weekDropIndicator = null,
  movingWeek = false,
  onWeekDragStart,
  onWeekDragEnd,
  onWeekDragOver,
  onWeekListDragOver,
}: ProgramWeekBlocksSidebarProps) {
  const coachProgramUi = isCoachLikeRole(role);
  const isBlockActionPending = (targetBlockId: string) =>
    pendingBlockAction?.blockId === targetBlockId;
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
                    : `group/blocks sticky top-0 hidden h-screen self-start overflow-y-auto border-r border-gray-200 bg-white p-3 z-20 transition-all duration-200 lg:block ${
                        sidebarExpanded
                          ? "w-[300px] min-w-[300px]"
                          : "w-[70px] min-w-[70px] [@media(hover:hover)]:hover:w-[300px] [@media(hover:hover)]:hover:min-w-[300px]"
                      }`
                }
              >
                {coachProgramUi ? (
                  <ProgramNavSidebarRail
                    weeks={coachRailWeeks}
                    onSelectWeek={(targetWeekId) =>
                      goToProgram(blockId, targetWeekId)
                    }
                    showAddButton
                    onAddClick={() => setProgramAddMenuOpen((open) => !open)}
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
      
                  {isCoachLikeRole(role) && (
                    <ProgramWeekAddMenu
                      buttonClassName={
                        coachProgramUi
                          ? "coach-program-sidebar-add-btn flex h-9 w-9 shrink-0 items-center justify-center rounded-full p-0 text-white"
                          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black p-0 text-white"
                      }
                      programAddMenuOpen={programAddMenuOpen}
                      setProgramAddMenuOpen={setProgramAddMenuOpen}
                      onAddMacrocycle={onAddMacrocycle}
                      onAddTemplate={onAddTemplate}
                      onAddBlock={onAddBlock}
                      onAddWeek={onAddWeek}
                    />
                  )}
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
                        onChange={(e) => setNewMacrocycleTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createMacrocycle();
                        }}
                        placeholder="Naam macrocycle"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={createMacrocycle}
                          className="flex-1 bg-purple-700 text-white rounded-xl px-3 py-2 text-sm"
                        >
                          Opslaan
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCreatingMacrocycle(false);
                            setNewMacrocycleTitle("");
                          }}
                          className="flex-1 bg-white text-black rounded-xl px-3 py-2 text-sm"
                        >
                          Annuleer
                        </button>
                      </div>
                    </div>
                  )}

                  {isCoachLikeRole(role) && creatingBlock && (
                    <div className="bg-gray-100 rounded-2xl p-3 mb-4">
                      <input
                        value={newBlockTitle}
                        onChange={(e) => setNewBlockTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") createBlock();
                        }}
                        placeholder="Naam block"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
                      />
      
                      <ProgramBlockDateField
                        value={newBlockStartDate}
                        onChange={setNewBlockStartDate}
                        className="mb-2"
                      />
      
                      <textarea
                        value={newBlockDescription}
                        onChange={(e) => setNewBlockDescription(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            createBlock();
                          }
                        }}
                        placeholder="Beschrijving"
                        className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none resize-none min-h-[70px] text-black"
                      />

                      {navMacrocycles.length > 0 && (
                        <select
                          value={newBlockMacrocycleId}
                          onChange={(e) => setNewBlockMacrocycleId(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-2 text-sm mb-2 outline-none text-black"
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
                          className="flex-1 bg-black text-white rounded-xl px-3 py-2 text-sm"
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
                          className="flex-1 bg-white text-black rounded-xl px-3 py-2 text-sm"
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
                          } ${
                            weekDropIndicator?.blockId === block.id &&
                            !isOpen
                              ? "ring-2 ring-brand-blue/40"
                              : ""
                          }`}
                          onDragOver={(event) => {
                            if (!isCoachLikeRole(role) || !draggedWeekId) return;
                            if (!isOpen) {
                              setOpenBlockIds((current) => ({
                                ...current,
                                [block.id]: true,
                              }));
                            }
                            onWeekListDragOver?.(event, block.id);
                          }}
                        >
                          <div
                            className={`group/block p-3 ${
                              activeBlock
                                ? "bg-black text-white"
                                : "bg-gray-50 text-black"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenBlockIds((current) => ({
                                    ...current,
                                    [block.id]: !current[block.id],
                                  }))
                                }
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
                                      setEditingBlockId(block.id);
                                      setEditingBlockTitle(block.title);
                                      setEditingBlockStartDate(
                                        block.start_date || "",
                                      );
                                      setEditingBlockMacrocycleId(
                                        block.macrocycle_id || "",
                                      );
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs ${
                                      activeBlock
                                        ? "bg-white/20 hover:bg-white/30 text-white"
                                        : "bg-white hover:bg-gray-100 text-black"
                                    }`}
                                    title="Aanpassen"
                                  >
                                    ✎
                                  </button>
      
                                  <button
                                    type="button"
                                    disabled={Boolean(pendingBlockAction)}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void duplicateBlock(block);
                                    }}
                                    className={`w-7 h-7 rounded-lg text-xs disabled:cursor-not-allowed disabled:opacity-60 ${
                                      activeBlock
                                        ? "bg-white/20 hover:bg-white/30 text-white"
                                        : "bg-white hover:bg-gray-100 text-black"
                                    }`}
                                    title="Dupliceren"
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
                                    activeTone={activeBlock ? "dark" : "light"}
                                  />
      
                                  <button
                                    type="button"
                                    disabled={Boolean(pendingBlockAction)}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      void deleteBlock(block);
                                    }}
                                    className={`${DELETE_X_BTN} opacity-0 group-hover/block:opacity-100 disabled:cursor-not-allowed disabled:opacity-60 ${
                                      activeBlock ? "opacity-100" : ""
                                    }`}
                                    title="Verwijderen"
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
                              )}
                            </div>
                          </div>
      
                          {isOpen && (
                            <div
                              className="p-2 bg-white space-y-2"
                              onDragOver={(event) =>
                                onWeekListDragOver?.(event, block.id)
                              }
                            >
                              {blockWeeks.map((item) => {
                                const activeWeek = item.id === weekId;
                                const showDropBefore =
                                  weekDropIndicator?.blockId === block.id &&
                                  weekDropIndicator.targetWeekId === item.id &&
                                  weekDropIndicator.position === "before";
                                const isDragging = draggedWeekId === item.id;

                                return (
                                  <div key={item.id} className="relative">
                                    {showDropBefore ? (
                                      <div
                                        className="coach-program-sidebar-week-drop-line"
                                        aria-hidden
                                      />
                                    ) : null}
                                    <div
                                      draggable={
                                        isCoachLikeRole(role) &&
                                        Boolean(onWeekDragStart) &&
                                        !movingWeek
                                      }
                                      onDragStart={(event) =>
                                        onWeekDragStart?.(event, item)
                                      }
                                      onDragEnd={onWeekDragEnd}
                                      onDragOver={(event) =>
                                        onWeekDragOver?.(
                                          event,
                                          block.id,
                                          item.id,
                                          "after",
                                        )
                                      }
                                      className={`group/week rounded-xl ${
                                        coachProgramUi
                                          ? `coach-program-sidebar-week ${
                                              activeWeek ? "is-active" : ""
                                            }`
                                          : activeWeek
                                            ? "bg-black text-white"
                                            : "bg-gray-100 text-black"
                                      } ${isDragging ? "coach-program-sidebar-week--dragging" : ""}`}
                                    >
                                    <div className="flex items-center gap-2 p-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            goToProgram(block.id, item.id)
                                          }
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
                                                setEditingWeekId(item.id);
                                                setEditingWeekTitle(item.title);
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs ${
                                                activeWeek
                                                  ? "bg-white/20 text-white"
                                                  : "bg-white text-black"
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
                                                duplicateWeek(item);
                                              }}
                                              className={`w-7 h-7 rounded-lg text-xs ${
                                                activeWeek
                                                  ? "bg-white/20 text-white"
                                                  : "bg-white text-black"
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
                                                deleteWeek(item);
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
                                  </div>
                                );
                              })}

                              {weekDropIndicator?.blockId === block.id &&
                              weekDropIndicator.targetWeekId === null ? (
                                <div
                                  className="coach-program-sidebar-week-drop-line"
                                  aria-hidden
                                />
                              ) : null}
      
                              {isCoachLikeRole(role) &&
                                creatingWeekBlockId !== block.id && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCreatingWeekBlockId(block.id);
                                      setNewWeekTitle(
                                        `Week ${blockWeeks.length + 1}`,
                                      );
                                    }}
                                    className={`w-full rounded-xl border-2 border-dashed py-2 text-sm ${
                                      coachProgramUi
                                        ? "coach-program-sidebar-add-week"
                                        : "border-gray-300 text-gray-500 hover:border-black hover:text-black"
                                    }`}
                                  >
                                    + Week toevoegen
                                  </button>
                                )}
      
                              {isCoachLikeRole(role) &&
                                creatingWeekBlockId === block.id && (
                                  <div className="bg-gray-100 rounded-xl p-2">
                                    <input
                                      value={newWeekTitle}
                                      onChange={(e) =>
                                        setNewWeekTitle(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") createWeek(block.id);
                                      }}
                                      placeholder="Naam week"
                                      className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-2 text-black bg-white border border-gray-300"
                                    />
      
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={() => createWeek(block.id)}
                                        className="flex-1 bg-black text-white rounded-xl px-2 py-1 text-xs"
                                      >
                                        Opslaan
                                      </button>
      
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCreatingWeekBlockId("");
                                          setNewWeekTitle("");
                                        }}
                                        className="flex-1 bg-white text-black rounded-xl px-2 py-1 text-xs"
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
