"use client";

import { useEffect, useState } from "react";
import {
  loadProgramPlanningNotes,
  saveProgramPlanningBlockNote,
  saveProgramPlanningWeekNote,
} from "@/lib/programPlanningNotes";

type CoachProgramScopeNotesProps = {
  athleteId: string;
  coachId: string;
  blockId: string;
  weekId: string;
  canEdit?: boolean;
};

export default function CoachProgramScopeNotes({
  athleteId,
  coachId,
  blockId,
  weekId,
  canEdit = true,
}: CoachProgramScopeNotesProps) {
  const [blockNote, setBlockNote] = useState("");
  const [weekNote, setWeekNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"block" | "week" | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadNotes() {
      setLoading(true);
      const { data } = await loadProgramPlanningNotes(
        athleteId,
        [weekId],
        [blockId],
      );

      if (cancelled) return;

      setBlockNote(data.blockNotes[blockId] || "");
      setWeekNote(data.weekNotes[weekId] || "");
      setLoading(false);
    }

    if (athleteId && blockId && weekId) {
      void loadNotes();
    } else {
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [athleteId, blockId, weekId]);

  async function persistBlockNote(value: string) {
    if (!canEdit || !coachId) return;
    setSaving("block");
    await saveProgramPlanningBlockNote({
      programBlockId: blockId,
      athleteId,
      coachId,
      note: value,
    });
    setSaving(null);
  }

  async function persistWeekNote(value: string) {
    if (!canEdit || !coachId) return;
    setSaving("week");
    await saveProgramPlanningWeekNote({
      programWeekId: weekId,
      athleteId,
      coachId,
      note: value,
    });
    setSaving(null);
  }

  if (!athleteId || !blockId || !weekId) return null;

  return (
    <div className="coach-program-scope-notes">
      <label className="coach-program-scope-notes-field">
        <span className="coach-program-scope-notes-label">Block notes</span>
        <textarea
          value={blockNote}
          disabled={!canEdit || loading}
          onChange={(event) => setBlockNote(event.target.value)}
          onBlur={() => void persistBlockNote(blockNote)}
          placeholder="Notities voor dit block…"
          rows={2}
          className="coach-program-scope-notes-input"
        />
        {saving === "block" ? (
          <span className="coach-program-scope-notes-status">Opslaan…</span>
        ) : null}
      </label>

      <label className="coach-program-scope-notes-field">
        <span className="coach-program-scope-notes-label">Week notes</span>
        <textarea
          value={weekNote}
          disabled={!canEdit || loading}
          onChange={(event) => setWeekNote(event.target.value)}
          onBlur={() => void persistWeekNote(weekNote)}
          placeholder="Notities voor deze week…"
          rows={2}
          className="coach-program-scope-notes-input"
        />
        {saving === "week" ? (
          <span className="coach-program-scope-notes-status">Opslaan…</span>
        ) : null}
      </label>
    </div>
  );
}
