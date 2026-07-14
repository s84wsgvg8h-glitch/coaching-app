"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { WeekStatsReport } from "@/lib/programWeek/weekStats";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type CoachProgramWeekStatsModalProps = {
  open: boolean;
  weekTitle: string;
  report: WeekStatsReport | null;
  onClose: () => void;
};

export default function CoachProgramWeekStatsModal({
  open,
  weekTitle,
  report,
  onClose,
}: CoachProgramWeekStatsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    deferEffectUpdate(() => {
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || !mounted || !report) return null;

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-app-overlay p-4 sm:items-center">
      <button
        type="button"
        aria-label="Sluit weekstatistieken"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Weekstatistieken"
        className="coach-program-week-stats-modal program-edit-modal relative z-[121] flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden p-0"
      >
        <button
          type="button"
          onClick={onClose}
          className="program-edit-modal-close"
          aria-label="Sluiten"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="border-b border-app-border px-5 py-4 pr-16">
          <h2 className="program-edit-modal-title">Weekstatistieken</h2>
          <p className="program-edit-modal-subtitle truncate">{weekTitle}</p>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <div className="coach-program-week-stats-summary mb-4">
            <div className="coach-program-sbd-summary-grid">
              {report.sbd.map((item) => (
                <div key={item.label} className="coach-program-sbd-summary-item">
                  <p className="coach-program-sbd-summary-label">{item.label}</p>
                  <p className="coach-program-sbd-summary-value">
                    {item.sets}s / {item.reps}r
                  </p>
                </div>
              ))}
            </div>
            <p className="coach-program-week-stats-total mt-3 text-center text-xs text-app-muted">
              Totaal: {report.weekTotalSets} sets · {report.weekTotalReps} reps ·{" "}
              {report.exerciseCount} oefeningen
            </p>
          </div>

          <div className="space-y-4">
            {report.days.map((day) => (
              <section key={day.dayId} className="coach-program-week-stats-day">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-app-text">
                      {day.dayTitle}
                    </h3>
                    <p className="text-[11px] text-app-muted">{day.dateLabel}</p>
                  </div>
                  <p className="shrink-0 text-[11px] font-semibold text-app-muted">
                    {day.totalSets}s / {day.totalReps}r
                  </p>
                </div>

                {day.exercises.length === 0 ? (
                  <p className="text-xs text-app-muted">Geen oefeningen</p>
                ) : (
                  <div className="coach-program-week-stats-table-wrap">
                    <table className="coach-program-week-stats-table w-full">
                      <thead>
                        <tr>
                          <th>Oefening</th>
                          <th>Sets</th>
                          <th>Reps</th>
                          <th>Int.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {day.exercises.map((exercise) => (
                          <tr key={exercise.id}>
                            <td className="max-w-[9rem] truncate">{exercise.name}</td>
                            <td>{exercise.sets || "—"}</td>
                            <td>
                              {exercise.repsPerSet
                                ? `${exercise.repsPerSet}${exercise.sets > 1 ? ` × ${exercise.sets}` : ""}`
                                : "—"}
                            </td>
                            <td>{exercise.intensity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
