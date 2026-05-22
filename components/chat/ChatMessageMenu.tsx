"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pin, Reply, Trash2 } from "lucide-react";

type ChatMessageMenuProps = {
  open: boolean;
  onClose: () => void;
  anchorRect: DOMRect | null;
  isMine: boolean;
  canDelete: boolean;
  isPinned: boolean;
  onReply: () => void;
  onPin: () => void;
  onDelete: () => void;
};

export default function ChatMessageMenu({
  open,
  onClose,
  anchorRect,
  isMine,
  canDelete,
  isPinned,
  onReply,
  onPin,
  onDelete,
}: ChatMessageMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!open || !anchorRect || !menuRef.current) return;

    const menu = menuRef.current;
    const margin = 8;
    const width = menu.offsetWidth || 200;
    const height = menu.offsetHeight || 160;

    let top = anchorRect.top - height - margin;
    let left = isMine ? anchorRect.right - width : anchorRect.left;

    if (top < margin) {
      top = anchorRect.bottom + margin;
    }

    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));

    setPosition({ top, left });
  }, [open, anchorRect, isMine]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null;
      if (menuRef.current?.contains(target)) return;
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  function run(action: () => void) {
    onClose();
    action();
  }

  const useSheet = typeof window !== "undefined" && window.innerWidth < 768;

  if (useSheet) {
    return (
      <div className="fixed inset-0 z-[90]">
        <button
          type="button"
          aria-label="Menu sluiten"
          className="absolute inset-0 bg-black/45"
          onClick={onClose}
        />
        <div className="absolute inset-x-0 bottom-0 rounded-t-3xl bg-white pb-[max(16px,env(safe-area-inset-bottom))] shadow-2xl">
          <button
            type="button"
            onClick={() => run(onReply)}
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-base font-semibold text-black"
          >
            <Reply className="h-5 w-5" />
            Beantwoorden
          </button>
          <button
            type="button"
            onClick={() => run(onPin)}
            className="flex w-full items-center gap-3 px-5 py-4 text-left text-base font-semibold text-black"
          >
            <Pin className="h-5 w-5" />
            {isPinned ? "Losmaken" : "Vastpinnen"}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => run(onDelete)}
              className="flex w-full items-center gap-3 px-5 py-4 text-left text-base font-semibold text-red-600"
            >
              <Trash2 className="h-5 w-5" />
              Verwijderen
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="Menu sluiten"
        className="fixed inset-0 z-[89] cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        ref={menuRef}
        style={{ top: position.top, left: position.left }}
        className="fixed z-[90] min-w-[200px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
      >
        <button
          type="button"
          onClick={() => run(onReply)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
        >
          <Reply className="h-4 w-4" />
          Beantwoorden
        </button>
        <button
          type="button"
          onClick={() => run(onPin)}
          className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-black hover:bg-gray-50"
        >
          <Pin className="h-4 w-4" />
          {isPinned ? "Losmaken" : "Vastpinnen"}
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => run(onDelete)}
            className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Verwijderen
          </button>
        )}
      </div>
    </>
  );
}

export function ChatMessageMenuTrigger({
  isMine,
  onOpen,
}: {
  isMine: boolean;
  onOpen: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen(event);
      }}
      className={`absolute top-1 flex h-6 w-6 items-center justify-center rounded-full opacity-70 md:opacity-0 md:transition md:group-hover:opacity-100 ${
        isMine ? "left-1 text-white/80 hover:bg-white/15" : "right-1 text-gray-400 hover:bg-gray-100"
      }`}
      aria-label="Berichtopties"
    >
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}
