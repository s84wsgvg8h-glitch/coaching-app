"use client";

type ChatListMenuSheetProps = {
  open: boolean;
  onClose: () => void;
  pinned: boolean;
  muted: boolean;
  onPin: () => void;
  onMute: () => void;
  onMarkUnread: () => void;
  onClear: () => void;
  onDelete: () => void;
};

export default function ChatListMenuSheet({
  open,
  onClose,
  pinned,
  muted,
  onPin,
  onMute,
  onMarkUnread,
  onClear,
  onDelete,
}: ChatListMenuSheetProps) {
  if (!open) return null;

  function run(action: () => void) {
    onClose();
    action();
  }

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Menu sluiten"
        className="absolute inset-0 bg-app-overlay"
        onClick={onClose}
      />
      <div className="chat-sheet absolute inset-x-0 bottom-0 pb-[max(16px,env(safe-area-inset-bottom))] md:bottom-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2">
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
    </div>
  );
}
