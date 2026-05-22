"use client";

import { ArrowLeft } from "lucide-react";
import ChatSearchField from "@/components/chat/ChatSearchField";
import HighlightedText from "@/components/chat/HighlightedText";
import {
  formatChatListTime,
  formatMessageTime,
  type ChatMessage,
} from "@/lib/chatUtils";
import { getSearchableMessageText, messageMatchesQuery } from "@/lib/chatSearch";

type ChatMessageSearchPanelProps = {
  query: string;
  onQueryChange: (value: string) => void;
  onClose: () => void;
  messages: ChatMessage[];
  onSelectMessage: (message: ChatMessage) => void;
};

export default function ChatMessageSearchPanel({
  query,
  onQueryChange,
  onClose,
  messages,
  onSelectMessage,
}: ChatMessageSearchPanelProps) {
  const results = messages.filter((message) => messageMatchesQuery(message, query));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 px-3 py-3 md:px-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 hover:bg-gray-100"
          aria-label="Zoeken sluiten"
        >
          <ArrowLeft className="h-5 w-5 text-black" />
        </button>
        <h2 className="text-lg font-semibold text-black">Zoek in berichten</h2>
      </div>

      <div className="shrink-0 border-b border-gray-200 px-3 py-3 md:px-4">
        <ChatSearchField
          value={query}
          onChange={onQueryChange}
          placeholder="Zoeken..."
          accent
          autoFocus
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {query.trim() && results.length === 0 && (
          <p className="px-4 py-6 text-sm text-gray-500">
            Geen berichten gevonden.
          </p>
        )}

        {results.map((message) => {
          const text = getSearchableMessageText(message);

          return (
            <button
              key={message.id}
              type="button"
              onClick={() => onSelectMessage(message)}
              className="flex w-full flex-col gap-1 border-b border-gray-100 px-4 py-3 text-left hover:bg-gray-50"
            >
              <span className="text-xs font-medium text-gray-400">
                {formatChatListTime(message.created_at) ||
                  formatMessageTime(message.created_at)}
              </span>
              <p className="line-clamp-2 text-sm leading-6 text-black">
                <HighlightedText text={text} query={query} />
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
