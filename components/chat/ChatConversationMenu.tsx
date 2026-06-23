"use client";

import { useState } from "react";
import { MoreVertical } from "lucide-react";

type ChatConversationMenuProps = {
  onPin: () => void;
  onMute: () => void;
  onMarkUnread: () => void;
  onClear: () => void;
  onDelete: () => void;
  pinned: boolean;
  muted: boolean;
};

export default function ChatConversationMenu({
  onPin,
  onMute,
  onMarkUnread,
  onClear,
  onDelete,
  pinned,
  muted,
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
          <div className="chat-menu-dropdown absolute right-0 top-11 z-20 min-w-[220px]">
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
