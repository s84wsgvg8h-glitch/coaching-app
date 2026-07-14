"use client";

export type ProgramWeekAddMenuProps = {
  buttonClassName: string;
  programAddMenuOpen: boolean;
  setProgramAddMenuOpen: (open: boolean | ((current: boolean) => boolean)) => void;
  onAddMacrocycle: () => void;
  onAddTemplate: () => void;
  onAddBlock: () => void;
  onAddWeek: () => void;
};

export default function ProgramWeekAddMenu({
  buttonClassName,
  programAddMenuOpen,
  setProgramAddMenuOpen,
  onAddMacrocycle,
  onAddTemplate,
  onAddBlock,
  onAddWeek,
}: ProgramWeekAddMenuProps) {
  return (

      <div className="relative">
        <button
          type="button"
          onClick={() => setProgramAddMenuOpen((open) => !open)}
          className={buttonClassName}
          title="Toevoegen"
        >
          +
        </button>

        {programAddMenuOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
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
                onAddTemplate()
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
        )}
      </div>
    
  );
}
