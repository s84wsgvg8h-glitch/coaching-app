"use client";

import { useMemo } from "react";
import { ArrowLeft } from "lucide-react";
import ChatSearchField from "@/components/chat/ChatSearchField";
import HighlightedText from "@/components/chat/HighlightedText";
import {
  formatChatListTime,
  formatMessageTime,
  type ChatMessage,
} from "@/lib/chatUtils";
import {
  getSearchableMessageText,
  getSearchSnippet,
  messageMatchesQuery,
} from "@/lib/chatSearch";

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
  const trimmedQuery = query.trim();

  const results = useMemo(
    () =>
      trimmedQuery
        ? messages.filter((message) => messageMatchesQuery(message, trimmedQuery))
        : [],
    [messages, trimmedQuery],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-surface">
      <div className="flex shrink-0 items-center gap-3 border-b border-app-border px-3 py-2.5 md:px-4">
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn app-focus-ring"
          aria-label="Zoeken sluiten"
        >
          <ArrowLeft className="h-4 w-4 text-app-text" />
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-app-text">Zoek in berichten</h2>
          {trimmedQuery ? (
            <p className="text-xs text-app-muted">
              {results.length} {results.length === 1 ? "resultaat" : "resultaten"}
            </p>
          ) : null}
        </div>
      </div>

      <div className="shrink-0 border-b border-app-border px-3 py-2.5 md:px-4">
        <ChatSearchField
          value={query}
          onChange={onQueryChange}
          placeholder="Zoeken..."
          autoFocus
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        {!trimmedQuery && (
          <p className="px-4 py-6 text-sm text-app-muted">
            Typ om berichten te doorzoeken.
          </p>
        )}

        {trimmedQuery && results.length === 0 && (
          <p className="px-4 py-6 text-sm text-app-muted">
            Geen berichten gevonden voor &ldquo;{trimmedQuery}&rdquo;.
          </p>
        )}

        {results.map((message) => {
          const text = getSearchableMessageText(message);
          const snippet = getSearchSnippet(text, trimmedQuery);

          return (
            <button
              key={message.id}
              type="button"
              onClick={() => onSelectMessage(message)}
              className="flex w-full flex-col gap-1 border-b border-app-border px-4 py-3 text-left transition hover:bg-app-surface-hover active:bg-app-surface-muted"
            >
              <span className="text-[11px] font-medium text-app-subtle">
                {formatChatListTime(message.created_at) ||
                  formatMessageTime(message.created_at)}
              </span>
              <p className="line-clamp-2 text-[13px] leading-5 text-app-text">
                <HighlightedText text={snippet} query={trimmedQuery} />
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
