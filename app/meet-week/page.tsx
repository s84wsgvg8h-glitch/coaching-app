"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { isAthleteRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  formatCompetitionDateRange,
  getTodayDateString,
  type AthleteUpcomingCompetition,
  type Competition,
} from "@/lib/competitions";
import {
  getCompetitionChecklistStorageKey,
  loadCompetitionChecklistTemplate,
} from "@/lib/competitionChecklist";
import { buildCompetitionsIcs, downloadIcsFile } from "@/lib/icsExport";
import {
  applyAthleteScope,
  loadCoachOrgContext,
} from "@/lib/orgAthleteScope";
import {
  loadAthleteMeetWeekContext,
  pickMeetEntry,
  type MeetWeekEntry,
} from "@/lib/meetWeekHub";
import {
  formatWeeksOutLabel,
  getActiveMeetMilestone,
  getUpcomingMeetMilestones,
  weeksOutFromMeet,
} from "@/lib/meetWeekDisplay";
import CompetitionChecklistPanel from "@/components/meet/CompetitionChecklistPanel";
import MeetAttemptPlanner from "@/components/meet/MeetAttemptPlanner";
import MeetWeekCompetitionManager from "@/components/meet/MeetWeekCompetitionManager";

type AthleteOption = { id: string; full_name: string | null };

function getTaperPhase(countdown: number | null) {
  if (countdown === null) return null;
  if (countdown <= 0) return "Wedstrijddag";
  if (countdown <= 7) return "Meet-week";
  if (countdown <= 14) return "Taper";
  if (countdown <= 28) return "Opbouwfase";
  return "Ver weg";
}

