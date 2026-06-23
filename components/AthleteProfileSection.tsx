"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatCompetitionDateRange,
  loadAthleteCompetitionNotes,
  loadUpcomingCompetitions,
  saveAthleteCompetitionNotes,
  saveAthleteCompetitions,
  saveMeetResults,
  type Competition,
  type MeetResults,
} from "@/lib/competitions";
import { markBlockIntakeReviewed, type BlockIntakeWizard } from "@/lib/blockIntakeWizard";
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
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";
import {
  loadAthleteVideoSubmitTarget,
  saveAthleteVideoSubmitTarget,
} from "@/lib/athleteVideoSubmit";

type AthleteProfileSectionProps = {
  athleteId: string;
  canEdit?: boolean;
  canEditStartingPrs?: boolean;
  canEditCompetitions?: boolean;
  canEditPayment?: boolean;
  canEditVideoSettings?: boolean;
  initialGeboortedatum?: string | null;
  initialLidnummer?: string | null;
  initialGoalsText?: string | null;
  blockIntakeWizard?: BlockIntakeWizard | null;
  highlightField?: string | null;
  onSaved?: () => void;
  className?: string;
};

export default function AthleteProfileSection({
  athleteId,
  canEdit = true,
  canEditStartingPrs = false,
  canEditCompetitions = false,
  canEditPayment = false,
  canEditVideoSettings = false,
  initialGeboortedatum = "",
  initialLidnummer = "",
  initialGoalsText = "",
  blockIntakeWizard = null,
  highlightField = null,
  onSaved,
  className = "",
}: AthleteProfileSectionProps) {
  const [geboortedatum, setGeboortedatum] = useState(initialGeboortedatum || "");
  const [lidnummer, setLidnummer] = useState(initialLidnummer || "");
  const [goalsText, setGoalsText] = useState(initialGoalsText || "");
  const [showAllCompetitions, setShowAllCompetitions] = useState(false);
  const [expandedMeetIds, setExpandedMeetIds] = useState<Set<string>>(new Set());
  const [betalingPrijs, setBetalingPrijs] = useState("");
  const [betalingDag, setBetalingDag] = useState("");
  const [paymentMigrationRequired, setPaymentMigrationRequired] = useState(false);
  const [videoSubmitToReview, setVideoSubmitToReview] = useState(false);
  const [upcomingCompetitions, setUpcomingCompetitions] = useState<Competition[]>([]);
  const [selectedCompetitionIds, setSelectedCompetitionIds] = useState<string[]>([]);
  const [competitionNotesById, setCompetitionNotesById] = useState<
    Record<string, { coachNotes: string; goals: string }>
  >({});
  const [meetResultsById, setMeetResultsById] = useState<
    Record<string, MeetResults>
  >({});
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
    setGoalsText(initialGoalsText || "");
  }, [initialGeboortedatum, initialLidnummer, initialGoalsText, athleteId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setMessage("");

      const requests: [
        ReturnType<typeof loadUpcomingCompetitions>,
        ReturnType<typeof loadAthleteCompetitionNotes>,
        ReturnType<typeof loadAthletePayment> | Promise<null>,
        ReturnType<typeof loadAthleteStartingPrs>,
      ] = [
        loadUpcomingCompetitions(),
        loadAthleteCompetitionNotes(athleteId),
        canEditPayment ? loadAthletePayment(athleteId) : Promise.resolve(null),
        loadAthleteStartingPrs(athleteId),
      ];

      const [competitionsResult, selectedResult, paymentResult, prsResult] =
        await Promise.all(requests);

      if (cancelled) return;

      setUpcomingCompetitions(competitionsResult.data);
      setSelectedCompetitionIds(
        selectedResult.data.map((entry) => entry.competitionId),
      );
      setCompetitionNotesById(
        Object.fromEntries(
          selectedResult.data.map((entry) => [
            entry.competitionId,
            {
              coachNotes: entry.coachNotes || "",
              goals: entry.goals || "",
            },
          ]),
        ),
      );
      setMeetResultsById(
        Object.fromEntries(
          selectedResult.data.map((entry) => [
            entry.competitionId,
            entry.meetResults,
          ]),
        ),
      );

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

      if (canEditVideoSettings) {
        const target = await loadAthleteVideoSubmitTarget(athleteId);
        setVideoSubmitToReview(target === "video_review");
      }

      setLoading(false);
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [athleteId, canEditPayment, canEditVideoSettings]);

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
    if (!highlightField || loading) return;

    const targetId =
      highlightField === "starting_prs"
        ? "profile-field-coaching_start_date"
        : `profile-field-${highlightField}`;
    const element = document.getElementById(targetId);

    if (!element) return;

    window.requestAnimationFrame(() => {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("profile-field-highlight");
      window.setTimeout(() => {
        element.classList.remove("profile-field-highlight");
      }, 2800);
    });
  }, [highlightField, loading]);

  useEffect(() => {
    if (!canEdit || loading || !autoSaveReady.current) return;

    const timer = window.setTimeout(() => {
      void saveProfile();
    }, 800);

    return () => window.clearTimeout(timer);
  }, [
    geboortedatum,
    lidnummer,
    goalsText,
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
        .map((competition) => ({
          ...competition,
          coachNotes: competitionNotesById[competition.id]?.coachNotes || null,
          goals: competitionNotesById[competition.id]?.goals || null,
          meetResults: meetResultsById[competition.id] || {
            squatKg: null,
            benchKg: null,
            deadliftKg: null,
            totalKg: null,
          },
        }))
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    [upcomingCompetitions, selectedCompetitionIds, competitionNotesById, meetResultsById],
  );

  function toggleCompetition(competitionId: string) {
    setSelectedCompetitionIds((current) => {
      const next = current.includes(competitionId)
        ? current.filter((id) => id !== competitionId)
        : [...current, competitionId];

      if (!current.includes(competitionId)) {
        setCompetitionNotesById((notes) => ({
          ...notes,
          [competitionId]: notes[competitionId] || {
            coachNotes: "",
            goals: "",
          },
        }));
        setExpandedMeetIds((expanded) => new Set(expanded).add(competitionId));
      }

      return next;
    });
  }

  function toggleMeetExpanded(competitionId: string) {
    setExpandedMeetIds((current) => {
      const next = new Set(current);
      if (next.has(competitionId)) {
        next.delete(competitionId);
      } else {
        next.add(competitionId);
      }
      return next;
    });
  }

  function updateCompetitionNotes(
    competitionId: string,
    field: "coachNotes" | "goals",
    value: string,
  ) {
    setCompetitionNotesById((current) => ({
      ...current,
      [competitionId]: {
        coachNotes: current[competitionId]?.coachNotes || "",
        goals: current[competitionId]?.goals || "",
        [field]: value,
      },
    }));
  }

  async function persistCompetitionNotes(competitionId: string) {
    const notes = competitionNotesById[competitionId];
    if (!notes || !selectedCompetitionIds.includes(competitionId)) return;

    await saveAthleteCompetitionNotes(athleteId, competitionId, {
      coachNotes: notes.coachNotes,
      goals: notes.goals,
    });
  }

  async function saveProfile() {
    setSaving(true);
    setMessage("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        geboortedatum: geboortedatum || null,
        lidnummer: lidnummer.trim() || null,
        goals_text: goalsText.trim() || null,
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
      const notesPayload = Object.fromEntries(
        selectedCompetitionIds.map((competitionId) => [
          competitionId,
          {
            coachNotes: competitionNotesById[competitionId]?.coachNotes ?? null,
            goals: competitionNotesById[competitionId]?.goals ?? null,
          },
        ]),
      );

      for (const competitionId of selectedCompetitionIds) {
        const results = meetResultsById[competitionId];
        if (results) {
          await saveMeetResults(athleteId, competitionId, results);
        }
      }

      const { error: competitionsError } = await saveAthleteCompetitions(
        athleteId,
        selectedCompetitionIds,
        notesPayload,
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
        <h2 className="text-2xl font-bold text-black">Atleetgegevens</h2>
      </div>

      {blockIntakeWizard?.completed_at && !blockIntakeWizard.coach_reviewed_at ? (
        <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
          <p className="text-sm font-bold text-violet-900">Block-intake (review)</p>
          <ul className="mt-2 space-y-1 text-sm text-violet-950">
            {Object.entries(blockIntakeWizard.answers || {}).map(([key, value]) => (
              <li key={key}>
                <span className="font-semibold">{key}:</span> {value}
              </li>
            ))}
          </ul>
          {canEditCompetitions ? (
            <button
              type="button"
              onClick={() => void markBlockIntakeReviewed(blockIntakeWizard.id)}
              className="mt-3 rounded-xl bg-black px-3 py-1.5 text-xs font-semibold text-white"
            >
              Markeer als bekeken
            </button>
          ) : null}
        </div>
      ) : null}

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
            <div className="mt-4 space-y-4">
              {selectedCompetitionIds.length > 0 ? (
                <div className="space-y-3">
                  {upcomingCompetitions
                    .filter((competition) =>
                      selectedCompetitionIds.includes(competition.id),
                    )
                    .map((competition) => {
                      const notes = competitionNotesById[competition.id];
                      const isExpanded = expandedMeetIds.has(competition.id);

                      return (
                        <div
                          key={competition.id}
                          className="rounded-2xl border border-black bg-gray-50 px-4 py-3"
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked
                              onChange={() => toggleCompetition(competition.id)}
                              className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
                            />
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleMeetExpanded(competition.id)}
                                className="flex w-full items-start justify-between gap-3 text-left"
                              >
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
                                <span className="shrink-0 text-sm text-gray-400">
                                  {isExpanded ? "Inklappen" : "Uitklappen"}
                                </span>
                              </button>

                              {isExpanded ? (
                                <div className="mt-3 space-y-3">
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                                      Wedstrijddoelen
                                    </label>
                                    <AutoResizeTextarea
                                      value={notes?.goals || ""}
                                      onChange={(event) =>
                                        updateCompetitionNotes(
                                          competition.id,
                                          "goals",
                                          event.target.value,
                                        )
                                      }
                                      onBlur={() =>
                                        void persistCompetitionNotes(competition.id)
                                      }
                                      placeholder="Bijv. 600 kg totaal, geen missed opens..."
                                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                                    />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                    {(
                                      [
                                        ["squatKg", "Squat"],
                                        ["benchKg", "Bench"],
                                        ["deadliftKg", "Deadlift"],
                                        ["totalKg", "Totaal"],
                                      ] as const
                                    ).map(([field, label]) => (
                                      <div key={field}>
                                        <label className="mb-1 block text-xs font-semibold text-gray-500">
                                          {label} (kg)
                                        </label>
                                        <input
                                          type="number"
                                          value={
                                            meetResultsById[competition.id]?.[field] ?? ""
                                          }
                                          onChange={(event) => {
                                            const raw = event.target.value;
                                            setMeetResultsById((current) => ({
                                              ...current,
                                              [competition.id]: {
                                                squatKg:
                                                  current[competition.id]?.squatKg ?? null,
                                                benchKg:
                                                  current[competition.id]?.benchKg ?? null,
                                                deadliftKg:
                                                  current[competition.id]?.deadliftKg ??
                                                  null,
                                                totalKg:
                                                  current[competition.id]?.totalKg ?? null,
                                                [field]: raw ? Number(raw) : null,
                                              },
                                            }));
                                          }}
                                          className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-gray-500">
                                      Coach notities
                                    </label>
                                    <AutoResizeTextarea
                                      value={notes?.coachNotes || ""}
                                      onChange={(event) =>
                                        updateCompetitionNotes(
                                          competition.id,
                                          "coachNotes",
                                          event.target.value,
                                        )
                                      }
                                      onBlur={() =>
                                        void persistCompetitionNotes(competition.id)
                                      }
                                      placeholder="Taper, gewichtsklasse, opbouw..."
                                      className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black"
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Nog geen wedstrijden geselecteerd.
                </p>
              )}

              {upcomingCompetitions.some(
                (competition) => !selectedCompetitionIds.includes(competition.id),
              ) ? (
                <div className="rounded-2xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowAllCompetitions((value) => !value)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-black"
                  >
                    <span>Meer wedstrijden kiezen</span>
                    <span className="text-gray-400">
                      {showAllCompetitions ? "Inklappen" : "Uitklappen"}
                    </span>
                  </button>
                  {showAllCompetitions ? (
                    <div className="space-y-2 border-t border-gray-200 px-4 py-3">
                      {upcomingCompetitions
                        .filter(
                          (competition) =>
                            !selectedCompetitionIds.includes(competition.id),
                        )
                        .map((competition) => (
                          <label
                            key={competition.id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-gray-200 px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={false}
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
                        ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        ) : selectedCompetitions.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            Geen opkomende wedstrijden geselecteerd.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {selectedCompetitions.map((competition) => {
              const isExpanded = expandedMeetIds.has(competition.id);

              return (
                <div
                  key={competition.id}
                  className="rounded-2xl border border-gray-200 px-4 py-3"
                >
                  <button
                    type="button"
                    onClick={() => toggleMeetExpanded(competition.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span>
                      <p className="font-semibold text-black">{competition.naam}</p>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatCompetitionDateRange(
                          competition.start_date,
                          competition.end_date,
                        )}
                      </p>
                    </span>
                    <span className="shrink-0 text-sm text-gray-400">
                      {isExpanded ? "Inklappen" : "Uitklappen"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
                      {competition.goals ? (
                        <p className="text-sm text-black">
                          <span className="font-semibold">Doelen:</span>{" "}
                          {competition.goals}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Nog geen doelen ingevuld.</p>
                      )}
                      {competition.meetResults?.totalKg ? (
                        <p className="text-sm text-black">
                          <span className="font-semibold">Resultaat:</span>{" "}
                          S {competition.meetResults.squatKg ?? "—"} / B{" "}
                          {competition.meetResults.benchKg ?? "—"} / D{" "}
                          {competition.meetResults.deadliftKg ?? "—"} — Totaal{" "}
                          {competition.meetResults.totalKg} kg
                        </p>
                      ) : null}
                      {competition.coachNotes ? (
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold text-black">
                            Coach notities:
                          </span>{" "}
                          {competition.coachNotes}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg font-bold text-black">Doelen</h3>
        <p className="mt-1 text-sm text-gray-500">
          Vrije tekst voor doelen, focus en verwachtingen.
        </p>
        {canEdit ? (
          <AutoResizeTextarea
            value={goalsText}
            onChange={(event) => setGoalsText(event.target.value)}
            placeholder="Bijv. 600 kg totaal op NK, focus op bench techniek..."
            className="mt-4 w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />
        ) : goalsText ? (
          <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-gray-50 px-4 py-3 text-sm text-black">
            {goalsText}
          </p>
        ) : (
          <p className="mt-4 text-sm text-gray-500">Nog geen doelen ingevuld.</p>
        )}
      </div>

      {canEditPayment && (
        <div id="profile-section-payment">
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
              <div id="profile-field-betaling_prijs">
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

              <div id="profile-field-betaling_dag">
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

      {canEdit ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div id="profile-field-geboortedatum">
            <label className="mb-2 block text-sm font-semibold">Geboortedatum</label>
            <input
              type="date"
              value={geboortedatum}
              onChange={(event) => setGeboortedatum(event.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black"
            />
          </div>
          <div id="profile-field-lidnummer">
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

      {canEditVideoSettings ? (
        <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
          <h3 className="text-lg font-bold text-black">Trainingsvideo&apos;s</h3>
          <p className="mt-1 text-sm text-gray-500">
            Kies waar setvideo&apos;s naartoe gaan als deze atleet ze uploadt in
            het programma.
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm text-black">
            <input
              type="checkbox"
              checked={videoSubmitToReview}
              onChange={async (event) => {
                const next = event.target.checked;
                setVideoSubmitToReview(next);
                const { error } = await saveAthleteVideoSubmitTarget(
                  athleteId,
                  next ? "video_review" : "chat",
                );
                if (error) {
                  setVideoSubmitToReview(!next);
                  setMessage(error.message);
                } else {
                  setMessage(
                    next
                      ? "Video's gaan naar video review."
                      : "Video's gaan naar chat.",
                  );
                }
              }}
              className="mt-1"
            />
            <span>
              Stuur trainingsvideo&apos;s naar{" "}
              <span className="font-semibold">video review</span> in plaats van
              chat
            </span>
          </label>
        </div>
      ) : null}

      <div id="profile-section-starting-prs">
        <h3 className="text-lg font-bold text-black">Coaching & start-PR&apos;s</h3>
        <p className="mt-1 text-sm text-gray-500">
          Startdatum bij coach en beginwaarden voor squat, bench en deadlift.
        </p>

        {canEditStartingPrs ? (
          <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div id="profile-field-coaching_start_date">
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
