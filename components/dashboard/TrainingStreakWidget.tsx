"use client";

import { useEffect, useState } from "react";
import { loadTrainingStreak } from "@/lib/trainingStreak";

type TrainingStreakWidgetProps = {
  athleteId: string;
};

export default function TrainingStreakWidget({ athleteId }: TrainingStreakWidgetProps) {
  const [currentStreak, setCurrentStreak] = useState(0);
  const [recentDays, setRecentDays] = useState<
    Array<{ date: string; filled: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const streak = await loadTrainingStreak(athleteId);
      setCurrentStreak(streak.currentStreak);
      setRecentDays(streak.recentDays.slice(-14));
      setLoading(false);
    }

    void load();
  }, [athleteId]);

  if (loading) {
    return (
      <div className="app-card animate-pulse">
        <div className="h-6 w-32 rounded bg-app-surface-hover" />
      </div>
    );
  }

  return (
    <div className="app-card">
      <p className="text-xs font-bold uppercase tracking-wide text-app-muted">
        Invulstreak
      </p>
      <p className="mt-2 text-4xl font-bold text-brand-purple">
        {currentStreak}
        <span className="ml-2 text-base font-semibold text-app-muted">
          {currentStreak === 1 ? "dag" : "dagen"}
        </span>
      </p>
      <div className="mt-4 grid grid-cols-7 gap-1 sm:grid-cols-14">
        {recentDays.map((day) => (
          <div
            key={day.date}
            title={day.date}
            className={`aspect-square rounded-md ${
              day.filled ? "bg-brand-purple" : "bg-app-surface-hover"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 text-xs text-app-muted">
        Donkere vakjes = ingevulde trainingsdagen
      </p>
    </div>
  );
}
