"use client";

import { useState } from "react";
import { broadcastMessageToAthletes } from "@/lib/chatBroadcast";

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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-app-overlay p-4">
      <div className="app-card w-full max-w-lg">
        <h2 className="text-lg font-bold text-app-text">Broadcast naar alle atleten</h2>
        <p className="mt-1 text-sm text-app-muted">
          Stuur één bericht naar al je gekoppelde atleten.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          placeholder="Bericht voor al je atleten..."
          className="mt-4 w-full rounded-xl border border-app-border px-4 py-3 text-sm app-focus-ring"
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
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
      </div>
    </div>
  );
}
