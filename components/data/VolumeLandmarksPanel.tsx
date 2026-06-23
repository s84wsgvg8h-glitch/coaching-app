"use client";

import { useEffect, useState } from "react";
import { loadAthleteSbdVolumeData, formatLiftLabel } from "@/lib/chatVolumeData";
import {
  VOLUME_LANDMARKS,
  classifyWeeklySets,
  landmarkStatusClass,
  landmarkStatusLabel,
} from "@/lib/volumeLandmarks";

type VolumeLandmarksPanelProps = {
  athleteId: string;
};

export default function VolumeLandmarksPanel({ athleteId }: VolumeLandmarksPanelProps) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<
    Array<{ lift: "squat" | "bench" | "deadlift"; sets: number }>
  >([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const volumeRows = await loadAthleteSbdVolumeData(athleteId);
      const latest = volumeRows[volumeRows.length - 1];
      if (!latest) {
        setRows([]);
        setLoading(false);
        return;
      }

      setRows([
        { lift: "squat", sets: latest.squat.sets },
        { lift: "bench", sets: latest.bench.sets },
        { lift: "deadlift", sets: latest.deadlift.sets },
      ]);
      setLoading(false);
    }
    void load();
  }, [athleteId]);

  if (loading) {
    return <div className="app-card text-sm text-app-muted">Volume landmarks laden...</div>;
  }

  if (rows.length === 0) {
    return (
      <div className="app-card text-sm text-app-muted">
        Geen weekvolume om landmarks te tonen.
      </div>
    );
  }

  return (
    <div className="app-card">
      <h3 className="font-bold text-app-text">Volume landmarks (laatste week)</h3>
      <p className="mt-1 text-xs text-app-muted">
        Indicatieve MEV / MAV / MRV zones per competitielift.
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {rows.map((row) => {
          const landmark = VOLUME_LANDMARKS[row.lift];
          const status = classifyWeeklySets(row.sets, landmark);
          return (
            <div
              key={row.lift}
              className={`rounded-xl border px-3 py-3 ${landmarkStatusClass(status)}`}
            >
              <p className="text-sm font-bold">{formatLiftLabel(row.lift)}</p>
              <p className="mt-1 text-2xl font-black">{row.sets} sets</p>
              <p className="mt-1 text-xs font-semibold">{landmarkStatusLabel(status)}</p>
              <p className="mt-2 text-[10px] opacity-80">
                MEV {landmark.mev} · MAV {landmark.mav} · MRV {landmark.mrv}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
