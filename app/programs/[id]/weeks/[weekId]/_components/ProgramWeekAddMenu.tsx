"use client";

import { useEffect, useRef } from "react";
import { Plus } from "lucide-react";

export type ProgramWeekAddMenuProps = {
  buttonClassName: string;
  menuAlign?: "left" | "right";
  programAddMenuOpen: boolean;
  setProgramAddMenuOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  onAddMacrocycle: () => void;
  onAddTemplate: () => void;
  onAddBlock: () => void;
  onAddWeek: () => void;
};

export default function ProgramWeekAddMenu({
  buttonClassName,
  menuAlign = "right",
  programAddMenuOpen,
  setProgramAddMenuOpen,
  onAddMacrocycle,
  onAddTemplate,
  onAddBlock,
  onAddWeek,
}: ProgramWeekAddMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!programAddMenuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (menuRef.current?.contains(target)) return;
      if (
        target instanceof Element &&
        target.closest(".program-nav-sidebar-rail-add")
      ) {
        return;
      }
      setProgramAddMenuOpen(false);
    }

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [programAddMenuOpen, setProgramAddMenuOpen]);

  return (
    <div ref={menuRef} className="program-week-add-menu relative">
      <button
        type="button"
        onClick={() => setProgramAddMenuOpen((open) => !open)}
        className={buttonClassName}
        title="Toevoegen"
        aria-expanded={programAddMenuOpen}
        aria-haspopup="menu"
      >
        <Plus className="h-[1.125rem] w-[1.125rem] shrink-0 stroke-[2.5]" aria-hidden />
      </button>

      {programAddMenuOpen ? (
        <div
          role="menu"
          className={`program-week-add-menu-dropdown absolute top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg ${
            menuAlign === "left" ? "left-0" : "right-0"
          }`}
        >
          <button
            type="button"
            onClick={() => onAddMacrocycle()}
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-purple-700 hover:bg-purple-50"
          >
            Macrocyclus
          </button>
          <button
            type="button"
            onClick={() => {
              onAddTemplate();
            }}
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-purple-700 hover:bg-purple-50"
          >
            Template
          </button>
          <button
            type="button"
            onClick={() => onAddBlock()}
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-black hover:bg-gray-50"
          >
            Block
          </button>
          <button
            type="button"
            onClick={() => onAddWeek()}
            className="block w-full px-3 py-2 text-left text-sm font-semibold text-black hover:bg-gray-50"
          >
            Week
          </button>
        </div>
      ) : null}
    </div>
  );
}
