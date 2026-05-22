"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import {
  formatLiftLabel,
  formatRepMaxLabel,
  formatRepMaxWeight,
  hasAnyPrData,
  loadAthleteSbdPrData,
  type LiftPrData,
  type SbdLift,
} from "@/lib/chatPrData";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";

type ChatPrPanelProps = {
  athleteId: string;
  athleteName: string;
  onClose: () => void;
};

const SBD_LIFTS: SbdLift[] = ["squat", "bench", "deadlift"];

export default function ChatPrPanel({
  athleteId,
  athleteName,
  onClose,
}: ChatPrPanelProps) {
  const [lifts, setLifts] = useState<LiftPrData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        const data = await loadAthleteSbdPrData(athleteId);
        if (cancelled) return;
        setLifts(data);
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "PR-data kon niet worden geladen.",
        );
        setLifts([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const hasData = hasAnyPrData(lifts);

  return (
    <aside className={CHAT_SIDE_PANEL_CLASS}>
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-black">PR&apos;s</h3>
          <p className="truncate text-xs text-gray-500">{athleteName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-black"
          aria-label="PR's sluiten"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain p-4">
        <div className="mb-4">
          <p className="text-xs font-black uppercase text-gray-500">
            SBD PR-lijst
          </p>
          <h4 className="text-lg font-black text-black">All-time maxima</h4>
          <p className="mt-1 text-xs text-gray-500">
            Hoogste gewicht per rep-aantal voor squat, bench en deadlift.
          </p>
        </div>

        {loading && (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            PR&apos;s laden...
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && !hasData && (
          <div className="flex flex-1 items-center justify-center px-2 text-center text-sm text-gray-500">
            Nog geen SBD PR&apos;s voor deze atleet.
          </div>
        )}

        {!loading && !error && hasData && (
          <div className="space-y-4">
            {SBD_LIFTS.map((liftKey) => {
              const lift = lifts.find((item) => item.lift === liftKey);
              const repMaxes = lift?.repMaxes || [];

              return (
                <div
                  key={liftKey}
                  className="overflow-hidden rounded-2xl border border-gray-200"
                >
                  <div className="border-b border-gray-100 bg-gray-50 px-3 py-2">
                    <p className="text-[10px] font-black uppercase text-gray-500">
                      {formatLiftLabel(liftKey)}
                    </p>
                  </div>

                  {repMaxes.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-gray-500">
                      Geen gelogde sets.
                    </p>
                  ) : (
                    <table className="w-full text-left text-sm">
                      <thead className="text-[10px] font-black uppercase text-gray-500">
                        <tr>
                          <th className="px-3 py-2">Reps</th>
                          <th className="px-3 py-2">Gewicht</th>
                        </tr>
                      </thead>
                      <tbody>
                        {repMaxes.map((entry) => (
                          <tr
                            key={`${liftKey}-${entry.reps}`}
                            className="border-t border-gray-100"
                          >
                            <td className="px-3 py-2 font-bold text-black">
                              {formatRepMaxLabel(entry.reps)}
                            </td>
                            <td className="px-3 py-2 font-bold text-black">
                              {formatRepMaxWeight(entry.weight)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
