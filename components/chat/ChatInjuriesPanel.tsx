"use client";

import { X } from "lucide-react";
import MuscleBodyMap from "@/components/MuscleBodyMap";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatInjuriesPanelProps = {
  athleteName: string;
  onClose: () => void;
};

export default function ChatInjuriesPanel({
  athleteName,
  onClose,
}: ChatInjuriesPanelProps) {
  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-black">Blessures</h3>
          <p className="truncate text-xs text-gray-500">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="Blessures sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[#eceff3] p-4">
        <MuscleBodyMap compact showLabel />
      </div>
    </aside>
  );
}
