"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import MuscleBodyMap from "@/components/MuscleBodyMap";
import {
  createAthleteInjury,
  deleteAthleteInjury,
  getHighestUrgencyForArea,
  getInjuryUrgencyLabel,
  INJURY_URGENCY_OPTIONS,
  loadAthleteInjuries,
  type AthleteInjury,
  type InjuryUrgency,
} from "@/lib/injuries";
import { getMuscleAreaById, type MuscleArea } from "@/lib/muscleAreas";

type InjuriesSectionProps = {
  athleteId: string;
  canEdit?: boolean;
  compact?: boolean;
  className?: string;
};

function formatInjuryDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString("nl-NL");
}

export default function InjuriesSection({
  athleteId,
  canEdit = true,
  compact = false,
  className = "",
}: InjuriesSectionProps) {
  const [injuries, setInjuries] = useState<AthleteInjury[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [injuryDate, setInjuryDate] = useState(
    () => new Date().toISOString().slice(0, 10),
  );
  const [urgency, setUrgency] = useState<InjuryUrgency>("medium");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      const { data } = await loadAthleteInjuries(athleteId);
      if (cancelled) return;

      setInjuries(data);

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const injuredAreaIds = useMemo(() => {
    const map: Record<string, InjuryUrgency | null> = {};
    const areaIds = Array.from(new Set(injuries.map((injury) => injury.muscle_area_id)));

    for (const areaId of areaIds) {
      map[areaId] = getHighestUrgencyForArea(injuries, areaId);
    }

    return map;
  }, [injuries]);

  const selectedArea = selectedAreaId ? getMuscleAreaById(selectedAreaId) : null;

  function handleAreaClick(area: MuscleArea) {
    if (!canEdit) return;
    setSelectedAreaId(area.id);
  }

  async function handleAddInjury() {
    if (!canEdit || !selectedAreaId || !name.trim()) return;

    setSaving(true);
    setError("");

    const { data } = await createAthleteInjury({
      athlete_id: athleteId,
      muscle_area_id: selectedAreaId,
      name: name.trim(),
      injury_date: injuryDate,
      urgency,
    });

    if (!data) {
      setError("Blessure kon niet worden opgeslagen.");
      setSaving(false);
      return;
    }

    setInjuries((current) => [data, ...current]);
    setName("");
    setSelectedAreaId(null);
    setSaving(false);
  }

  async function handleDeleteInjury(injuryId: string) {
    if (!canEdit) return;

    setSaving(true);
    setError("");

    await deleteAthleteInjury(athleteId, injuryId);

    setInjuries((current) => current.filter((injury) => injury.id !== injuryId));
    setSaving(false);
  }

  return (
    <div className={className}>
      <MuscleBodyMap
        compact={compact}
        showLabel
        interactive={canEdit}
        selectedAreaId={selectedAreaId}
        injuredAreaIds={injuredAreaIds}
        onAreaClick={handleAreaClick}
      />

      {canEdit && selectedArea && (
        <div
          className={`mx-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm ${
            compact ? "mt-4 max-w-[420px]" : "mt-6 max-w-[656px]"
          }`}
        >
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            Blessure toevoegen
          </p>
          <p className="mt-1 text-sm font-semibold text-black">
            {selectedArea.labelNl}
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">
                Naam
              </label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Bijv. spierblessure rechtsboven"
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Datum
                </label>
                <input
                  type="date"
                  value={injuryDate}
                  onChange={(event) => setInjuryDate(event.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-black"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">
                  Urgentie
                </label>
                <select
                  value={urgency}
                  onChange={(event) =>
                    setUrgency(event.target.value as InjuryUrgency)
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:ring-2 focus:ring-black"
                >
                  {INJURY_URGENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleAddInjury()}
                disabled={saving || !name.trim()}
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Opslaan..." : "Blessure opslaan"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedAreaId(null);
                  setName("");
                }}
                className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
              >
                Annuleren
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`mx-auto ${
          compact ? "mt-4 max-w-[420px]" : "mt-6 max-w-[656px]"
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
            Blessures
          </h3>
          {!loading && (
            <span className="text-xs font-semibold text-gray-400">
              {injuries.length}
            </span>
          )}
        </div>

        {loading && (
          <p className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
            Blessures laden...
          </p>
        )}

        {!loading && error && (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && injuries.length === 0 && (
          <p className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
            Nog geen blessures geregistreerd.
          </p>
        )}

        {!loading && injuries.length > 0 && (
          <div className="space-y-2">
            {injuries.map((injury) => {
              const area = getMuscleAreaById(injury.muscle_area_id);

              return (
                <div
                  key={injury.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-black">{injury.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {area?.labelNl || injury.muscle_area_id} ·{" "}
                      {formatInjuryDate(injury.injury_date)}
                    </p>
                    <span
                      className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        injury.urgency === "hoog"
                          ? "bg-red-100 text-red-700"
                          : injury.urgency === "medium"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {getInjuryUrgencyLabel(injury.urgency)}
                    </span>
                  </div>

                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => void handleDeleteInjury(injury.id)}
                      disabled={saving}
                      className="shrink-0 rounded-xl p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                      aria-label="Blessure verwijderen"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
