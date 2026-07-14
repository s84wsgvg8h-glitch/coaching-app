"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import {
  createCompetition,
  formatCompetitionDateRange,
  linkAthleteToCompetition,
  loadUpcomingCompetitions,
  type Competition,
} from "@/lib/competitions";

type MeetWeekCompetitionManagerProps = {
  athleteId: string;
  linkedCompetitionIds: string[];
  onUpdated: (competitionId?: string) => Promise<void> | void;
};

export default function MeetWeekCompetitionManager({
  athleteId,
  linkedCompetitionIds,
  onUpdated,
}: MeetWeekCompetitionManagerProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [upcoming, setUpcoming] = useState<Competition[]>([]);
  const [naam, setNaam] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      const { data } = await loadUpcomingCompetitions();
      if (!cancelled) {
        setUpcoming(data);
        setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const availableCompetitions = useMemo(
    () =>
      upcoming.filter(
        (competition) => !linkedCompetitionIds.includes(competition.id),
      ),
    [linkedCompetitionIds, upcoming],
  );

  async function handleLink(competitionId: string) {
    setSaving(true);
    setErrorMessage("");

    const { error } = await linkAthleteToCompetition(athleteId, competitionId);

    if (error) {
      setErrorMessage(error.message);
      setSaving(false);
      return;
    }

    await onUpdated(competitionId);
    setSaving(false);
  }

  async function handleCreateAndLink() {
    if (!naam.trim() || !startDate) {
      setErrorMessage("Vul een wedstrijdnaam en startdatum in.");
      return;
    }

    const resolvedEndDate = endDate || startDate;
    if (resolvedEndDate < startDate) {
      setErrorMessage("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    setSaving(true);
    setErrorMessage("");

    const { data: created, error: createError } = await createCompetition({
      naam,
      startDate,
      endDate: resolvedEndDate,
    });

    if (createError || !created) {
      setErrorMessage(createError?.message || "Wedstrijd kon niet worden aangemaakt.");
      setSaving(false);
      return;
    }

    const { error: linkError } = await linkAthleteToCompetition(
      athleteId,
      created.id,
    );

    if (linkError) {
      setErrorMessage(linkError.message);
      setSaving(false);
      return;
    }

    setNaam("");
    setStartDate("");
    setEndDate("");
    await onUpdated(created.id);
    setSaving(false);
  }

  return (
    <div className="mt-4 rounded-2xl border border-app-border bg-app-surface">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-bold text-app-text">
            Wedstrijd toevoegen
          </span>
          <span className="mt-1 block text-xs text-app-muted">
            Koppel een bestaande wedstrijd of maak een nieuwe aan.
          </span>
        </span>
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-surface-muted text-app-text">
          <Plus className={`h-4 w-4 transition ${open ? "rotate-45" : ""}`} />
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4 border-t border-app-border pt-4">
          {errorMessage ? (
            <p className="text-sm text-red-600">{errorMessage}</p>
          ) : null}

          <div>
            <p className="text-sm font-semibold text-app-text">Nieuwe wedstrijd</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input
                value={naam}
                onChange={(event) => setNaam(event.target.value)}
                placeholder="Naam van wedstrijd"
                className="rounded-xl border border-app-border px-3 py-2 text-sm outline-none app-focus-ring sm:col-span-2"
              />
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                aria-label="Startdatum"
                className="rounded-xl border border-app-border px-3 py-2 text-sm outline-none app-focus-ring"
              />
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                aria-label="Einddatum"
                className="rounded-xl border border-app-border px-3 py-2 text-sm outline-none app-focus-ring"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleCreateAndLink()}
              disabled={saving}
              className="app-btn-primary mt-3 text-sm"
            >
              {saving ? "Opslaan..." : "Aanmaken en koppelen"}
            </button>
          </div>

          <div>
            <p className="text-sm font-semibold text-app-text">
              Bestaande wedstrijd koppelen
            </p>
            {loading ? (
              <p className="mt-2 text-sm text-app-muted">Laden...</p>
            ) : availableCompetitions.length === 0 ? (
              <p className="mt-2 text-sm text-app-muted">
                Geen extra aankomende wedstrijden in de kalender.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {availableCompetitions.map((competition) => (
                  <li
                    key={competition.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-app-border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-app-text">
                        {competition.naam}
                      </p>
                      <p className="text-xs text-app-muted">
                        {formatCompetitionDateRange(
                          competition.start_date,
                          competition.end_date,
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleLink(competition.id)}
                      disabled={saving}
                      className="app-btn-secondary shrink-0 text-xs"
                    >
                      Koppelen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
