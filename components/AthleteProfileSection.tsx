"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatCompetitionDateRange,
  loadAthleteCompetitionNotes,
  loadUpcomingCompetitions,
  saveAthleteCompetitionNotes,
  saveAthleteCompetitions,
  saveMeetResults,
  updateCompetition,
  type AthleteCompetitionNotes,
  type Competition,
  type MeetResults,
} from "@/lib/competitions";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import MeetWeekCompetitionManager from "@/components/meet/MeetWeekCompetitionManager";
import { markBlockIntakeReviewed, type BlockIntakeWizard } from "@/lib/blockIntakeWizard";
import {
  formatPaymentDay,
  formatPaymentDayFieldValue,
  formatPaymentPrice,
  formatPaymentPriceFieldValue,
  isPaymentDashInput,
  isValidPaymentDayInput,
  isValidPaymentPriceInput,
  loadAthletePayment,
  parsePaymentDayInput,
  parsePaymentPriceInput,
  PAYMENT_MIGRATION_SQL,
  paymentPriceInputHasAmount,
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
  const [competitionMetaById, setCompetitionMetaById] = useState<
    Record<string, { naam: string; startDate: string; endDate: string }>
  >({});
  const [competitionMetaSavingId, setCompetitionMetaSavingId] = useState<
    string | null
  >(null);
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
    deferEffectUpdate(() => {
      setGeboortedatum(initialGeboortedatum || "");
      setLidnummer(initialLidnummer || "");
      setGoalsText(initialGoalsText || "");
    });
  }, [initialGeboortedatum, initialLidnummer, initialGoalsText, athleteId]);

  function applyCompetitionRegistrationState(
    upcoming: Competition[],
    registrations: AthleteCompetitionNotes[],
  ) {
    setUpcomingCompetitions(upcoming);
    setSelectedCompetitionIds(
      registrations.map((entry) => entry.competitionId),
    );
    setCompetitionNotesById(
      Object.fromEntries(
        registrations.map((entry) => [
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
        registrations.map((entry) => [entry.competitionId, entry.meetResults]),
      ),
    );
    setCompetitionMetaById(
      Object.fromEntries(
        upcoming.map((competition) => [
          competition.id,
          {
            naam: competition.naam,
            startDate: competition.start_date,
            endDate: competition.end_date,
          },
        ]),
      ),
    );
  }

  async function reloadCompetitions() {
    const [competitionsResult, selectedResult] = await Promise.all([
      loadUpcomingCompetitions(),
      loadAthleteCompetitionNotes(athleteId),
    ]);
    applyCompetitionRegistrationState(
      competitionsResult.data,
      selectedResult.data,
    );
  }

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

      applyCompetitionRegistrationState(
        competitionsResult.data,
        selectedResult.data,
      );

      if (paymentResult) {
        setBetalingPrijs(
          formatPaymentPriceFieldValue(paymentResult.payment.betaling_prijs),
        );
        setBetalingDag(
          formatPaymentDayFieldValue(
            paymentResult.payment.betaling_prijs,
            paymentResult.payment.betaling_dag,
          ),
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

  function updateCompetitionMetaField(
    competitionId: string,
    field: "naam" | "startDate" | "endDate",
    value: string,
  ) {
    setCompetitionMetaById((current) => ({
      ...current,
      [competitionId]: {
        naam: current[competitionId]?.naam || "",
        startDate: current[competitionId]?.startDate || "",
        endDate: current[competitionId]?.endDate || "",
        [field]: value,
      },
    }));
  }

  async function saveCompetitionMeta(competitionId: string) {
    const meta = competitionMetaById[competitionId];
    if (!meta?.naam.trim() || !meta.startDate) {
      setMessage("Vul een wedstrijdnaam en startdatum in.");
      return;
    }

    const resolvedEndDate = meta.endDate || meta.startDate;
    if (resolvedEndDate < meta.startDate) {
      setMessage("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    setCompetitionMetaSavingId(competitionId);
    setMessage("");

    const { data, error } = await updateCompetition(competitionId, {
      naam: meta.naam,
      startDate: meta.startDate,
      endDate: resolvedEndDate,
    });

    setCompetitionMetaSavingId(null);

    if (error || !data) {
      setMessage(error?.message || "Wedstrijd opslaan mislukt.");
      return;
    }

    setUpcomingCompetitions((current) =>
      current
        .map((competition) =>
          competition.id === competitionId ? data : competition,
        )
        .sort((a, b) => a.start_date.localeCompare(b.start_date)),
    );
    setCompetitionMetaById((current) => ({
      ...current,
      [competitionId]: {
        naam: data.naam,
        startDate: data.start_date,
        endDate: data.end_date,
      },
    }));
    setMessage("Wedstrijd opgeslagen.");
    if (saveMessageTimer.current) {
      window.clearTimeout(saveMessageTimer.current);
    }
    saveMessageTimer.current = window.setTimeout(() => {
      setMessage("");
    }, 2000);
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
      if (!isValidPaymentPriceInput(betalingPrijs)) {
        setSaving(false);
        setMessage("Vul een geldige prijs in of gebruik —.");
        return;
      }

      if (!isValidPaymentDayInput(betalingDag, betalingPrijs)) {
        setSaving(false);
        setMessage(
          paymentPriceInputHasAmount(betalingPrijs)
            ? "Betaaldag moet tussen 1 en 31 liggen."
            : "Gebruik — voor betaaldag als er geen prijs is.",
        );
        return;
      }

      const parsedPrice = parsePaymentPriceInput(betalingPrijs);
      let parsedDay = parsePaymentDayInput(betalingDag);
      if (parsedPrice === null) {
        parsedDay = null;
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
  }

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

  return (
    <div className={`profile-section-stack ${className}`}>
      {blockIntakeWizard?.completed_at && !blockIntakeWizard.coach_reviewed_at ? (
        <div className="profile-callout profile-callout--violet">
          <p className="profile-callout-title">Block-intake (review)</p>
          <ul className="mt-2 space-y-1 text-sm text-app-muted">
            {Object.entries(blockIntakeWizard.answers || {}).map(([key, value]) => (
              <li key={key}>
                <span className="font-semibold text-app-text">{key}:</span> {value}
              </li>
            ))}
          </ul>
          {canEditCompetitions ? (
            <button
              type="button"
              onClick={() => void markBlockIntakeReviewed(blockIntakeWizard.id)}
              className="mt-3 rounded-xl border border-app-border bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-text transition hover:bg-app-surface-hover"
            >
              Markeer als bekeken
            </button>
          ) : null}
        </div>
      ) : null}

      <section className="profile-section-card">
        <div className="profile-section-card-header">
          <h3 className="profile-section-card-title">Opkomende wedstrijden</h3>
          <p className="profile-section-card-desc">
            {canEditCompetitions
              ? "Koppel wedstrijden, pas gegevens aan en stel doelen in."
              : "Wedstrijden uit de wedstrijdkalender."}
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-app-muted">Wedstrijden laden...</p>
        ) : canEditCompetitions ? (
            <div className="space-y-4">
              {selectedCompetitionIds.length > 0 ? (
                <div className="space-y-3">
                  {upcomingCompetitions
                    .filter((competition) =>
                      selectedCompetitionIds.includes(competition.id),
                    )
                    .map((competition) => {
                      const notes = competitionNotesById[competition.id];
                      const meta = competitionMetaById[competition.id];
                      const isExpanded = expandedMeetIds.has(competition.id);

                      return (
                        <div key={competition.id} className="profile-competition-card">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked
                              onChange={() => toggleCompetition(competition.id)}
                              className="mt-1 h-4 w-4 shrink-0 rounded border-app-border"
                            />
                            <div className="min-w-0 flex-1">
                              <button
                                type="button"
                                onClick={() => toggleMeetExpanded(competition.id)}
                                className="flex w-full items-start justify-between gap-3 text-left"
                              >
                                <span>
                                  <span className="profile-competition-name">
                                    {competition.naam}
                                  </span>
                                  <span className="profile-competition-date block">
                                    {formatCompetitionDateRange(
                                      competition.start_date,
                                      competition.end_date,
                                    )}
                                  </span>
                                </span>
                                <span className="profile-competition-toggle">
                                  {isExpanded ? "Inklappen" : "Uitklappen"}
                                </span>
                              </button>

                              {isExpanded ? (
                                <div className="mt-3 space-y-3">
                                  <div className="rounded-xl border border-app-border bg-app-surface px-3 py-3">
                                    <p className="profile-field-label">
                                      Wedstrijdgegevens
                                    </p>
                                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                                      <input
                                        type="text"
                                        value={meta?.naam ?? competition.naam}
                                        onChange={(event) =>
                                          updateCompetitionMetaField(
                                            competition.id,
                                            "naam",
                                            event.target.value,
                                          )
                                        }
                                        placeholder="Naam van wedstrijd"
                                        className="profile-field-input sm:col-span-2"
                                      />
                                      <input
                                        type="date"
                                        value={
                                          meta?.startDate ?? competition.start_date
                                        }
                                        onChange={(event) =>
                                          updateCompetitionMetaField(
                                            competition.id,
                                            "startDate",
                                            event.target.value,
                                          )
                                        }
                                        aria-label="Startdatum"
                                        className="profile-field-input"
                                      />
                                      <input
                                        type="date"
                                        value={meta?.endDate ?? competition.end_date}
                                        onChange={(event) =>
                                          updateCompetitionMetaField(
                                            competition.id,
                                            "endDate",
                                            event.target.value,
                                          )
                                        }
                                        aria-label="Einddatum"
                                        className="profile-field-input"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void saveCompetitionMeta(competition.id)
                                      }
                                      disabled={
                                        competitionMetaSavingId === competition.id
                                      }
                                      className="mt-3 rounded-xl border border-app-border bg-app-surface px-3 py-2 text-xs font-semibold text-app-text transition hover:bg-app-surface-hover disabled:opacity-60"
                                    >
                                      {competitionMetaSavingId === competition.id
                                        ? "Opslaan..."
                                        : "Wedstrijdgegevens opslaan"}
                                    </button>
                                  </div>
                                  <div>
                                    <label className="profile-field-label">
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
                                      className="profile-field-textarea mt-1"
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
                                        <label className="profile-field-label">
                                          {label} (kg)
                                        </label>
                                        <input
                                          type="number"
                                          value={
                                            meetResultsById[competition.id]?.[field] ??
                                            ""
                                          }
                                          onChange={(event) => {
                                            const raw = event.target.value;
                                            setMeetResultsById((current) => ({
                                              ...current,
                                              [competition.id]: {
                                                squatKg:
                                                  current[competition.id]?.squatKg ??
                                                  null,
                                                benchKg:
                                                  current[competition.id]?.benchKg ??
                                                  null,
                                                deadliftKg:
                                                  current[competition.id]?.deadliftKg ??
                                                  null,
                                                totalKg:
                                                  current[competition.id]?.totalKg ??
                                                  null,
                                                [field]: raw ? Number(raw) : null,
                                              },
                                            }));
                                          }}
                                          className="profile-field-input mt-1"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                  <div>
                                    <label className="profile-field-label">
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
                                      className="profile-field-textarea mt-1"
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
                <p className="text-sm text-app-muted">
                  Nog geen wedstrijden gekoppeld aan deze atleet.
                </p>
              )}

              {upcomingCompetitions.some(
                (competition) => !selectedCompetitionIds.includes(competition.id),
              ) ? (
                <div className="rounded-xl border border-app-border">
                  <button
                    type="button"
                    onClick={() => setShowAllCompetitions((value) => !value)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-app-text"
                  >
                    <span>Meer wedstrijden kiezen</span>
                    <span className="text-app-text-subtle">
                      {showAllCompetitions ? "Inklappen" : "Uitklappen"}
                    </span>
                  </button>
                  {showAllCompetitions ? (
                    <div className="space-y-2 border-t border-app-border px-4 py-3">
                      {upcomingCompetitions
                        .filter(
                          (competition) =>
                            !selectedCompetitionIds.includes(competition.id),
                        )
                        .map((competition) => (
                          <label
                            key={competition.id}
                            className="flex cursor-pointer items-start gap-3 rounded-xl border border-app-border bg-app-surface px-3 py-2"
                          >
                            <input
                              type="checkbox"
                              checked={false}
                              onChange={() => toggleCompetition(competition.id)}
                              className="mt-1 h-4 w-4 rounded border-app-border"
                            />
                            <span>
                              <span className="profile-competition-name block">
                                {competition.naam}
                              </span>
                              <span className="profile-competition-date block">
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

              <MeetWeekCompetitionManager
                athleteId={athleteId}
                linkedCompetitionIds={selectedCompetitionIds}
                onUpdated={async (competitionId) => {
                  await reloadCompetitions();
                  if (competitionId) {
                    setExpandedMeetIds((current) =>
                      new Set(current).add(competitionId),
                    );
                  }
                }}
              />
            </div>
        ) : selectedCompetitions.length === 0 ? (
          <p className="text-sm text-app-muted">
            Geen opkomende wedstrijden geselecteerd.
          </p>
        ) : (
          <div>
            {selectedCompetitions.map((competition) => {
              const isExpanded = expandedMeetIds.has(competition.id);

              return (
                <div key={competition.id} className="profile-competition-card">
                  <button
                    type="button"
                    onClick={() => toggleMeetExpanded(competition.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span>
                      <p className="profile-competition-name">{competition.naam}</p>
                      <p className="profile-competition-date">
                        {formatCompetitionDateRange(
                          competition.start_date,
                          competition.end_date,
                        )}
                      </p>
                    </span>
                    <span className="profile-competition-toggle">
                      {isExpanded ? "Inklappen" : "Uitklappen"}
                    </span>
                  </button>

                  {isExpanded ? (
                    <div className="mt-3 space-y-3 border-t border-app-border pt-3">
                      {competition.goals ? (
                        <p className="text-sm text-app-text">
                          <span className="font-semibold">Doelen:</span>{" "}
                          {competition.goals}
                        </p>
                      ) : (
                        <p className="text-sm text-app-muted">Nog geen doelen ingevuld.</p>
                      )}
                      {competition.meetResults?.totalKg ? (
                        <p className="text-sm text-app-text">
                          <span className="font-semibold">Resultaat:</span>{" "}
                          S {competition.meetResults.squatKg ?? "—"} / B{" "}
                          {competition.meetResults.benchKg ?? "—"} / D{" "}
                          {competition.meetResults.deadliftKg ?? "—"} — Totaal{" "}
                          {competition.meetResults.totalKg} kg
                        </p>
                      ) : null}
                      {competition.coachNotes ? (
                        <p className="text-sm text-app-muted">
                          <span className="font-semibold text-app-text">
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
      </section>

      <section className="profile-section-card">
        <div className="profile-section-card-header">
          <h3 className="profile-section-card-title">Doelen</h3>
          <p className="profile-section-card-desc">
            Vrije tekst voor doelen, focus en verwachtingen.
          </p>
        </div>
        {canEdit ? (
          <AutoResizeTextarea
            value={goalsText}
            onChange={(event) => setGoalsText(event.target.value)}
            placeholder="Bijv. 600 kg totaal op NK, focus op bench techniek..."
            className="profile-field-textarea"
          />
        ) : goalsText ? (
          <p className="whitespace-pre-wrap rounded-xl border border-app-border bg-app-surface px-4 py-3 text-sm text-app-text">
            {goalsText}
          </p>
        ) : (
          <p className="text-sm text-app-muted">Nog geen doelen ingevuld.</p>
        )}
      </section>

      {canEditPayment && (
        <section id="profile-section-payment" className="profile-section-card">
          <div className="profile-section-card-header">
            <h3 className="profile-section-card-title">Betaling</h3>
            <p className="profile-section-card-desc">
              Prijs en vaste betaaldag per maand voor deze atleet.
            </p>
          </div>

          {paymentMigrationRequired && (
            <div className="profile-callout profile-callout--amber mb-4">
              <p className="profile-callout-title">Supabase-migratie nog niet gedraaid</p>
              <p className="mt-1 text-app-muted">
                Betaling wordt tijdelijk lokaal opgeslagen. Run in Supabase SQL Editor:
              </p>
              <pre className="profile-callout-pre">{PAYMENT_MIGRATION_SQL}</pre>
            </div>
          )}

          {canEdit ? (
            <div className="profile-field-grid">
              <div id="profile-field-betaling_prijs" className="profile-field">
                <label className="profile-field-label">Prijs</label>
                <div className="relative">
                  <span className="profile-field-prefix">€</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={betalingPrijs}
                    onChange={(event) => {
                      const next = event.target.value;
                      setBetalingPrijs(next);
                      if (isPaymentDashInput(next)) {
                        setBetalingDag("—");
                      }
                    }}
                    placeholder="—"
                    className="profile-field-input profile-field-input--prefix"
                  />
                </div>
              </div>

              <div id="profile-field-betaling_dag" className="profile-field">
                <label className="profile-field-label">
                  Betaaldag (dag van de maand)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={betalingDag}
                  onChange={(event) => setBetalingDag(event.target.value)}
                  placeholder="—"
                  disabled={isPaymentDashInput(betalingPrijs)}
                  className="profile-field-input disabled:opacity-60"
                />
                <p className="profile-field-hint">
                  Gebruik — als de atleet niet betaalt. Anders bijv. 20 = elke
                  maand op de 20ste.
                </p>
              </div>
            </div>
          ) : (
            <div className="profile-field-grid">
              <div className="profile-stat-card">
                <p className="profile-stat-card-label">Prijs</p>
                <p className="profile-stat-card-value">
                  {formatPaymentPrice(parsePaymentPriceInput(betalingPrijs))}
                </p>
              </div>
              <div className="profile-stat-card">
                <p className="profile-stat-card-label">Betaaldag</p>
                <p className="profile-stat-card-value">
                  {formatPaymentDay(
                    paymentPriceInputHasAmount(betalingPrijs)
                      ? parsePaymentDayInput(betalingDag)
                      : null,
                  )}
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="profile-section-card">
        <div className="profile-section-card-header">
          <h3 className="profile-section-card-title">Persoonsgegevens</h3>
          <p className="profile-section-card-desc">Geboortedatum en lidnummer.</p>
        </div>

        {canEdit ? (
          <div className="profile-field-grid">
            <div id="profile-field-geboortedatum" className="profile-field">
              <label className="profile-field-label">Geboortedatum</label>
              <input
                type="date"
                value={geboortedatum}
                onChange={(event) => setGeboortedatum(event.target.value)}
                className="profile-field-input"
              />
            </div>
            <div id="profile-field-lidnummer" className="profile-field">
              <label className="profile-field-label">Lidnummer</label>
              <input
                type="text"
                value={lidnummer}
                onChange={(event) => setLidnummer(event.target.value)}
                className="profile-field-input"
              />
            </div>
          </div>
        ) : (
          <div className="profile-field-grid">
            {geboortedatum && (
              <div className="profile-stat-card">
                <p className="profile-stat-card-label">Geboortedatum</p>
                <p className="profile-stat-card-value">
                  {new Date(`${geboortedatum}T12:00:00`).toLocaleDateString("nl-NL")}
                </p>
              </div>
            )}
            {lidnummer && (
              <div className="profile-stat-card">
                <p className="profile-stat-card-label">Lidnummer</p>
                <p className="profile-stat-card-value">{lidnummer}</p>
              </div>
            )}
            {!geboortedatum && !lidnummer ? (
              <p className="text-sm text-app-muted">Nog geen persoonsgegevens ingevuld.</p>
            ) : null}
          </div>
        )}
      </section>

      {canEditVideoSettings ? (
        <section className="profile-section-card">
          <div className="profile-section-card-header">
            <h3 className="profile-section-card-title">Trainingsvideo&apos;s</h3>
            <p className="profile-section-card-desc">
              Kies waar setvideo&apos;s naartoe gaan als deze atleet ze uploadt in het
              programma.
            </p>
          </div>
          <label className="flex items-start gap-3 text-sm text-app-text">
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
              className="mt-1 h-4 w-4 rounded border-app-border"
            />
            <span>
              Stuur trainingsvideo&apos;s naar{" "}
              <span className="font-semibold">video review</span> in plaats van chat
            </span>
          </label>
        </section>
      ) : null}

      <section id="profile-section-starting-prs" className="profile-section-card">
        <div className="profile-section-card-header">
          <h3 className="profile-section-card-title">Coaching & start-PR&apos;s</h3>
          <p className="profile-section-card-desc">
            Startdatum bij coach en beginwaarden voor squat, bench en deadlift.
          </p>
        </div>

        {canEditStartingPrs ? (
          <div className="profile-field-grid">
            <div id="profile-field-coaching_start_date" className="profile-field">
              <label className="profile-field-label">Startdatum coaching</label>
              <input
                type="date"
                value={startingPrInputs.coaching_start_date}
                onChange={(event) =>
                  setStartingPrInputs((current) => ({
                    ...current,
                    coaching_start_date: event.target.value,
                  }))
                }
                className="profile-field-input"
              />
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Start-PR squat (kg)</label>
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
                className="profile-field-input"
              />
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Start-PR bench (kg)</label>
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
                className="profile-field-input"
              />
            </div>
            <div className="profile-field">
              <label className="profile-field-label">Start-PR deadlift (kg)</label>
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
                className="profile-field-input"
              />
            </div>
          </div>
        ) : (
          <div className="profile-field-grid">
            <div className="profile-stat-card">
              <p className="profile-stat-card-label">Startdatum coaching</p>
              <p className="profile-stat-card-value">
                {formatCoachingStartDate(startingPrs.coaching_start_date)}
              </p>
            </div>
            <div className="profile-stat-card">
              <p className="profile-stat-card-label">Start-PR squat</p>
              <p className="profile-stat-card-value">
                {formatStartingPr(startingPrs.starting_pr_squat)}
              </p>
            </div>
            <div className="profile-stat-card">
              <p className="profile-stat-card-label">Start-PR bench</p>
              <p className="profile-stat-card-value">
                {formatStartingPr(startingPrs.starting_pr_bench)}
              </p>
            </div>
            <div className="profile-stat-card">
              <p className="profile-stat-card-label">Start-PR deadlift</p>
              <p className="profile-stat-card-value">
                {formatStartingPr(startingPrs.starting_pr_deadlift)}
              </p>
            </div>
          </div>
        )}
      </section>

      {canEdit && (
        <div className="profile-save-status">
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
