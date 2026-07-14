"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Plus, Trash2, X } from "lucide-react";
import {
  createDefaultAthleteEventDraft,
  deleteAthleteCalendarEvent,
  formatAthleteEventRange,
  loadAthleteCalendarEvents,
  saveAthleteCalendarEvent,
  toDatetimeLocalValue,
  type AthleteCalendarEvent,
} from "@/lib/athleteCalendarEvents";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type ChatAgendaPanelProps = {
  coachId: string;
  athleteId: string;
  athleteName: string;
  onClose: () => void;
};

export default function ChatAgendaPanel({
  coachId,
  athleteId,
  athleteName,
  onClose,
}: ChatAgendaPanelProps) {
  const [events, setEvents] = useState<AthleteCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const titleRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const now = new Date();
    const draft = createDefaultAthleteEventDraft(coachId, athleteId, now);
    deferEffectUpdate(() => {
      setStartAt(toDatetimeLocalValue(now));
      setEndAt(toDatetimeLocalValue(new Date(draft.end_at)));
    });
    deferEffectUpdate(() => {
      void refreshEvents();
    });
  }, [coachId, athleteId]);

  async function refreshEvents() {
    setLoading(true);
    setErrorMessage("");
    const data = await loadAthleteCalendarEvents(athleteId);
    setEvents(data.filter((event) => new Date(event.end_at) >= new Date()));
    setLoading(false);
  }

  async function handleAddEvent() {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || saving || !startAt || !endAt) return;

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setErrorMessage("Vul geldige datums in.");
      return;
    }

    if (end < start) {
      setErrorMessage("Eindtijd moet na starttijd liggen.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { error } = await saveAthleteCalendarEvent({
      coach_id: coachId,
      athlete_id: athleteId,
      title: trimmedTitle,
      notes,
      start_at: start.toISOString(),
      end_at: end.toISOString(),
      all_day: false,
    });

    setSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setTitle("");
    setNotes("");
    titleRef.current?.focus();
    await refreshEvents();
  }

  async function handleDeleteEvent(eventId: string) {
    const { error } = await deleteAthleteCalendarEvent(eventId, coachId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setEvents((current) => current.filter((event) => event.id !== eventId));
  }

  return (
    <aside
      className={`${CHAT_SIDE_PANEL_CLASS} max-md:fixed max-md:inset-0 max-md:z-[70] max-md:w-full max-md:max-w-none max-md:border-r-0`}
    >
      <div className="chat-panel-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-app-text" />
            <h2 className="truncate chat-panel-title truncate">Agenda</h2>
          </div>
          <p className="truncate chat-panel-subtitle truncate">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn app-focus-ring"
          aria-label="Agenda sluiten"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 mobile-scroll">
        <div className="chat-card-elevated-muted p-4">
          <p className="text-sm font-semibold text-app-text">Nieuw agenda-item</p>
          <div className="mt-3 space-y-3">
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Titel, bijv. Video check-in"
              className="w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
            />
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Notities (optioneel)"
              className="w-full resize-none rounded-xl border border-app-border-strong bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
            />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block text-xs font-semibold text-app-muted">
                Start
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(event) => setStartAt(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
                />
              </label>
              <label className="block text-xs font-semibold text-app-muted">
                Eind
                <input
                  type="datetime-local"
                  value={endAt}
                  onChange={(event) => setEndAt(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-app-border-strong bg-app-surface px-3 py-2 text-sm outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)]"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={saving || !title.trim()}
              onClick={() => void handleAddEvent()}
              className="inline-flex items-center gap-2 app-btn-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              Toevoegen
            </button>
          </div>
        </div>

        {errorMessage ? (
          <p className="text-sm text-app-destructive">{errorMessage}</p>
        ) : null}

        {loading ? (
          <p className="text-sm text-app-muted">Agenda laden...</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-app-muted">Geen aankomende items.</p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="chat-card-elevated p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-app-text">{event.title}</p>
                    <p className="mt-1 chat-panel-subtitle truncate">
                      {formatAthleteEventRange(event.start_at, event.end_at)}
                    </p>
                    {event.notes ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm text-app-muted">
                        {event.notes}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDeleteEvent(event.id)}
                    className="rounded-lg p-2 text-app-subtle hover:bg-app-surface-hover hover:text-app-destructive"
                    aria-label="Verwijderen"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
