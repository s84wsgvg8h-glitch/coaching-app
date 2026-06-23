"use client";

import { X } from "lucide-react";
import InjuriesSection from "@/components/InjuriesSection";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatInjuriesPanelProps = {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
};

export default function ChatInjuriesPanel({
  athleteId,
  athleteName,
  onClose,
}: ChatInjuriesPanelProps) {
  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-app-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate chat-panel-title truncate">Blessures</h3>
          <p className="truncate chat-panel-subtitle truncate">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-app-muted hover:bg-app-surface-hover hover:text-app-text"
          aria-label="Blessures sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain bg-[#eceff3] p-4">
        <InjuriesSection athleteId={athleteId} canEdit compact />
      </div>
    </aside>
  );
}