function daysUntil(dateStr: string) {
  const today = new Date(getTodayDateString());
  const target = new Date(`${dateStr}T12:00:00`);
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function meetWeekHref(athleteId: string, competitionId?: string | null) {
  const params = new URLSearchParams({ athlete: athleteId });
  if (competitionId) params.set("competition", competitionId);
  return `/meet-week?${params.toString()}`;
}

function MeetWeekContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const athleteQuery = searchParams.get("athlete");
  const competitionQuery = searchParams.get("competition");

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [viewerId, setViewerId] = useState("");
  const [coachId, setCoachId] = useState("");
  const [athletes, setAthletes] = useState<AthleteOption[]>([]);
  const [targetAthleteId, setTargetAthleteId] = useState("");
  const [targetAthleteName, setTargetAthleteName] = useState("Atleet");
  const [entries, setEntries] = useState<MeetWeekEntry[]>([]);
  const [calendarMeets, setCalendarMeets] = useState<AthleteUpcomingCompetition[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<MeetWeekEntry | null>(null);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showAttemptPlanner, setShowAttemptPlanner] = useState(false);
  const [checklistProgress, setChecklistProgress] = useState({
    checkedCount: 0,
    totalCount: 0,
  });

  const loadChecklistProgress = useCallback(async (athleteId: string) => {
    const template = await loadCompetitionChecklistTemplate(athleteId);
    try {
      const raw = localStorage.getItem(getCompetitionChecklistStorageKey(athleteId));
      const checked = raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
      const allItems = template.sections.flatMap((section) => section.items);
      setChecklistProgress({
        checkedCount: allItems.filter((item) => checked[item.id]).length,
        totalCount: allItems.length,
      });
    } catch {
      const allItems = template.sections.flatMap((section) => section.items);
      setChecklistProgress({ checkedCount: 0, totalCount: allItems.length });
    }
  }, []);

  const loadMeetData = useCallback(
    async (athleteId: string, competitionId: string | null) => {
      const { entries: loadedEntries, calendarMeets: loadedCalendar } =
        await loadAthleteMeetWeekContext(athleteId);

      setEntries(loadedEntries);
      setCalendarMeets(loadedCalendar);
      setSelectedEntry(pickMeetEntry(loadedEntries, competitionId));
      await loadChecklistProgress(athleteId);
    },
    [loadChecklistProgress],
  );

  useEffect(() => {
    document.title = "Meet-week";

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setViewerId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, coach_id, full_name")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || "";
      setRole(userRole);
      setCoachId(profile?.coach_id || user.id);

      if (isAthleteRole(userRole)) {
        const athleteId = user.id;
        setTargetAthleteId(athleteId);
        setTargetAthleteName(profile?.full_name || "Atleet");
        await loadMeetData(athleteId, competitionQuery);
        setLoading(false);
        return;
      }

      if (!isCoachLikeRole(userRole)) {
        router.replace("/dashboard");
        return;
      }

      const ctx = (await loadCoachOrgContext(user.id)) || {
        coachId: user.id,
        role: userRole,
        organizationId: null,
      };
      ctx.role = userRole;

      let athletesQuery = supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      athletesQuery = applyAthleteScope(athletesQuery, ctx);
      const { data: athleteRows } = await athletesQuery;
      const options = athleteRows || [];
      setAthletes(options);

      const resolvedAthleteId =
        athleteQuery && options.some((row) => row.id === athleteQuery)
          ? athleteQuery
          : options[0]?.id || "";

      if (!resolvedAthleteId) {
        setLoading(false);
        return;
      }

      const athlete = options.find((row) => row.id === resolvedAthleteId);
      setTargetAthleteId(resolvedAthleteId);
      setTargetAthleteName(athlete?.full_name || "Atleet");
      await loadMeetData(resolvedAthleteId, competitionQuery);
      setLoading(false);
    }

    void init();
  }, [athleteQuery, competitionQuery, loadMeetData, router]);

  const isCoach = isCoachLikeRole(role);
  const isAthlete = isAthleteRole(role);
  const nextMeet = selectedEntry?.competition || null;
  const weeksOut = nextMeet ? weeksOutFromMeet(nextMeet.start_date) : null;
  const activeMilestone =
    weeksOut !== null ? getActiveMeetMilestone(weeksOut) : null;
  const upcomingMilestones =
    weeksOut !== null ? getUpcomingMeetMilestones(weeksOut) : [];

  async function handleAthleteChange(athleteId: string) {
    setTargetAthleteId(athleteId);
    const athlete = athletes.find((row) => row.id === athleteId);
    setTargetAthleteName(athlete?.full_name || "Atleet");
    router.replace(meetWeekHref(athleteId));
    await loadMeetData(athleteId, null);
  }

  async function handleMeetChange(competitionId: string) {
    router.replace(meetWeekHref(targetAthleteId, competitionId));
    setSelectedEntry(pickMeetEntry(entries, competitionId));
  }

  async function handleCompetitionUpdated(competitionId?: string) {
    await loadMeetData(targetAthleteId, competitionId ?? null);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-app-text">Meet-week hub</h1>
            <p className="mt-1 text-sm text-app-muted">
              Countdown, checklist, attempts en wedstrijdvoorbereiding.
            </p>
          </div>
          {isCoach && targetAthleteId ? (
            <Link
              href={`/athletes/${targetAthleteId}`}
              className="text-sm font-semibold text-brand-purple hover:underline"
            >
              ← Atleet hub
            </Link>
          ) : null}
        </div>

        {loading ? (
          <div className="app-card mt-6">
            <p className="text-sm text-app-muted">Laden...</p>
          </div>
        ) : (
          <>
            {isCoach ? (
              <div className="app-card mt-6">
                <label className="text-sm font-semibold text-app-text">
                  Atleet
                  <select
                    value={targetAthleteId}
                    onChange={(event) => void handleAthleteChange(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-app-border px-3 py-2 text-sm app-focus-ring"
                  >
                    {athletes.length === 0 ? (
                      <option value="">Geen atleten</option>
                    ) : (
                      athletes.map((athlete) => (
                        <option key={athlete.id} value={athlete.id}>
                          {athlete.full_name || "Atleet"}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            ) : null}

            {!targetAthleteId ? (
              <div className="app-card mt-6">
                <p className="text-sm text-app-muted">
                  Geen atleet geselecteerd.{" "}
                  <Link href="/athletes" className="text-brand-purple hover:underline">
                    Ga naar atleten
                  </Link>
                </p>
              </div>
            ) : entries.length > 0 ? (
              <>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {entries.map((entry) => {
                    const entryCountdown = daysUntil(entry.competition.start_date);
                    const entryWeeksOut = weeksOutFromMeet(entry.competition.start_date);
                    const entryPhase = getTaperPhase(entryCountdown);
                    const isSelected = entry.competition.id === nextMeet?.id;

                    return (
                      <button
                        key={entry.competition.id}
                        type="button"
                        onClick={() => void handleMeetChange(entry.competition.id)}
                        className={`min-w-[220px] flex-1 shrink-0 rounded-2xl border bg-app-surface p-4 text-center transition app-focus-ring ${
                          isSelected
                            ? "border-brand-purple ring-2 ring-brand-purple/20"
                            : "border-app-border hover:border-brand-purple/40"
                        }`}
                      >
                        <p className="text-xs font-semibold uppercase tracking-wide text-app-muted">
                          {entry.competition.naam}
                        </p>
                        <p className="mt-2 text-3xl font-black text-brand-purple">
                          {formatWeeksOutLabel(entryWeeksOut)}
                        </p>
                        <p className="text-sm text-app-muted">
                          {entryCountdown >= 0
                            ? `${entryCountdown} dagen tot wedstrijd`
                            : "Wedstrijdweek"}
                        </p>
                        {entryPhase ? (
                          <p className="mt-2 inline-block rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-900">
                            Fase: {entryPhase}
                          </p>
                        ) : null}
                        <p className="mt-3 text-sm text-app-text">
                          {formatCompetitionDateRange(
                            entry.competition.start_date,
                            entry.competition.end_date,
                          )}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {nextMeet ? (
                  <>
                    {selectedEntry?.coachNotes ? (
                      <div className="app-card mt-4">
                        <p className="text-sm text-app-muted">
                          <span className="font-semibold text-app-text">Coach:</span>{" "}
                          {selectedEntry.coachNotes}
                        </p>
                      </div>
                    ) : null}

                    {selectedEntry?.meetResults?.totalKg ? (
                      <div className="app-card mt-4">
                        <p className="text-sm text-app-text">
                          <span className="font-semibold">Resultaat:</span> S{" "}
                          {selectedEntry.meetResults.squatKg ?? "—"} / B{" "}
                          {selectedEntry.meetResults.benchKg ?? "—"} / D{" "}
                          {selectedEntry.meetResults.deadliftKg ?? "—"} — Totaal{" "}
                          {selectedEntry.meetResults.totalKg} kg
                        </p>
                      </div>
                    ) : null}

                    {activeMilestone ? (
                      <div className="app-card mt-4">
                        <p className="text-sm font-bold text-app-text">
                          Nu belangrijk · {activeMilestone.title}
                        </p>
                        <p className="mt-2 text-sm text-app-text">
                          {activeMilestone.description}
                        </p>
                      </div>
                    ) : null}

                    {upcomingMilestones.length > 0 ? (
                      <div className="app-card mt-4">
                        <p className="text-sm font-bold text-app-text">
                          Meet-voorbereiding
                        </p>
                        <ul className="mt-3 space-y-2 text-sm text-app-muted">
                          {upcomingMilestones.map((item) => (
                            <li key={item.weeksOut}>
                              <span className="font-semibold text-app-text">
                                {item.title}:
                              </span>{" "}
                              {item.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <div className="app-card mt-6">
                <p className="text-sm text-app-muted">
                  Geen aankomende wedstrijd voor {targetAthleteName}.
                  {isCoach
                    ? " Voeg hieronder een wedstrijd toe."
                    : " Bekijk de wedstrijdkalender voor aankomende meets."}
                </p>
              </div>
            )}

            {isCoach && targetAthleteId ? (
              <MeetWeekCompetitionManager
                athleteId={targetAthleteId}
                linkedCompetitionIds={entries.map((entry) => entry.competition.id)}
                onUpdated={handleCompetitionUpdated}
              />
            ) : null}

            {isAthlete && calendarMeets.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const ics = buildCompetitionsIcs(calendarMeets);
                    downloadIcsFile("limitless-wedstrijden.ics", ics);
                  }}
                  className="app-btn-secondary text-sm"
                >
                  Download agenda (.ics)
                </button>
              </div>
            ) : null}

            {targetAthleteId ? (
              <>
                <div className="app-card mt-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-app-text">
                        Wedstrijd-checklist
                      </p>
                      {checklistProgress.totalCount > 0 ? (
                        <p className="text-xs text-app-muted">
                          {checklistProgress.checkedCount}/
                          {checklistProgress.totalCount} afgevinkt
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowChecklist((value) => !value)}
                      className="app-btn-secondary text-sm"
                    >
                      {showChecklist ? "Inklappen" : "Open checklist"}
                    </button>
                  </div>
                  {showChecklist ? (
                    <div className="mt-4 border-t border-app-border pt-4">
                      <CompetitionChecklistPanel
                        userId={targetAthleteId}
                        compact
                      />
                    </div>
                  ) : null}
                </div>

                {nextMeet ? (
                  <div className="app-card mt-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm font-bold text-app-text">Attempt planner</p>
                      <button
                        type="button"
                        onClick={() => setShowAttemptPlanner((value) => !value)}
                        className="app-btn-secondary text-sm"
                      >
                        {showAttemptPlanner ? "Inklappen" : "Open planner"}
                      </button>
                    </div>
                    {showAttemptPlanner ? (
                      <div className="mt-4 border-t border-app-border pt-4">
                        <MeetAttemptPlanner
                          athleteId={targetAthleteId}
                          competitionId={nextMeet.id}
                          coachId={isCoach ? viewerId : coachId}
                        />
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function MeetWeekPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <div className="app-card mt-6">
            <p className="text-sm text-app-muted">Meet-week laden...</p>
          </div>
        </AppShell>
      }
    >
      <MeetWeekContent />
    </Suspense>
  );
}
