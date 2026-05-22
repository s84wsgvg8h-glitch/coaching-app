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
        className="rounded-xl p-2 hover:bg-gray-100"
        aria-label="Chat opties"
      >
        <MoreVertical className="h-5 w-5 text-black" />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Menu sluiten"
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-11 z-20 min-w-[220px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg">
            <button
              type="button"
              onClick={() => run(onPin)}
              className="flex w-full px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
            >
              {pinned ? "Losmaken" : "Vastpinnen"}
            </button>
            <button
              type="button"
              onClick={() => run(onMute)}
              className="flex w-full px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
            >
              {muted ? "Dempen uit" : "Dempen"}
            </button>
            <button
              type="button"
              onClick={() => run(onMarkUnread)}
              className="flex w-full px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
            >
              Ongelezen markeren
            </button>
            <button
              type="button"
              onClick={() => run(onClear)}
              className="flex w-full px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
            >
              Chat wissen
            </button>
            <button
              type="button"
              onClick={() => run(onDelete)}
              className="flex w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Chat verwijderen
            </button>
          </div>
        </>
      )}
    </div>
  );
}
