"use client";

import { useMemo } from "react";
import { X } from "lucide-react";
import ChatSearchField from "@/components/chat/ChatSearchField";
import HighlightedText from "@/components/chat/HighlightedText";
import {
  buildAppToolItems,
  buildChatToolItems,
  buildProgramToolItems,
  filterChatTools,
  groupChatToolsByCategory,
  type ChatToolItem,
  type ProgramBlockTool,
} from "@/lib/chatTools";

type ChatToolsPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  onSelect: (item: ChatToolItem) => void;
  userRole: string;
  contacts: Array<{ id: string; full_name: string }>;
  groups: Array<{ id: string; name: string }>;
  programs: ProgramBlockTool[];
  loadingPrograms: boolean;
};

export default function ChatToolsPanel({
  query,
  onQueryChange,
  onClose,
  onSelect,
  userRole,
  contacts,
  groups,
  programs,
  loadingPrograms,
}: ChatToolsPanelProps) {
  const filteredGroups = useMemo(() => {
    const items = [
      ...buildAppToolItems(userRole),
      ...buildChatToolItems(contacts, groups),
      ...buildProgramToolItems(programs),
    ];

    return groupChatToolsByCategory(filterChatTools(items, query));
  }, [contacts, groups, programs, query, userRole]);

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-l border-gray-200 bg-white md:w-[320px]">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
        <div>
          <h3 className="text-base font-bold text-black">Tools</h3>
          <p className="text-xs text-gray-500">Zoek pagina&apos;s, chats en programma&apos;s</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="Tools sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="shrink-0 border-b border-gray-200 px-3 py-3">
        <ChatSearchField
          value={query}
          onChange={onQueryChange}
          placeholder="Zoek tools..."
          autoFocus
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        {loadingPrograms && (
          <p className="px-2 py-2 text-xs text-gray-400">Programma&apos;s laden...</p>
        )}

        {filteredGroups.length === 0 && !loadingPrograms && (
          <p className="px-2 py-6 text-sm text-gray-500">Geen resultaten gevonden.</p>
        )}

        {filteredGroups.map((group) => (
          <div key={group.category} className="mb-3">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect(item)}
                  className="flex w-full items-start gap-3 rounded-xl px-2 py-2.5 text-left transition hover:bg-gray-50"
                >
                  <span className="mt-0.5 text-lg leading-none">{item.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-black">
                      <HighlightedText text={item.title} query={query} />
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-gray-500">
                      <HighlightedText text={item.description} query={query} />
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
