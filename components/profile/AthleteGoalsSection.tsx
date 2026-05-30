"use client";

import { useEffect, useState } from "react";
import {
  SBD_LIFT_LABELS,
  emptyCurrentMaxes,
  formatCurrentMax,
  getMaxForLift,
  loadAthleteCurrentMaxes,
  parseMaxInput,
  type AthleteCurrentMaxes,
  type SbdLiftKey,
} from "@/lib/athleteCurrentMaxes";
import {
  calculateGoalProgress,
  createAthleteGoal,
  deleteAthleteGoal,
  loadAthleteGoals,
  type AthleteGoal,
} from "@/lib/athleteGoals";

type AthleteGoalsSectionProps = {
  athleteId: string;
  canEdit?: boolean;
};

const LIFTS: SbdLiftKey[] = ["squat", "bench", "deadlift"];

export default function AthleteGoalsSection({
  athleteId,
  canEdit = true,
}: AthleteGoalsSectionProps) {
  const [goals, setGoals] = useState<AthleteGoal[]>([]);
  const [maxes, setMaxes] = useState<AthleteCurrentMaxes>(emptyCurrentMaxes());
  const [lift, setLift] = useState<SbdLiftKey>("squat");
  const [targetWeight, setTargetWeight] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [goalRows, maxRows] = await Promise.all([
        loadAthleteGoals(athleteId),
        loadAthleteCurrentMaxes(athleteId),
      ]);
      setGoals(goalRows);
      setMaxes(maxRows);
      setLoading(false);
    }

    void load();
  }, [athleteId]);

  async function handleAdd() {
    const weight = parseMaxInput(targetWeight);
    if (!weight || !targetDate) return;

    setSaving(true);
    const { data, error } = await createAthleteGoal(
      athleteId,
      lift,
      weight,
      targetDate,
    );
    setSaving(false);

    if (!error && data) {
      setGoals((current) =>
        [...current, data as AthleteGoal].sort((a, b) =>
          a.target_date.localeCompare(b.target_date),
        ),
      );
      setTargetWeight("");
      setTargetDate("");
    }
  }

  async function handleDelete(goalId: string) {
    await deleteAthleteGoal(goalId);
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
  }

  if (loading) {
    return <p className="text-sm text-app-muted">Doelen laden...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-app-text">Doelen</h2>
        <p className="mt-1 text-sm text-app-muted">
          Stel liftdoelen met streefgewicht en datum. Voortgang t.o.v. current maxes.
        </p>
      </div>

      {canEdit ? (
        <div className="grid gap-3 rounded-2xl border border-app-border p-4 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end">
          <label className="text-sm font-semibold">
            Lift
            <select
              value={lift}
              onChange={(e) => setLift(e.target.value as SbdLiftKey)}
              className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm app-focus-ring"
            >
              {LIFTS.map((key) => (
                <option key={key} value={key}>
                  {SBD_LIFT_LABELS[key]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-semibold">
            Streefgewicht (kg)
            <input
              value={targetWeight}
              onChange={(e) => setTargetWeight(e.target.value)}
              placeholder="200"
              className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm app-focus-ring"
            />
          </label>
          <label className="text-sm font-semibold">
            Streefdatum
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-app-border px-3 py-2 text-sm app-focus-ring"
            />
          </label>
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={saving}
            className="app-btn-primary disabled:opacity-60"
          >
            Toevoegen
          </button>
        </div>
      ) : null}

      {goals.length === 0 ? (
        <p className="text-sm text-app-muted">Nog geen doelen ingesteld.</p>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const current = getMaxForLift(maxes, goal.lift);
            const progress = calculateGoalProgress(
              current,
              Number(goal.target_weight),
            );

            return (
              <div
                key={goal.id}
                className="rounded-2xl border border-app-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-app-text">
                      {SBD_LIFT_LABELS[goal.lift]} — {goal.target_weight} kg
                    </p>
                    <p className="text-sm text-app-muted">
                      Streefdatum:{" "}
                      {new Date(`${goal.target_date}T12:00:00`).toLocaleDateString(
                        "nl-NL",
                      )}
                    </p>
                    <p className="mt-1 text-sm text-app-muted">
                      Huidig: {formatCurrentMax(current)}
                    </p>
                  </div>
                  {canEdit ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(goal.id)}
                      className="text-sm font-semibold text-red-600"
                    >
                      Verwijder
                    </button>
                  ) : null}
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-app-surface-hover">
                  <div
                    className="h-full rounded-full bg-app-accent transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1 text-xs font-semibold text-app-muted">
                  {progress}% van doel
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
