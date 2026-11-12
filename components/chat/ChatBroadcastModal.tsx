"use client";

import { useState } from "react";
import { broadcastMessageToAthletes } from "@/lib/chatBroadcast";
import ScheduledBroadcastPanel from "@/components/chat/ScheduledBroadcastPanel";

type ChatBroadcastModalProps = {
  coachId: string;
  onClose: () => void;
  onSent?: (count: number) => void;
};

export default function ChatBroadcastModal({
  coachId,
  onClose,
  onSent,
}: ChatBroadcastModalProps) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"now" | "scheduled">("now");

  async function handleSend() {
    setSending(true);
    setError("");
    const result = await broadcastMessageToAthletes(coachId, body);
    setSending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onSent?.(result.sent);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[var(--app-overlay)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="ui-panel max-h-[90dvh] w-full max-w-lg overflow-y-auto">
        <h2 className="text-[17px] font-semibold tracking-tight text-app-text">Broadcast naar atleten</h2>

        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("now")}
            className={`app-focus-ring min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === "now"
                ? "bg-app-accent text-white"
                : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover"
            }`}
          >
            Nu versturen
          </button>
          <button
            type="button"
            onClick={() => setTab("scheduled")}
            className={`app-focus-ring min-h-[44px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              tab === "scheduled"
                ? "bg-app-accent text-white"
                : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover"
            }`}
          >
            Inplannen
          </button>
        </div>

        {tab === "now" ? (
          <>
            <p className="mt-3 text-sm text-app-muted">
              Stuur één bericht naar al je gekoppelde atleten.
            </p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="Bericht voor al je atleten..."
              className="mt-4 w-full rounded-xl border border-app-border bg-app-surface px-4 py-3 text-base text-app-text app-focus-ring md:text-sm"
            />
            {error ? <p className="mt-2 text-sm text-app-destructive">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="app-btn-secondary">
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !body.trim()}
                className="app-btn-primary disabled:opacity-60"
              >
                {sending ? "Versturen..." : "Verstuur broadcast"}
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <ScheduledBroadcastPanel coachId={coachId} />
            <div className="mt-4 flex justify-end">
              <button type="button" onClick={onClose} className="app-btn-secondary">
                Sluiten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
