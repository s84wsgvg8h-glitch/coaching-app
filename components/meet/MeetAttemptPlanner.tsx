"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type MeetAttempt = {
  lift: "squat" | "bench" | "deadlift";
  attempt: 1 | 2 | 3;
  weight: number | null;
};

type MeetAttemptPlannerProps = {
  athleteId: string;
  competitionId?: string | null;
  coachId: string;
};

const LIFTS: MeetAttempt["lift"][] = ["squat", "bench", "deadlift"];

function emptyAttempts(): MeetAttempt[] {
  const rows: MeetAttempt[] = [];
  for (const lift of LIFTS) {
    for (const attempt of [1, 2, 3] as const) {
      rows.push({ lift, attempt, weight: null });
    }
  }
  return rows;
}

export default function MeetAttemptPlanner({
  athleteId,
  competitionId = null,
  coachId,
}: MeetAttemptPlannerProps) {
  const [attempts, setAttempts] = useState<MeetAttempt[]>(emptyAttempts());
  const [notes, setNotes] = useState("");
  const [planId, setPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      let query = supabase
        .from("meet_attempt_plans")
        .select("id, attempts, notes")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (competitionId) {
        query = query.eq("competition_id", competitionId);
      }

      const { data } = await query.maybeSingle();

      if (data) {
        setPlanId(data.id as string);
        setNotes((data.notes as string | null) || "");
        const savedAttempts = (data.attempts as MeetAttempt[] | null) || [];
        setAttempts(
          emptyAttempts().map((row) => {
            const match = savedAttempts.find(
              (saved) => saved.lift === row.lift && saved.attempt === row.attempt,
            );
            return match ? { ...row, weight: match.weight ?? null } : row;
          }),
        );
      } else {
        setPlanId(null);
        setNotes("");
        setAttempts(emptyAttempts());
      }

      setLoading(false);
    }

    void load();
  }, [athleteId, competitionId]);

  function updateWeight(lift: MeetAttempt["lift"], attempt: 1 | 2 | 3, raw: string) {
    const weight = raw.trim() === "" ? null : Number(raw);
    setAttempts((current) =>
      current.map((row) =>
        row.lift === lift && row.attempt === attempt
          ? { ...row, weight: Number.isNaN(weight) ? null : weight }
          : row,
      ),
    );
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);

    const payload = {
      athlete_id: athleteId,
      competition_id: competitionId,
      coach_id: coachId,
      attempts: attempts.map((row) => ({
        ...row,
        weight: row.weight ?? 0,
      })),
      notes: notes.trim() || null,
    };

    const { error } = planId
      ? await supabase.from("meet_attempt_plans").update(payload).eq("id", planId)
      : await supabase.from("meet_attempt_plans").insert(payload);

    setSaving(false);
    if (!error) setSaved(true);
  }

  if (loading) {
    return (
      <div className="border-t border-app-border pt-4">
        <p className="text-sm text-app-muted">Attempt planner laden...</p>
      </div>
    );
  }

  return (
    <div className="border-t border-app-border pt-4">
      <p className="text-sm text-app-muted">
        Vul zelf alle pogingen in — er worden geen gewichten voorgesteld.
      </p>

      <div className="mt-4 space-y-4">
        {LIFTS.map((lift) => (
          <div key={lift}>
            <p className="text-sm font-bold capitalize text-app-text">{lift}</p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {([1, 2, 3] as const).map((attempt) => {
                const row = attempts.find(
                  (entry) => entry.lift === lift && entry.attempt === attempt,
                );
                return (
                  <label key={attempt} className="text-xs text-app-muted">
                    Poging {attempt}
                    <input
                      type="number"
                      value={row?.weight ?? ""}
                      onChange={(event) =>
                        updateWeight(lift, attempt, event.target.value)
                      }
                      placeholder="kg"
                      className="mt-1 w-full rounded-lg border border-app-border px-2 py-1.5 text-sm"
                    />
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          setSaved(false);
        }}
        placeholder="Notities voor wedstrijddag..."
        rows={2}
        className="mt-4 w-full rounded-xl border border-app-border px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        className="app-btn-primary mt-3 disabled:opacity-50"
      >
        {saving ? "Opslaan..." : saved ? "Opgeslagen ✓" : "Plan opslaan"}
      </button>
    </div>
  );
}
