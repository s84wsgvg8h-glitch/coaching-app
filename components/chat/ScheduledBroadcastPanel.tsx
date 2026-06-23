"use client";

import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  createScheduledBroadcast,
  deleteScheduledBroadcast,
  loadScheduledBroadcasts,
  type ScheduledBroadcast,
} from "@/lib/scheduledBroadcasts";

type ScheduledBroadcastPanelProps = {
  coachId: string;
  onClose?: () => void;
};

export default function ScheduledBroadcastPanel({
  coachId,
}: ScheduledBroadcastPanelProps) {
  const [rows, setRows] = useState<ScheduledBroadcast[]>([]);
  const [message, setMessage] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [repeatRule, setRepeatRule] = useState<"" | "weekly">("");
  const [segmentAthleteIds, setSegmentAthleteIds] = useState<string[]>([]);
  const [athletes, setAthletes] = useState<Array<{ id: string; full_name: string | null }>>(
    [],
  );
  const [saving, setSaving] = useState(false);

  async function refresh() {
    setRows(await loadScheduledBroadcasts(coachId));
  }

  useEffect(() => {
    void refresh();
    void supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "atleet")
      .eq("coach_id", coachId)
      .order("full_name")
      .then(({ data }) => setAthletes(data || []));
  }, [coachId]);

  async function handleSchedule() {
    if (!message.trim() || !scheduledAt) return;
    setSaving(true);
    const { error } = await createScheduledBroadcast({
      coachId,
      message,
      scheduledAt: new Date(scheduledAt).toISOString(),
      repeatRule: repeatRule || null,
      athleteIds: segmentAthleteIds.length ? segmentAthleteIds : null,
    });
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setMessage("");
    setScheduledAt("");
    setRepeatRule("");
    setSegmentAthleteIds([]);
    void refresh();
  }

  async function handleDelete(id: string) {
    await deleteScheduledBroadcast(id);
    void refresh();
  }

  function toggleAthlete(id: string) {
    setSegmentAthleteIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-app-text">Geplande broadcast</h3>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          placeholder="Bericht..."
          className="mt-2 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
        />
        <input
          type="datetime-local"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
          className="mt-2 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
        />
        <select
          value={repeatRule}
          onChange={(e) => setRepeatRule(e.target.value as "" | "weekly")}
          className="mt-2 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
        >
          <option value="">Geen herhaling</option>
          <option value="weekly">Wekelijks herhalen</option>
        </select>
        {athletes.length > 0 ? (
          <div className="mt-2 rounded-xl border border-app-border p-2">
            <p className="text-xs font-bold text-app-muted">
              Segment (leeg = alle atleten)
            </p>
            <div className="mt-2 flex max-h-28 flex-wrap gap-1 overflow-y-auto">
              {athletes.map((athlete) => {
                const selected = segmentAthleteIds.includes(athlete.id);
                return (
                  <button
                    key={athlete.id}
                    type="button"
                    onClick={() => toggleAthlete(athlete.id)}
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      selected
                        ? "bg-brand-purple text-white"
                        : "bg-app-surface-hover text-app-text"
                    }`}
                  >
                    {athlete.full_name || "Atleet"}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => void handleSchedule()}
          disabled={saving || !message.trim() || !scheduledAt}
          className="app-btn-primary mt-2 disabled:opacity-50"
        >
          {saving ? "Plannen..." : "Inplannen"}
        </button>
      </div>

      {rows.length > 0 ? (
        <ul className="divide-y divide-app-border rounded-xl border border-app-border">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start gap-2 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-app-text">{row.message}</p>
                <p className="text-xs text-app-muted">
                  {new Date(row.scheduled_at).toLocaleString("nl-NL")}
                  {row.sent_at ? " · verzonden" : " · gepland"}
                  {row.repeat_rule ? ` · ${row.repeat_rule}` : ""}
                  {row.athlete_ids?.length
                    ? ` · ${row.athlete_ids.length} atleten`
                    : " · alle atleten"}
                </p>
              </div>
              {!row.sent_at ? (
                <button
                  type="button"
                  onClick={() => void handleDelete(row.id)}
                  className="rounded p-1 text-app-muted hover:text-red-500"
                  aria-label="Verwijderen"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
