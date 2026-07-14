"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import ProgramBlockDateField from "@/components/programs/ProgramBlockDateField";
import ProgramWeekAddMenu from "./ProgramWeekAddMenu";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  formatDateRangeLabel,
  getBlockEndDateObject,
  getBlockStartDateObject,
  getWeekEndDateObject,
  getWeekStartDateObject,
} from "@/lib/programWeek/dateFormatting";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import type { ProgramBlock, ProgramWeek } from "@/lib/programWeek/types";
import type { ProgramWeekAddMenuProps } from "./ProgramWeekAddMenu";

export type ProgramWeekBlockWeekNavProps = {
  role: string;
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
}: ProgramWeekBlockWeekNavProps) {
  const darkNav = role === "atleet" || isCoachLikeRole(role);
  const blockWeeks = weeksByBlock[blockId] || [];
  const activeBlock = navBlocks.find((block) => block.id === blockId) || currentBlock;
  const activeWeek = blockWeeks.find((item) => item.id === weekId) || week;

  const activeBlockStart = activeBlock
    ? getBlockStartDateObject(activeBlock)
    : null;
  const activeBlockEnd = activeBlock
    ? getBlockEndDateObject(activeBlock, blockWeeks)
    : null;
  const activeWeekStart =
    activeBlock && activeWeek
      ? getWeekStartDateObject(activeBlock, activeWeek)
      : null;
  const activeWeekEnd =
    activeBlock && activeWeek
      ? getWeekEndDateObject(activeBlock, activeWeek)
      : null;

  return (

      <div
        className={`program-mobile-week-nav sticky top-0 z-20 -mx-3 mb-4 space-y-3 px-3 pb-3 pt-[max(0.25rem,env(safe-area-inset-top))] backdrop-blur lg:hidden md:-mx-6 md:px-6 ${
          darkNav ? "program-mobile-week-nav--dark" : "border-b border-gray-200 bg-gray-100/95"
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          <div ref={blockNavRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => {
                setWeekNavOpen(false);
                setBlockNavOpen((current) => !current);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-left text-sm font-bold transition active:scale-95 ${
                blockId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeBlock?.title || "Block"}
                <span
                  className={`block text-[11px] font-semibold ${
                    blockId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeBlockStart, activeBlockEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  blockId ? "text-white/70" : "text-gray-400"
                }`}
              >
                ▼
              </span>
            </button>

            {blockNavOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                {navBlocks.map((block) => {
                  const weeksForBlock = weeksByBlock[block.id] || [];
                  const blockStart = getBlockStartDateObject(block);
                  const blockEnd = getBlockEndDateObject(block, weeksForBlock);
                  const isActive = block.id === blockId;

                  return (
                    <button
                      key={block.id}
                      type="button"
                      onClick={() => {
                        setBlockNavOpen(false);
                        goToBlock(block.id);
                      }}
                      className={`flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                        isActive ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="truncate text-sm font-bold text-black">
                        {block.title}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {formatDateRangeLabel(blockStart, blockEnd)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div ref={weekNavRef} className="relative min-w-0">
            <button
              type="button"
              onClick={() => {
                setBlockNavOpen(false);
                setWeekNavOpen((current) => !current);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-full border px-4 py-2 text-left text-sm font-bold transition active:scale-95 ${
                weekId
                  ? "border-black bg-black text-white"
                  : "border-gray-200 bg-white text-black"
              }`}
            >
              <span className="min-w-0 truncate">
                {activeWeek?.title || "Week"}
                <span
                  className={`block text-[11px] font-semibold ${
                    weekId ? "text-white/75" : "text-gray-500"
                  }`}
                >
                  {formatDateRangeLabel(activeWeekStart, activeWeekEnd)}
                </span>
              </span>
              <span
                className={`shrink-0 text-xs ${
                  weekId ? "text-white/70" : "text-gray-400"
                }`}
              >
                ▼
              </span>
            </button>

            {weekNavOpen && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-lg">
                {blockWeeks.map((item) => {
                  const weekStart =
                    activeBlock ? getWeekStartDateObject(activeBlock, item) : null;
                  const weekEnd =
                    activeBlock ? getWeekEndDateObject(activeBlock, item) : null;
                  const isActive = item.id === weekId;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setWeekNavOpen(false);
                        goToProgram(blockId, item.id);
                      }}
                      className={`flex w-full flex-col px-4 py-2.5 text-left transition hover:bg-gray-50 ${
                        isActive ? "bg-gray-100" : ""
                      }`}
                    >
                      <span className="truncate text-sm font-bold text-black">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-semibold text-gray-500">
                        {formatDateRangeLabel(weekStart, weekEnd)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {isCoachLikeRole(role) && (
          <div className="flex flex-wrap gap-2">
            <ProgramWeekAddMenu
              buttonClassName="rounded-full border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-600 active:scale-95"
              programAddMenuOpen={programAddMenuOpen}
              setProgramAddMenuOpen={setProgramAddMenuOpen}
              onAddMacrocycle={onAddMacrocycle}
              onAddTemplate={onAddTemplate}
              onAddBlock={onAddBlock}
              onAddWeek={onAddWeek}
            />
          </div>
        )}

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
