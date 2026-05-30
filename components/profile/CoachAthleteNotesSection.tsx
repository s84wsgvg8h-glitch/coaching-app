"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  loadCoachAthleteNotes,
  saveCoachAthleteNotes,
} from "@/lib/coachAthleteNotes";

type CoachAthleteNotesSectionProps = {
  coachId: string;
  athleteId: string;
};

export default function CoachAthleteNotesSection({
  coachId,
  athleteId,
}: CoachAthleteNotesSectionProps) {
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const row = await loadCoachAthleteNotes(coachId, athleteId);
      setNotes(row?.notes || "");
      setLoading(false);
    }

    void load();
  }, [coachId, athleteId]);

  async function handleSave() {
    setSaving(true);
    setMessage("");
    const { error } = await saveCoachAthleteNotes(coachId, athleteId, notes);
    setSaving(false);
    setMessage(error ? "Opslaan mislukt." : "Notities opgeslagen.");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-app-text">Coach notities</h2>
        <p className="mt-1 text-sm text-app-muted">
          Privé notities — alleen zichtbaar voor coaches, niet voor de atleet.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-app-muted">Laden...</p>
      ) : (
        <>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={8}
            placeholder="Observaties, aandachtspunten, follow-ups..."
            className="w-full rounded-xl border border-app-border bg-app-input-bg px-4 py-3 text-sm outline-none app-focus-ring"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="app-btn-primary disabled:opacity-60"
            >
              {saving ? "Opslaan..." : "Notities opslaan"}
            </button>
            {message ? (
              <span className="text-sm text-app-muted">{message}</span>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

export function canViewCoachNotes(viewerRole: string, viewerId: string, athleteId: string) {
  return isCoachLikeRole(viewerRole) && viewerId !== athleteId;
}
