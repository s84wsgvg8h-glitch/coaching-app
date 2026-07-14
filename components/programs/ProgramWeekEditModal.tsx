"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  loadProgramPlanningNotes,
  saveProgramPlanningWeekNote,
} from "@/lib/programPlanningNotes";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type ProgramWeekEditModalProps = {
  open: boolean;
  title: string;
  weekId: string;
  athleteId: string;
  coachId: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: { title: string; note: string }) => void | Promise<void>;
};

export default function ProgramWeekEditModal({
  open,
  title,
  weekId,
  athleteId,
  coachId,
  saving = false,
  onClose,
  onSave,
}: ProgramWeekEditModalProps) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftNote, setDraftNote] = useState("");
  const [loadingNote, setLoadingNote] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    deferEffectUpdate(() => {
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    deferEffectUpdate(() => {
      setDraftTitle(title);
      setLoadingNote(true);
    });

    let cancelled = false;

    void loadProgramPlanningNotes(athleteId, [weekId], []).then(({ data }) => {
      if (cancelled) return;
      setDraftNote(data.weekNotes[weekId] || "");
      setLoadingNote(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, title, weekId, athleteId]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-app-overlay p-4 sm:items-center">
      <button
        type="button"
        aria-label="Sluit week bewerken"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Week aanpassen"
        className="program-edit-modal relative z-[121] w-full max-w-md"
      >
        <button
          type="button"
          onClick={onClose}
          className="program-edit-modal-close"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <h2 className="program-edit-modal-title">Week aanpassen</h2>
        <p className="program-edit-modal-subtitle">
          Pas naam en week notes aan. Gebruik bijvoorbeeld &quot;Week 0&quot; voor
          een week vóór de block-start — datums schuiven dan automatisch mee.
        </p>

        <div className="mt-4 space-y-3">
          <label className="program-edit-modal-field">
            <span className="program-edit-modal-label">Naam</span>
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Naam week"
              className="program-edit-modal-input"
            />
          </label>

          <label className="program-edit-modal-field">
            <span className="program-edit-modal-label">Week notes</span>
            <textarea
              value={draftNote}
              disabled={loadingNote}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Notities voor deze week…"
              rows={4}
              className="program-edit-modal-textarea program-edit-modal-textarea-notes"
            />
          </label>
        </div>

        <div className="program-edit-modal-actions">
          <button type="button" onClick={onClose} className="app-btn-secondary flex-1">
            Annuleren
          </button>
          <button
            type="button"
            disabled={saving || !draftTitle.trim() || loadingNote}
            onClick={() => void onSave({ title: draftTitle.trim(), note: draftNote })}
            className="app-btn-primary flex-1 disabled:opacity-50"
          >
            {saving ? "Opslaan..." : "Opslaan"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export async function persistWeekEditModalNote(
  weekId: string,
  athleteId: string,
  coachId: string,
  note: string,
) {
  await saveProgramPlanningWeekNote({
    programWeekId: weekId,
    athleteId,
    coachId,
    note,
  });
}
