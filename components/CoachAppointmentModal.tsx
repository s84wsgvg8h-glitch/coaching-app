"use client";

import { useEffect, useState } from "react";
import {
  deleteCoachCalendarEvent,
  formatAppointmentRange,
  saveCoachCalendarEvent,
  toDatetimeLocalValue,
  type CoachCalendarEventInput,
} from "@/lib/coachCalendarEvents";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type CoachAppointmentModalProps = {
  open: boolean;
  draft: CoachCalendarEventInput | null;
  onClose: () => void;
  onSaved: () => void;
};

function parseDatetimeLocal(value: string) {
  return new Date(value).toISOString();
}

export default function CoachAppointmentModal({
  open,
  draft,
  onClose,
  onSaved,
}: CoachAppointmentModalProps) {
  const [form, setForm] = useState<CoachCalendarEventInput | null>(draft);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [showExtraFields, setShowExtraFields] = useState(false);

  useEffect(() => {
    if (open && draft) {
      deferEffectUpdate(() => {
        setForm(draft);
        setError("");
        setShowExtraFields(
          Boolean(
            draft.location?.trim() ||
              draft.video_url?.trim() ||
              draft.invitees?.trim() ||
              draft.notes?.trim(),
          ),
        );
      });
    }
  }, [open, draft]);

  if (!open || !form) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !form.title.trim()) {
      setError("Vul een titel in.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: saveError } = await saveCoachCalendarEvent(form);

    setSaving(false);

    if (saveError) {
      setError(
        "Opslaan mislukt. Controleer of de Supabase-migratie is uitgevoerd.",
      );
      return;
    }

    onSaved();
    onClose();
  }

  async function handleDelete() {
    if (!form?.id) return;

    const confirmed = window.confirm("Weet je zeker dat je deze afspraak wilt verwijderen?");
    if (!confirmed) return;

    setDeleting(true);
    setError("");

    const { error: deleteError } = await deleteCoachCalendarEvent(
      form.id,
      form.coach_id,
    );

    setDeleting(false);

    if (deleteError) {
      setError("Verwijderen mislukt.");
      return;
    }

    onSaved();
    onClose();
  }

  const isEditing = Boolean(form.id);
  const startLocal = toDatetimeLocalValue(new Date(form.start_at));
  const endLocal = toDatetimeLocalValue(new Date(form.end_at));

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-app-border bg-app-surface shadow-2xl backdrop-blur-md"
      >
        <div className="border-b border-app-border p-3">
          <div className="flex rounded-full bg-app-surface-muted p-1">
            {(
              [
                { id: "activity", label: "Activiteit" },
                { id: "reminder", label: "Herinnering" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() =>
                  setForm((current) =>
                    current ? { ...current, event_type: tab.id } : current,
                  )
                }
                className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                  form.event_type === tab.id
                    ? "bg-red-500 text-white"
                    : "text-app-muted hover:text-app-text"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2 p-3">
          <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
            <input
              value={form.title}
              onChange={(event) =>
                setForm((current) =>
                  current ? { ...current, title: event.target.value } : current,
                )
              }
              placeholder={isEditing ? "Activiteit" : "Nieuwe activiteit"}
              className="w-full bg-transparent px-3 py-3 text-base font-semibold text-app-text outline-none placeholder:text-app-muted/50"
              autoFocus
            />

            <button
              type="button"
              onClick={() => setShowExtraFields((current) => !current)}
              className="flex w-full items-center justify-between border-t border-gray-200 px-3 py-2 text-left text-sm font-semibold text-app-muted hover:text-app-text"
            >
              <span>Locatie, videogesprek, genodigden & notities</span>
              <span>{showExtraFields ? "−" : "+"}</span>
            </button>

            {showExtraFields && (
              <>
                <input
                  value={form.location || ""}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, location: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Voeg locatie of videogesprek toe"
                  className="w-full border-t border-app-border bg-transparent px-3 py-3 text-sm text-app-text outline-none placeholder:text-app-muted/50"
                />
                <input
                  value={form.video_url || ""}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, video_url: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Videogesprek URL (optioneel)"
                  className="w-full border-t border-app-border bg-transparent px-3 py-2 text-xs text-app-muted outline-none placeholder:text-app-muted/50"
                />
                <input
                  value={form.invitees || ""}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, invitees: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Voeg genodigden toe"
                  className="w-full border-t border-app-border bg-transparent px-3 py-3 text-sm text-app-text outline-none placeholder:text-app-muted/50"
                />
                <textarea
                  value={form.notes || ""}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? { ...current, notes: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Voeg notities, URL of bijlagen toe"
                  rows={3}
                  className="w-full resize-none border-t border-app-border bg-transparent px-3 py-3 text-sm text-app-text outline-none placeholder:text-app-muted/50"
                />
              </>
            )}
          </section>

          <section className="overflow-hidden rounded-xl border border-app-border bg-app-surface">
            <div className="border-b border-app-border px-3 py-3">
              <p className="text-sm font-bold text-app-text">
                {formatAppointmentRange(form.start_at, form.end_at)}
              </p>
            </div>
            <div className="grid gap-2 px-3 py-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-app-muted">
                Start
                <input
                  type="datetime-local"
                  value={startLocal}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            start_at: parseDatetimeLocal(event.target.value),
                          }
                        : current,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface-muted px-2 py-2 text-sm text-app-text outline-none focus:border-app-accent"
                />
              </label>
              <label className="block text-xs font-semibold text-app-muted">
                Eind
                <input
                  type="datetime-local"
                  value={endLocal}
                  onChange={(event) =>
                    setForm((current) =>
                      current
                        ? {
                            ...current,
                            end_at: parseDatetimeLocal(event.target.value),
                          }
                        : current,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-app-border bg-app-surface-muted px-2 py-2 text-sm text-app-text outline-none focus:border-app-accent"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 border-t border-app-border px-3 py-2 text-sm font-semibold text-app-text">
              <input
                type="checkbox"
                checked={form.all_day}
                onChange={(event) =>
                  setForm((current) =>
                    current
                      ? { ...current, all_day: event.target.checked }
                      : current,
                  )
                }
              />
              Hele dag
            </label>
          </section>
        </div>

        {error && (
          <p className="px-4 pb-2 text-sm font-semibold text-app-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-app-border px-4 py-3">
          {isEditing ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting || saving}
              className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-app-destructive hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? "Verwijderen..." : "Verwijderen"}
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-muted hover:bg-app-surface-hover"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={saving || deleting}
              className="rounded-xl bg-app-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Opslaan..." : "Opslaan"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
