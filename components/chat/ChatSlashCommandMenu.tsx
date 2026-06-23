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
    <div className="chat-menu-dropdown absolute bottom-full left-0 z-30 mb-1.5 w-full shadow-md">
      <ul className="max-h-36 overflow-y-auto overscroll-contain py-0.5">
        {commands.map((item, index) => {
          const isActive = index === activeIndex;

          return (
            <li key={item.command}>
              <button
                type="button"
                onMouseEnter={() => onHover(index)}
                onClick={() => onSelect(item.command)}
                className={`flex w-full items-center gap-2 px-2 py-1.5 text-left transition ${
                  isActive ? "bg-app-surface-hover" : "hover:bg-app-surface-muted"
                }`}
              >
                <span className="shrink-0 font-mono text-[11px] font-bold text-app-text">
                  {item.command}
                </span>
                <span className="min-w-0 truncate text-[11px] font-semibold text-app-muted">
                  {item.label}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
