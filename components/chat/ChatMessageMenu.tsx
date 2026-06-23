"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pin, Reply, Trash2 } from "lucide-react";

import { QUICK_REACTION_EMOJIS } from "@/lib/chatReactions";

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
  onReact: (emoji: string) => void;
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
  onReact,
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

  function EmojiRow({ className = "" }: { className?: string }) {
    return (
      <div
        className={`flex flex-wrap items-center justify-center gap-2 border-b border-app-border px-4 py-3 ${className}`}
      >
        {QUICK_REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => run(() => onReact(emoji))}
            className="flex h-10 w-10 items-center justify-center rounded-full text-2xl transition hover:bg-app-surface-hover"
            aria-label={`Reageer met ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    );
  }

  const useSheet = typeof window !== "undefined" && window.innerWidth < 768;

  if (useSheet) {
    return (
      <div className="fixed inset-0 z-[90]">
        <button
          type="button"
          aria-label="Menu sluiten"
          className="absolute inset-0 bg-app-overlay"
          onClick={onClose}
        />
        <div className="chat-sheet absolute inset-x-0 bottom-0 pb-[max(16px,env(safe-area-inset-bottom))]">
          <EmojiRow />
          <button
            type="button"
            onClick={() => run(onReply)}
            className="chat-menu-item"
          >
            <Reply className="h-5 w-5" />
            Beantwoorden
          </button>
          <button
            type="button"
            onClick={() => run(onPin)}
            className="chat-menu-item"
          >
            <Pin className="h-5 w-5" />
            {isPinned ? "Losmaken" : "Vastpinnen"}
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={() => run(onDelete)}
              className="chat-menu-item chat-menu-item-danger"
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
        className="chat-menu-dropdown fixed z-[90] min-w-[200px]"
      >
        <EmojiRow />
        <button
          type="button"
          onClick={() => run(onReply)}
          className="chat-menu-item"
        >
          <Reply className="h-4 w-4" />
          Beantwoorden
        </button>
        <button
          type="button"
          onClick={() => run(onPin)}
          className="chat-menu-item"
        >
          <Pin className="h-4 w-4" />
          {isPinned ? "Losmaken" : "Vastpinnen"}
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => run(onDelete)}
            className="chat-menu-item chat-menu-item-danger"
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
      className={`absolute top-1 hidden h-6 w-6 items-center justify-center rounded-full opacity-70 md:flex md:opacity-0 md:transition md:group-hover:opacity-100 ${
        isMine ? "left-1 text-white/80 hover:bg-white/15" : "right-1 text-app-subtle hover:bg-app-surface-hover"
      }`}
      aria-label="Berichtopties"
    >
      <ChevronDown className="h-4 w-4" />
    </button>
  );
}
