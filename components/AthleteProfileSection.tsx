"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatCompetitionDateRange,
  loadAthleteCompetitionIds,
  loadUpcomingCompetitions,
  saveAthleteCompetitions,
  type Competition,
} from "@/lib/competitions";
import {
  formatPaymentDay,
  formatPaymentPrice,
  loadAthletePayment,
  PAYMENT_MIGRATION_SQL,
  parsePaymentDayInput,
  saveAthletePayment,
} from "@/lib/athletePayments";
import {
  formatCoachingStartDate,
  formatStartingPr,
  loadAthleteStartingPrs,
  parsePrInput,
  saveAthleteStartingPrs,
  type AthleteStartingPrs,
} from "@/lib/athleteStartingPrs";
import { supabase } from "@/lib/supabaseClient";

type AthleteProfileSectionProps = {
  athleteId: string;
  canEdit?: boolean;
  canEditStartingPrs?: boolean;
  canEditCompetitions?: boolean;
  canEditPayment?: boolean;
  initialGeboortedatum?: string | null;
  initialLidnummer?: string | null;
  onSaved?: () => void;
  className?: string;
};

export default function AthleteProfileSection({
  athleteId,
  canEdit = true,
  canEditStartingPrs = false,
  canEditCompetitions = false,
  canEditPayment = false,
  initialGeboortedatum = "",
  initialLidnummer = "",
  onSaved,
  className = "",
}: AthleteProfileSectionProps) {
  const [geboortedatum, setGeboortedatum] = useState(initialGeboortedatum || "");
  const [lidnummer, setLidnummer] = useState(initialLidnummer || "");
  const [betalingPrijs, setBetalingPrijs] = useState("");
  const [betalingDag, setBetalingDag] = useState("");
  const [paymentMigrationRequired, setPaymentMigrationRequired] = useState(false);
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionIds, setSelectedCompetitionIds] = useState<string[]>([]);
  const [startingPrs, setStartingPrs] = useState<AthleteStartingPrs>({
    coaching_start_date: null,
    starting_pr_squat: null,
    starting_pr_bench: null,
    starting_pr_deadlift: null,
  });
  const [startingPrInputs, setStartingPrInputs] = useState({
    coaching_start_date: "",
    starting_pr_squat: "",
    starting_pr_bench: "",
    starting_pr_deadlift: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const autoSaveReady = useRef(false);
  const saveMessageTimer = useRef<number | null>(null);

  useEffect(() => {
    setGeboortedatum(initialGeboortedatum || "");
    setLidnummer(initialLidnummer || "");
  }, [initialGeboortedatum, initialLidnummer, athleteId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      const requests: [
        ReturnType<typeof loadUpcomingCompetitions>,
        ReturnType<typeof loadAthleteCompetitionIds>,
        ReturnType<typeof loadAthletePayment> | Promise<null>,
        ReturnType<typeof loadAthleteStartingPrs>,
      ] = [
        loadUpcomingCompetitions(),
        loadAthleteCompetitionIds(athleteId),
        canEditPayment ? loadAthletePayment(athleteId) : Promise.resolve(null),
        loadAthleteStartingPrs(athleteId),
      ];

      const [competitionsResult, selectedResult, paymentResult, prsResult] =
        await Promise.all(requests);

      if (cancelled) return;

      setUpcomingCompetitions(competitionsResult.data);
      setSelectedCompetitionIds(selectedResult.data);

      if (paymentResult) {
        setBetalingPrijs(
          paymentResult.payment.betaling_prijs !== null
            ? String(paymentResult.payment.betaling_prijs)
            : "",
        );
        setBetalingDag(
          paymentResult.payment.betaling_dag !== null
            ? String(paymentResult.payment.betaling_dag)
            : "",
        );
        setPaymentMigrationRequired(paymentResult.migrationRequired);
      }

      setStartingPrs(prsResult);
      setStartingPrInputs({
        coaching_start_date: prsResult.coaching_start_date || "",
        starting_pr_squat:
          prsResult.starting_pr_squat !== null
            ? String(prsResult.starting_pr_squat)
            : "",
        starting_pr_bench:
          prsResult.starting_pr_bench !== null
            ? String(prsResult.starting_pr_bench)
            : "",
        starting_pr_deadlift:
          prsResult.starting_pr_deadlift !== null
            ? String(prsResult.starting_pr_deadlift)
            : "",
      });

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId, canEditPayment]);

  useEffect(() => {
    autoSaveReady.current = false;

    if (!loading) {
      const timer = window.setTimeout(() => {
        autoSaveReady.current = true;
      }, 150);

      return () => window.clearTimeout(timer);
    }
  }, [loading, athleteId]);

  useEffect(() => {
    if (!canEdit || loading || !autoSaveReady.current) return;

    const timer = window.setTimeout(() => {
      void saveProfile();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    geboortedatum,
    lidnummer,
    betalingPrijs,
    betalingDag,
    ...(canEditCompetitions ? [selectedCompetitionIds] : []),
    ...(canEditStartingPrs ? [startingPrInputs] : []),
    canEdit,
    canEditPayment,
    canEditCompetitions,
    canEditStartingPrs,
    athleteId,
    loading,
  ]);

  useEffect(() => {
    return () => {
      if (saveMessageTimer.current) {
        window.clearTimeout(saveMessageTimer.current);
      }
    };
  }, []);

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

    if (canEditPayment) {
      const trimmedPrice = betalingPrijs.trim().replace(",", ".");
      let parsedPrice: number | null = null;

      if (trimmedPrice) {
        parsedPrice = Number.parseFloat(trimmedPrice);
        if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
          setSaving(false);
          setMessage("Vul een geldige prijs in.");
          return;
        }
      }

      const parsedDay = parsePaymentDayInput(betalingDag);
      if (betalingDag.trim() && parsedDay === null) {
        setSaving(false);
        setMessage("Betaaldag moet tussen 1 en 31 liggen.");
        return;
      }

      try {
        const paymentResult = await saveAthletePayment(athleteId, {
          betaling_prijs: parsedPrice,
          betaling_dag: parsedDay,
        });
        setPaymentMigrationRequired(paymentResult.migrationRequired);
      } catch {
        setSaving(false);
        setMessage("Betaling opslaan mislukt.");
        return;
      }
    }

    if (canEditStartingPrs) {
      const nextStartingPrs = {
        coaching_start_date: startingPrInputs.coaching_start_date || null,
        starting_pr_squat: parsePrInput(startingPrInputs.starting_pr_squat),
        starting_pr_bench: parsePrInput(startingPrInputs.starting_pr_bench),
        starting_pr_deadlift: parsePrInput(startingPrInputs.starting_pr_deadlift),
      };

      const { error: prsError } = await saveAthleteStartingPrs(
        athleteId,
        nextStartingPrs,
      );

      if (prsError) {
        setSaving(false);
        setMessage("Start-PR's opslaan mislukt.");
        return;
      }

      setStartingPrs(nextStartingPrs);
    }

    if (canEditCompetitions) {
      const { error: competitionsError } = await saveAthleteCompetitions(
        athleteId,
        selectedCompetitionIds,
      );

      if (competitionsError) {
        setSaving(false);
        setMessage("Profiel opgeslagen, maar wedstrijden konden niet worden opgeslagen.");
        return;
      }
    }

    setSaving(false);

    setMessage("Profiel opgeslagen.");
    if (saveMessageTimer.current) {
      window.clearTimeout(saveMessageTimer.current);
    }
    saveMessageTimer.current = window.setTimeout(() => {
      setMessage("");
    }, 2000);
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

      {canEditPayment && (
        <div>
          <h3 className="text-lg font-bold text-black">Betaling</h3>
          <p className="mt-1 text-sm text-gray-500">
            Prijs en vaste betaaldag per maand voor deze atleet.
          </p>

          {paymentMigrationRequired && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Supabase-migratie nog niet gedraaid</p>
              <p className="mt-1">
                Betaling wordt tijdelijk lokaal opgeslagen. Run in Supabase SQL Editor:
              </p>
              <pre className="mt-2 overflow-x-auto rounded-xl bg-white p-3 text-xs text-black">
                {PAYMENT_MIGRATION_SQL}
              </pre>
            </div>
          )}

          {canEdit ? (
            <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-semibold">Prijs</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    €
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={betalingPrijs}
                    onChange={(event) => setBetalingPrijs(event.target.value)}
                    placeholder="0,00"
                    className="w-full rounded-2xl border border-gray-300 py-3 pl-9 pr-4 outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Betaaldag (dag van de maand)
                </label>
                <input
                  type="number"
                  min={1}
                  max={31}
                  value={betalingDag}
                  onChange={(event) => setBetalingDag(event.target.value)}
                  placeholder="Bijv. 20"
                  className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Bijvoorbeeld 20 = elke maand op de 20ste.
                </p>
              </div>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Prijs
                </p>
                <p className="mt-1 font-semibold text-black">
                  {formatPaymentPrice(
                    betalingPrijs.trim()
                      ? Number.parseFloat(betalingPrijs.replace(",", "."))
                      : null,
                  )}
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  Betaaldag
                </p>
                <p className="mt-1 font-semibold text-black">
                  {formatPaymentDay(parsePaymentDayInput(betalingDag))}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div>
        <h3 className="text-lg font-bold text-black">Coaching & start-PR&apos;s</h3>
        <p className="mt-1 text-sm text-gray-500">
          Startdatum bij coach en beginwaarden voor squat, bench en deadlift.
        </p>

        {canEditStartingPrs ? (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Startdatum coaching
              </label>
              <input
                type="date"
                value={startingPrInputs.coaching_start_date}
                onChange={(event) =>
                  setStartingPrInputs((current) => ({
                    ...current,
                    coaching_start_date: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Start-PR squat (kg)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={startingPrInputs.starting_pr_squat}
                onChange={(event) =>
                  setStartingPrInputs((current) => ({
                    ...current,
                    starting_pr_squat: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Start-PR bench (kg)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={startingPrInputs.starting_pr_bench}
                onChange={(event) =>
                  setStartingPrInputs((current) => ({
                    ...current,
                    starting_pr_bench: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Start-PR deadlift (kg)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={startingPrInputs.starting_pr_deadlift}
                onChange={(event) =>
                  setStartingPrInputs((current) => ({
                    ...current,
                    starting_pr_deadlift: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Startdatum coaching
              </p>
              <p className="mt-1 font-semibold text-black">
                {formatCoachingStartDate(startingPrs.coaching_start_date)}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Start-PR squat
              </p>
              <p className="mt-1 font-semibold text-black">
                {formatStartingPr(startingPrs.starting_pr_squat)}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Start-PR bench
              </p>
              <p className="mt-1 font-semibold text-black">
                {formatStartingPr(startingPrs.starting_pr_bench)}
              </p>
            </div>
            <div className="rounded-2xl bg-gray-50 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Start-PR deadlift
              </p>
              <p className="mt-1 font-semibold text-black">
                {formatStartingPr(startingPrs.starting_pr_deadlift)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-black">Opkomende wedstrijden</h3>
        <p className="mt-1 text-sm text-gray-500">
          {canEditCompetitions
            ? "Selecteer de wedstrijden waar deze atleet aan meedoet."
            : "Wedstrijden uit de wedstrijdkalender."}
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">Wedstrijden laden...</p>
        ) : canEditCompetitions ? (
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
        <div className="flex min-h-6 items-center gap-3 text-sm text-gray-500">
          {saving ? <span>Opslaan...</span> : null}
          {message ? <span>{message}</span> : null}
          {!saving && !message ? (
            <span>Wijzigingen worden automatisch opgeslagen</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
