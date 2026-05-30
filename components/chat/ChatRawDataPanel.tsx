"use client";

import { X } from "lucide-react";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatRawDataPanelProps = {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
};

export default function ChatRawDataPanel({
  athleteId,
  athleteName,
  onClose,
}: ChatRawDataPanelProps) {
  const iframeSrc = `/data?tab=ruwe-data&athlete=${athleteId}&embedded=chat`;

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-black">Data</h3>
          <p className="truncate text-xs text-gray-500">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="Data sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 bg-gray-100">
        <iframe
          key={iframeSrc}
          title={`Data ${athleteName}`}
          src={iframeSrc}
          className="h-full w-full border-0 bg-gray-100"
        />
      </div>
    </aside>
  );
}
