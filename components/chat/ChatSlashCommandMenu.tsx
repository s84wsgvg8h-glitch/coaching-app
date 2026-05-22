"use client";

import type { ChatSlashCommand } from "@/lib/chatCommands";

type ChatSlashCommandMenuProps = {
  commands: ChatSlashCommand[];
  activeIndex: number;
  onSelect: (command: string) => void;
  onHover: (index: number) => void;
};

export default function ChatSlashCommandMenu({
  commands,
  activeIndex,
  onSelect,
  onHover,
}: ChatSlashCommandMenuProps) {
  if (commands.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-30 mb-2 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
      <div className="border-b border-gray-100 px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
          Commando&apos;s
        </p>
      </div>
      <ul className="max-h-56 overflow-y-auto overscroll-contain py-1">
        {commands.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <li key={item.command}>
              <button
                type="button"
                onMouseEnter={() => onHover(index)}
                onClick={() => onSelect(item.command)}
                className={`flex w-full items-start gap-3 px-3 py-2.5 text-left transition ${
                  isActive ? "bg-gray-100" : "hover:bg-gray-50"
                }`}
              >
                <span className="shrink-0 font-mono text-sm font-bold text-black">
                  {item.command}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-black">
                    {item.label}
                  </span>
                  <span className="block text-xs text-gray-500">
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
