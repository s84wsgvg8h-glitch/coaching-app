"use client";

import { useState } from "react";
import { Ban, Flag, MoreVertical } from "lucide-react";

type ChatConversationMenuProps = {
  onPin: () => void;
  onMute: () => void;
  onMarkUnread: () => void;
  onClear: () => void;
  onDelete: () => void;
  pinned: boolean;
  muted: boolean;
  isDirect?: boolean;
  onReport?: () => void;
  onBlock?: () => void;
  onSearch?: () => void;
  onAiAssistant?: () => void;
  showAiAssistant?: boolean;
};

export default function ChatConversationMenu({
  onPin,
  onMute,
  onMarkUnread,
  onClear,
  onDelete,
  pinned,
  muted,
  isDirect = false,
  onReport,
  onBlock,
  onSearch,
  onAiAssistant,
  showAiAssistant = false,
}: ChatConversationMenuProps) {
  const [open, setOpen] = useState(false);

  function run(action: () => void) {
    setOpen(false);
    action();
  }

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="ui-icon-btn app-focus-ring"
        aria-label="Chat opties"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Menu sluiten"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="chat-menu-dropdown absolute right-0 top-full z-20 mt-1 min-w-[220px]">
            {onSearch ? (
              <button
                type="button"
                onClick={() => run(onSearch)}
                className="chat-menu-item"
              >
                Zoeken
              </button>
            ) : null}
            {showAiAssistant && onAiAssistant ? (
              <button
                type="button"
                onClick={() => run(onAiAssistant)}
                className="chat-menu-item"
              >
                AI-assistent
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => run(onPin)}
              className="chat-menu-item"
            >
              {pinned ? "Losmaken" : "Vastpinnen"}
            </button>
            <button
              type="button"
              onClick={() => run(onMute)}
              className="chat-menu-item"
            >
              {muted ? "Dempen uit" : "Dempen"}
            </button>
            <button
              type="button"
              onClick={() => run(onMarkUnread)}
              className="chat-menu-item"
            >
              Ongelezen markeren
            </button>
            <button
              type="button"
              onClick={() => run(onClear)}
              className="chat-menu-item"
            >
              Chat wissen
            </button>
            {onReport ? (
              <button
                type="button"
                onClick={() => run(onReport)}
                className="chat-menu-item"
              >
                <Flag className="h-4 w-4" />
                {isDirect ? "Gebruiker melden" : "Gesprek melden"}
              </button>
            ) : null}
            {isDirect && onBlock ? (
              <button
                type="button"
                onClick={() => run(onBlock)}
                className="chat-menu-item chat-menu-item-danger"
              >
                <Ban className="h-4 w-4" />
                Gebruiker blokkeren
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => run(onDelete)}
              className="chat-menu-item chat-menu-item-danger"
            >
              Chat verwijderen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
