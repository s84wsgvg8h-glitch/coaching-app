"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import ProgramBlockDateField from "@/components/programs/ProgramBlockDateField";
import {
  loadProgramPlanningNotes,
  saveProgramPlanningBlockNote,
} from "@/lib/programPlanningNotes";
import type { ProgramMacrocycle } from "@/lib/programMacrocycles";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type ProgramBlockEditModalProps = {
  open: boolean;
  title: string;
  startDate: string;
  macrocycleId: string;
  macrocycles: ProgramMacrocycle[];
  blockId: string;
  athleteId: string;
  coachId: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: {
    title: string;
    startDate: string;
    macrocycleId: string;
    note: string;
  }) => void | Promise<void>;
};

export default function ProgramBlockEditModal({
  open,
  title,
  startDate,
  macrocycleId,
  macrocycles,
  blockId,
  athleteId,
  coachId,
  saving = false,
  onClose,
  onSave,
}: ProgramBlockEditModalProps) {
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftStartDate, setDraftStartDate] = useState(startDate);
  const [draftMacrocycleId, setDraftMacrocycleId] = useState(macrocycleId);
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
      setDraftStartDate(startDate);
      setDraftMacrocycleId(macrocycleId);
      setLoadingNote(true);
    });

    let cancelled = false;

    void loadProgramPlanningNotes(athleteId, [], [blockId]).then(({ data }) => {
      if (cancelled) return;
      setDraftNote(data.blockNotes[blockId] || "");
      setLoadingNote(false);
    });

    return () => {
      cancelled = true;
    };
  }, [open, title, startDate, macrocycleId, blockId, athleteId]);

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
        aria-label="Sluit block bewerken"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Block aanpassen"
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

        <h2 className="program-edit-modal-title">Block aanpassen</h2>
        <p className="program-edit-modal-subtitle">
          Pas naam, startdatum, macrocycle en block notes aan.
        </p>

        <div className="mt-4 space-y-3">
          <label className="program-edit-modal-field">
            <span className="program-edit-modal-label">Naam</span>
            <input
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Naam block"
              className="program-edit-modal-input"
            />
          </label>

          <label className="program-edit-modal-field">
            <span className="program-edit-modal-label">Startdatum</span>
            <ProgramBlockDateField
              value={draftStartDate}
              onChange={setDraftStartDate}
            />
          </label>

          {macrocycles.length > 0 ? (
            <label className="program-edit-modal-field">
              <span className="program-edit-modal-label">Macrocycle</span>
              <select
                value={draftMacrocycleId}
                onChange={(event) => setDraftMacrocycleId(event.target.value)}
                className="program-edit-modal-input"
              >
                <option value="">Geen macrocycle</option>
                {macrocycles.map((macrocycle) => (
                  <option key={macrocycle.id} value={macrocycle.id}>
                    {macrocycle.title}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="program-edit-modal-field">
            <span className="program-edit-modal-label">Block notes</span>
            <textarea
              value={draftNote}
              disabled={loadingNote}
              onChange={(event) => setDraftNote(event.target.value)}
              placeholder="Notities voor dit block…"
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
            disabled={saving || !draftTitle.trim() || !draftStartDate || loadingNote}
            onClick={() =>
              void onSave({
                title: draftTitle.trim(),
                startDate: draftStartDate,
                macrocycleId: draftMacrocycleId,
                note: draftNote,
              })
            }
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

export async function persistBlockEditModalNote(
  blockId: string,
  athleteId: string,
  coachId: string,
  note: string,
) {
  await saveProgramPlanningBlockNote({
    programBlockId: blockId,
    athleteId,
    coachId,
    note,
  });
}
