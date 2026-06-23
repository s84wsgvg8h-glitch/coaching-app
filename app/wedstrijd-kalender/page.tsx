"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { PageContainer, PageHeader, Panel, SectionHeader } from "@/components/ui/design-system";
import {
  formatCompetitionDateRange,
  getTodayDateString,
  isUpcomingCompetition,
  loadAthleteCompetitionNotes,
  saveAthleteCompetitionNotes,
  saveAthleteCompetitions,
  type Competition,
} from "@/lib/competitions";
import { applyAthleteScope, loadCoachOrgContext } from "@/lib/orgAthleteScope";
import SeasonPlannerView from "@/components/wedstrijd/SeasonPlannerView";

type EditForm = {
  naam: string;
  startDate: string;
  endDate: string;
};

function emptyEditForm(): EditForm {
  return { naam: "", startDate: "", endDate: "" };
}

export default function WedstrijdKalenderPage() {
  const [wedstrijden, setWedstrijden] = useState<Competition[]>([]);
  const [naam, setNaam] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [toevoegenLoading, setToevoegenLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(emptyEditForm());
  const [opslaanLoading, setOpslaanLoading] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [upcomingExpanded, setUpcomingExpanded] = useState(false);
  const [coachAthletes, setCoachAthletes] = useState<
    Array<{ id: string; full_name: string | null }>
  >([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [selectedCompetitionIds, setSelectedCompetitionIds] = useState<string[]>(
    [],
  );
  const [competitionNotesById, setCompetitionNotesById] = useState<
    Record<string, { coachNotes: string; goals: string }>
  >({});
  const [athleteCompetitionsLoading, setAthleteCompetitionsLoading] =
    useState(false);
  const [athleteCompetitionsSaving, setAthleteCompetitionsSaving] =
    useState(false);
  const [seasonAssignments, setSeasonAssignments] = useState<
    Array<{ athleteId: string; athleteName: string; competitionId: string }>
  >([]);

  useEffect(() => {
    void initPage();
  }, []);

  useEffect(() => {
    if (!isCoach || !selectedAthleteId) return;
    void loadAthleteCompetitionState(selectedAthleteId);
  }, [isCoach, selectedAthleteId]);

  async function initPage() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const coachViewer =
        profile?.role === "coach" || profile?.role === "admin";
      setIsCoach(coachViewer);

      if (coachViewer) {
        await Promise.all([
          loadCoachAthletes(user.id, profile?.role || ""),
          loadSeasonAssignments(),
        ]);
      }

      if (profile?.role === "atleet") {
        window.location.href = "/meet-week";
        return;
      }

      await haalWedstrijdenOp();

      return;
    }

    await haalWedstrijdenOp();
  }

  async function loadSeasonAssignments() {
    const { data: rows } = await supabase
      .from("athlete_competitions")
      .select("athlete_id, competition_id");

    if (!rows?.length) {
      setSeasonAssignments([]);
      return;
    }

    const athleteIds = [...new Set(rows.map((row) => row.athlete_id as string))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", athleteIds);

    const nameById = new Map(
      (profiles || []).map((profile) => [
        profile.id as string,
        profile.full_name as string | null,
      ]),
    );

    setSeasonAssignments(
      rows.map((row) => ({
        athleteId: row.athlete_id as string,
        athleteName: nameById.get(row.athlete_id as string) || "Atleet",
        competitionId: row.competition_id as string,
      })),
    );
  }

  async function loadCoachAthletes(viewerId: string, viewerRole: string) {
    const ctx = (await loadCoachOrgContext(viewerId)) || {
      coachId: viewerId,
      role: viewerRole,
      organizationId: null,
    };
    ctx.role = viewerRole;

    let query = supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "atleet")
      .order("full_name", { ascending: true });

    query = applyAthleteScope(query, ctx);

    const { data } = await query;
    const athletes = data || [];
    setCoachAthletes(athletes);
    if (athletes[0]) {
      setSelectedAthleteId(athletes[0].id);
    }
  }

  async function loadAthleteCompetitionState(athleteId: string) {
    setAthleteCompetitionsLoading(true);

    const { data } = await loadAthleteCompetitionNotes(athleteId);
    setSelectedCompetitionIds(data.map((entry) => entry.competitionId));
    setCompetitionNotesById(
      Object.fromEntries(
        data.map((entry) => [
          entry.competitionId,
          {
            coachNotes: entry.coachNotes || "",
            goals: entry.goals || "",
          },
        ]),
      ),
    );

    setAthleteCompetitionsLoading(false);
  }

  function toggleAthleteCompetition(competitionId: string) {
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
      }

      return next;
    });
  }

  function updateAthleteCompetitionNotes(
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

  async function saveAthleteCompetitionState() {
    if (!selectedAthleteId) return;

    setAthleteCompetitionsSaving(true);

    const notesPayload = Object.fromEntries(
      selectedCompetitionIds.map((competitionId) => [
        competitionId,
        {
          coachNotes: competitionNotesById[competitionId]?.coachNotes ?? null,
          goals: competitionNotesById[competitionId]?.goals ?? null,
        },
      ]),
    );

    await saveAthleteCompetitions(
      selectedAthleteId,
      selectedCompetitionIds,
      notesPayload,
    );

    setAthleteCompetitionsSaving(false);
    await loadAthleteCompetitionState(selectedAthleteId);
  }

  async function persistAthleteCompetitionNotes(competitionId: string) {
    if (!selectedAthleteId || !selectedCompetitionIds.includes(competitionId)) {
      return;
    }

    const notes = competitionNotesById[competitionId];
    if (!notes) return;

    await saveAthleteCompetitionNotes(selectedAthleteId, competitionId, {
      coachNotes: notes.coachNotes,
      goals: notes.goals,
    });
  }

  async function haalWedstrijdenOp() {
    setLoading(true);

    const { data, error } = await supabase
      .from("wedstrijden")
      .select("id, naam, start_date, end_date, created_at")
      .order("start_date", { ascending: true });

    if (error) {
      alert(error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    setWedstrijden((data || []) as Competition[]);
    setLoading(false);
  }

  async function voegWedstrijdToe() {
    if (!naam.trim() || !startDate) {
      alert("Vul een wedstrijdnaam en startdatum in.");
      return;
    }

    const resolvedEndDate = endDate || startDate;

    if (resolvedEndDate < startDate) {
      alert("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    setToevoegenLoading(true);

    const { error } = await supabase.from("wedstrijden").insert([
      {
        naam: naam.trim(),
        datum: startDate,
        start_date: startDate,
        end_date: resolvedEndDate,
      },
    ]);

    if (error) {
      alert(error.message);
      console.error(error);
      setToevoegenLoading(false);
      return;
    }

    setNaam("");
    setStartDate("");
    setEndDate("");
    setToevoegenLoading(false);

    await haalWedstrijdenOp();
  }

  function startBewerken(wedstrijd: Competition) {
    setEditingId(wedstrijd.id);
    setEditForm({
      naam: wedstrijd.naam,
      startDate: wedstrijd.start_date,
      endDate: wedstrijd.end_date,
    });
  }

  function annuleerBewerken() {
    setEditingId(null);
    setEditForm(emptyEditForm());
  }

  async function slaWedstrijdOp(id: string) {
    if (!editForm.naam.trim() || !editForm.startDate) {
      alert("Vul een wedstrijdnaam en startdatum in.");
      return;
    }

    const resolvedEndDate = editForm.endDate || editForm.startDate;

    if (resolvedEndDate < editForm.startDate) {
      alert("De einddatum mag niet voor de startdatum liggen.");
      return;
    }

    setOpslaanLoading(true);

    const { error } = await supabase
      .from("wedstrijden")
      .update({
        naam: editForm.naam.trim(),
        datum: editForm.startDate,
        start_date: editForm.startDate,
        end_date: resolvedEndDate,
      })
      .eq("id", id);

    setOpslaanLoading(false);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    annuleerBewerken();
    await haalWedstrijdenOp();
  }

  async function verwijderWedstrijd(id: string) {
    const zeker = confirm(
      "Weet je zeker dat je deze wedstrijd wilt verwijderen?"
    );

    if (!zeker) return;

    const { error } = await supabase
      .from("wedstrijden")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      console.error(error);
      return;
    }

    if (editingId === id) {
      annuleerBewerken();
    }

    setWedstrijden(wedstrijden.filter((wedstrijd) => wedstrijd.id !== id));
  }

  const selectedAthlete = useMemo(
    () => coachAthletes.find((athlete) => athlete.id === selectedAthleteId),
    [coachAthletes, selectedAthleteId],
  );

  function renderWedstrijdRow(wedstrijd: Competition, muted = false) {
    const isEditing = editingId === wedstrijd.id;

    if (isEditing) {
      return (
        <div
          key={wedstrijd.id}
          className="rounded-xl border border-app-border bg-app-surface-muted p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input
              type="text"
              value={editForm.naam}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  naam: event.target.value,
                }))
              }
              placeholder="Naam van wedstrijd"
              className="ui-auth-input px-3 py-2.5 md:col-span-2"
            />

            <input
              type="date"
              value={editForm.startDate}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  startDate: event.target.value,
                }))
              }
              aria-label="Startdatum"
              className="ui-auth-input px-3 py-2.5"
            />

            <input
              type="date"
              value={editForm.endDate}
              onChange={(event) =>
                setEditForm((current) => ({
                  ...current,
                  endDate: event.target.value,
                }))
              }
              aria-label="Einddatum"
              className="ui-auth-input px-3 py-2.5"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void slaWedstrijdOp(wedstrijd.id)}
              disabled={opslaanLoading}
              className="app-btn-primary disabled:opacity-50"
            >
              {opslaanLoading ? "Opslaan..." : "Opslaan"}
            </button>

            <button
              type="button"
              onClick={annuleerBewerken}
              disabled={opslaanLoading}
              className="app-btn-secondary disabled:opacity-50"
            >
              Annuleren
            </button>
          </div>
        </div>
      );
    }

    const linkedCount = seasonAssignments.filter(
      (row) => row.competitionId === wedstrijd.id,
    ).length;

    return (
      <div
        key={wedstrijd.id}
        className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition hover:border-app-border-strong ${
          muted
            ? "border-app-border bg-app-surface-muted/50 opacity-80"
            : "border-app-border bg-app-surface-muted"
        }`}
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14px] font-semibold text-app-text">
              {wedstrijd.naam}
            </h3>
            <span
              className={`ui-badge ${
                linkedCount > 0 ? "ui-badge-success" : "ui-badge-muted"
              }`}
            >
              {linkedCount > 0
                ? `${linkedCount} atleet${linkedCount > 1 ? "en" : ""}`
                : "Gepland"}
            </span>
          </div>
          <p className="mt-1 text-[12px] text-app-muted">
            {formatCompetitionDateRange(
              wedstrijd.start_date,
              wedstrijd.end_date,
            )}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => startBewerken(wedstrijd)}
            className="app-btn-secondary !px-3 !py-1.5 text-[12px]"
          >
            Aanpassen
          </button>

          <button
            type="button"
            onClick={() => void verwijderWedstrijd(wedstrijd.id)}
            className="app-btn-secondary !px-3 !py-1.5 text-[12px] !text-app-destructive"
          >
            Verwijderen
          </button>
        </div>
      </div>
    );
  }

  const today = getTodayDateString();
  const upcomingWedstrijden = wedstrijden.filter((wedstrijd) =>
    isUpcomingCompetition(wedstrijd, today),
  );
  const pastWedstrijden = wedstrijden.filter(
    (wedstrijd) => !isUpcomingCompetition(wedstrijd, today),
  );

  const linkedCompetitions = useMemo(
    () =>
      upcomingWedstrijden.filter((comp) =>
        selectedCompetitionIds.includes(comp.id),
      ),
    [upcomingWedstrijden, selectedCompetitionIds],
  );

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Wedstrijdkalender"
          description="Plan wedstrijden, koppel atleten en beheer notities per meet."
        />

        {isCoach ? (
          <Panel className="mt-6">
            <SectionHeader
              title="Seizoensplanner"
              description="Overzicht per maand: welke atleten aan welke wedstrijd zijn gekoppeld."
            />
            <SeasonPlannerView
              competitions={upcomingWedstrijden}
              assignments={seasonAssignments}
            />
          </Panel>
        ) : null}

        <Panel className="mt-6">
          <SectionHeader title="Wedstrijd toevoegen" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <input
              type="text"
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              placeholder="Naam van wedstrijd"
              className="ui-auth-input px-3 py-2.5 md:col-span-2"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Startdatum"
              className="ui-auth-input px-3 py-2.5"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="Einddatum"
              className="ui-auth-input px-3 py-2.5"
            />
            <button
              type="button"
              onClick={() => void voegWedstrijdToe()}
              disabled={toevoegenLoading}
              className="app-btn-primary disabled:opacity-50 md:col-span-4"
            >
              {toevoegenLoading ? "Toevoegen..." : "Wedstrijd toevoegen"}
            </button>
          </div>
        </Panel>

        {isCoach && coachAthletes.length > 0 ? (
          <Panel className="mt-6">
            <SectionHeader
              title="Atleet & wedstrijden"
              description="Koppel wedstrijden en voeg notities toe per atleet."
            />

            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start">
              {selectedAthlete ? (
                <div className="flex min-w-[200px] items-center gap-3 rounded-xl border border-app-border bg-app-surface-muted px-4 py-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-app-accent/15 text-[13px] font-semibold text-app-accent">
                    {(selectedAthlete.full_name || "A")
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold text-app-text">
                      {selectedAthlete.full_name || "Naamloos"}
                    </p>
                    <p className="text-[11px] text-app-muted">
                      {linkedCompetitions.length} gekoppelde wedstrijd
                      {linkedCompetitions.length === 1 ? "" : "en"}
                    </p>
                  </div>
                </div>
              ) : null}

              <select
                value={selectedAthleteId}
                onChange={(event) => setSelectedAthleteId(event.target.value)}
                className="ui-auth-input w-full max-w-md px-3 py-2.5 text-[13px] sm:ml-auto"
                aria-label="Atleet selecteren"
              >
                {coachAthletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.full_name || "Naamloos"}
                  </option>
                ))}
              </select>
            </div>

            {athleteCompetitionsLoading ? (
              <SkeletonList rows={4} />
            ) : upcomingWedstrijden.length === 0 ? (
              <EmptyState
                title="Geen aankomende wedstrijden"
                description="Voeg eerst een wedstrijd toe om atleten te koppelen."
                compact
              />
            ) : (
              <div className="space-y-2.5">
                {upcomingWedstrijden.map((competition) => {
                  const checked = selectedCompetitionIds.includes(competition.id);
                  const notes = competitionNotesById[competition.id];

                  return (
                    <div
                      key={competition.id}
                      className={`rounded-xl border px-4 py-3 transition ${
                        checked
                          ? "border-app-accent/40 bg-app-accent/5"
                          : "border-app-border bg-app-surface-muted hover:border-app-border-strong"
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAthleteCompetition(competition.id)}
                          className="mt-1 h-4 w-4 rounded border-app-border accent-app-accent"
                        />
                        <span className="min-w-0">
                          <span className="text-[13px] font-semibold text-app-text">
                            {competition.naam}
                          </span>
                          <span className="ml-2 text-[12px] font-normal text-app-muted">
                            {formatCompetitionDateRange(
                              competition.start_date,
                              competition.end_date,
                            )}
                          </span>
                        </span>
                      </label>

                      {checked ? (
                        <div className="mt-3 pl-7">
                          <label className="mb-1.5 block text-[11px] font-medium text-app-muted">
                            Wedstrijdnotities
                          </label>
                          <textarea
                            value={notes?.coachNotes || ""}
                            onChange={(event) =>
                              updateAthleteCompetitionNotes(
                                competition.id,
                                "coachNotes",
                                event.target.value,
                              )
                            }
                            onBlur={() =>
                              void persistAthleteCompetitionNotes(competition.id)
                            }
                            rows={3}
                            placeholder="Doelen, gewichtsklasse, taper-notities…"
                            className="ui-auth-input w-full px-3 py-2 text-[13px]"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}

            {linkedCompetitions.length === 0 &&
            !athleteCompetitionsLoading &&
            upcomingWedstrijden.length > 0 ? (
              <p className="mt-4 text-[12px] text-app-muted">
                Nog geen wedstrijden gekoppeld aan deze atleet.
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => void saveAthleteCompetitionState()}
              disabled={athleteCompetitionsSaving || !selectedAthleteId}
              className="app-btn-primary mt-4 disabled:opacity-50"
            >
              {athleteCompetitionsSaving ? "Opslaan..." : "Wedstrijden opslaan"}
            </button>
          </Panel>
        ) : null}

        <Panel className="mt-6 overflow-hidden !p-0">
          <button
            type="button"
            onClick={() => setUpcomingExpanded((open) => !open)}
            className="flex w-full items-center justify-between gap-3 border-b border-app-border px-4 py-3 text-left app-focus-ring"
          >
            <h2 className="text-[15px] font-semibold text-app-text">Alle wedstrijden</h2>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-app-muted transition ${
                upcomingExpanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {upcomingExpanded ? (
            <div className="space-y-6 p-4">
              <section>
                <h3 className="mb-3 text-[13px] font-semibold text-app-text">
                  Aankomend
                </h3>
                {loading ? (
                  <SkeletonList rows={3} />
                ) : upcomingWedstrijden.length === 0 ? (
                  <EmptyState
                    title="Geen aankomende wedstrijden"
                    description="Voeg hierboven je eerste wedstrijd toe."
                    compact
                  />
                ) : (
                  <div className="space-y-2">
                    {upcomingWedstrijden.map((wedstrijd) =>
                      renderWedstrijdRow(wedstrijd),
                    )}
                  </div>
                )}
              </section>

              {!loading && pastWedstrijden.length > 0 ? (
                <section className="border-t border-app-border pt-5">
                  <h3 className="mb-3 text-[13px] font-semibold text-app-muted">
                    Afgelopen
                  </h3>
                  <div className="space-y-2">
                    {pastWedstrijden.map((wedstrijd) =>
                      renderWedstrijdRow(wedstrijd, true),
                    )}
                  </div>
                </section>
              ) : null}
            </div>
          ) : null}
        </Panel>
      </PageContainer>
    </AppShell>
  );
}
