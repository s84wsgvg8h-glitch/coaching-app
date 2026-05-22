"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatCompetitionDateRange,
  loadAthleteCompetitionIds,
  loadUpcomingCompetitions,
  saveAthleteCompetitions,
  type Competition,
} from "@/lib/competitions";
import { supabase } from "@/lib/supabaseClient";

type AthleteProfileSectionProps = {
  athleteId: string;
  canEdit?: boolean;
  initialGeboortedatum?: string | null;
  initialLidnummer?: string | null;
  onSaved?: () => void;
  className?: string;
};

export default function AthleteProfileSection({
  athleteId,
  canEdit = true,
  initialGeboortedatum = "",
  initialLidnummer = "",
  onSaved,
  className = "",
}: AthleteProfileSectionProps) {
  const [geboortedatum, setGeboortedatum] = useState(initialGeboortedatum || "");
  const [lidnummer, setLidnummer] = useState(initialLidnummer || "");
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionIds, setSelectedCompetitionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setGeboortedatum(initialGeboortedatum || "");
    setLidnummer(initialLidnummer || "");
  }, [initialGeboortedatum, initialLidnummer, athleteId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      const [{ data: competitions }, { data: selectedIds }] = await Promise.all([
        loadUpcomingCompetitions(),
        loadAthleteCompetitionIds(athleteId),
      ]);

      if (cancelled) return;

      setUpcomingCompetitions(competitions);
      setSelectedCompetitionIds(selectedIds);
      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId]);

  const selectedCompetitions = useMemo(
    () =>
      upcomingCompetitions
        .filter((competition) => selectedCompetitionIds.includes(competition.id))
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [upcomingCompetitions, selectedCompetitionIds],
  );

  function toggleCompetition(competitionId: string) {
    setSelectedCompetitionIds((current) =>
      current.includes(competitionId)
        ? current.filter((id) => id !== competitionId)
        : [...current, competitionId],
    );
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        geboortedatum: geboortedatum || null,
        lidnummer: lidnummer.trim() || null,
      })
      .eq("id", athleteId);

    if (profileError) {
      setSaving(false);
      setMessage("Profielgegevens opslaan mislukt.");
      return;
    }

    const { error: competitionsError } = await saveAthleteCompetitions(
      athleteId,
      selectedCompetitionIds,
    );

    setSaving(false);

    if (competitionsError) {
      setMessage("Profiel opgeslagen, maar wedstrijden konden niet worden opgeslagen.");
      return;
    }

    setMessage("Profiel opgeslagen.");
    onSaved?.();
  }

  return (
    <div className={`space-y-8 ${className}`}>
      <div>
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
          Atleetprofiel
        </p>
        <h2 className="text-2xl font-bold text-black">Gegevens & wedstrijden</h2>
      </div>

      {canEdit ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">Geboortedatum</label>
            <input
              type="date"
              value={geboortedatum}
              onChange={(event) => setGeboortedatum(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Lidnummer</label>
            <input
              type="text"
              value={lidnummer}
              onChange={(event) => setLidnummer(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {geboortedatum && (
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Geboortedatum
              </p>
              <p className="mt-1 font-semibold text-black">
                {new Date(`${geboortedatum}T12:00:00`).toLocaleDateString("nl-NL")}
              </p>
            </div>
          )}
          {lidnummer && (
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Lidnummer
              </p>
              <p className="mt-1 font-semibold text-black">{lidnummer}</p>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-black">Opkomende wedstrijden</h3>
        <p className="mt-1 text-sm text-gray-500">
          {canEdit
            ? "Selecteer de wedstrijden waar deze atleet aan meedoet."
            : "Wedstrijden uit de wedstrijdkalender."}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Wedstrijden laden...</p>
        ) : canEdit ? (
          upcomingCompetitions.length === 0 ? (
            <p className="mt-4 text-sm text-gray-500">
              Er staan nog geen aankomende wedstrijden in de kalender.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {upcomingCompetitions.map((competition) => {
                const checked = selectedCompetitionIds.includes(competition.id);

                return (
                  <label
                    key={competition.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${
                      checked ? "border-black bg-gray-50" : "border-gray-200"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCompetition(competition.id)}
                      className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <span>
                      <span className="block font-semibold text-black">
                        {competition.naam}
                      </span>
                      <span className="mt-1 block text-sm text-gray-500">
                        {formatCompetitionDateRange(
                          competition.start_date,
                          competition.end_date,
                        )}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          )
        ) : selectedCompetitions.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Geen opkomende wedstrijden geselecteerd.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedCompetitions.map((competition) => (
              <div
                key={competition.id}
                className="rounded-2xl border border-gray-200 px-4 py-3"
              >
                <p className="font-semibold text-black">{competition.naam}</p>
                <p className="mt-1 text-sm text-gray-500">
                  {formatCompetitionDateRange(
                    competition.start_date,
                    competition.end_date,
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {canEdit && (
        <div>
          {message && <p className="mb-4 text-sm text-gray-600">{message}</p>}
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="rounded-2xl bg-black px-6 py-3 text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Opslaan..." : "Profiel opslaan"}
          </button>
        </div>
      )}
    </div>
  );
}
