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
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl md:bottom-auto md:top-1/2 md:left-1/2 md:w-full md:max-w-sm md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-3xl">
        <button
          type="button"
          onClick={() => run(onPin)}
          className="flex w-full px-5 py-4 text-left text-base font-semibold text-black hover:bg-gray-50"
        >
          {pinned ? "Losmaken" : "Vastpinnen"}
        </button>
        <button
          type="button"
          onClick={() => run(onMute)}
          className="flex w-full px-5 py-4 text-left text-base font-semibold text-black hover:bg-gray-50"
        >
          {muted ? "Dempen uit" : "Dempen"}
        </button>
        <button
          type="button"
          onClick={() => run(onMarkUnread)}
          className="flex w-full px-5 py-4 text-left text-base font-semibold text-black hover:bg-gray-50"
        >
          Ongelezen markeren
        </button>
        <button
          type="button"
          onClick={() => run(onClear)}
          className="flex w-full px-5 py-4 text-left text-base font-semibold text-black hover:bg-gray-50"
        >
          Chat wissen
        </button>
        <button
          type="button"
          onClick={() => run(onDelete)}
          className="flex w-full px-5 py-4 text-left text-base font-semibold text-red-600 hover:bg-red-50"
        >
          Chat verwijderen
        </button>
      </div>
    </div>
  );
}
