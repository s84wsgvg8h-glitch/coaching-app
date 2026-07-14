"use client";

import { useEffect, useState } from "react";
import {
  loadProgramDayCoachNotes,
  saveProgramDayCoachNote,
} from "@/lib/programDayCoachNotes";

type ProgramDayCoachNoteFieldProps = {
  programDayId: string;
  athleteId: string;
  coachId: string;
  canEdit: boolean;
  variant?: "default" | "program-dark";
};

export default function ProgramDayCoachNoteField({
  programDayId,
  athleteId,
  coachId,
  canEdit,
  variant = "default",
}: ProgramDayCoachNoteFieldProps) {
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data } = await loadProgramDayCoachNotes(athleteId, [programDayId]);
      setNote(data[programDayId] || "");
      setLoading(false);
    }
    void load();
  }, [programDayId, athleteId]);

  if (loading) return null;

  if (!canEdit && !note.trim()) return null;

  if (variant === "program-dark") {
    return (
      <div className="athlete-program-coach-note athlete-program-coach-note--day">
        <p className="athlete-program-coach-note-label">Trainingsdag coach</p>
        {canEdit ? (
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            onBlur={() =>
              void saveProgramDayCoachNote({
                programDayId,
                athleteId,
                coachId,
                note,
              })
            }
            rows={2}
            placeholder="Notities voor deze trainingsdag..."
            className="athlete-program-coach-note-input"
          />
        ) : (
          <p className="whitespace-pre-wrap text-[13px] text-app-text">{note}</p>
        )}
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
      <p className="text-[10px] font-bold text-violet-800">TRAININGSDAG COACH</p>
      {canEdit ? (
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() =>
            void saveProgramDayCoachNote({
              programDayId,
              athleteId,
              coachId,
              note,
            })
          }
          rows={2}
          placeholder="Notities voor deze trainingsdag..."
          className="mt-2 w-full rounded-lg border border-app-border bg-app-surface-muted px-2 py-1.5 text-sm text-app-text outline-none focus:border-app-accent"
        />
      ) : (
        <p className="mt-1 whitespace-pre-wrap text-sm text-violet-950">{note}</p>
      )}
    </div>
  );
}
