"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Dumbbell, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/ui/EmptyState";
import { PageContainer } from "@/components/ui/design-system";
import { PageLoading } from "@/components/ui/Skeleton";
import { showAppToast } from "@/lib/appToast";
import { getCoachLastAthleteId, setCoachLastAthleteId } from "@/lib/coachLastAthlete";
import {
  loadCoachProgramAthletes,
  type CoachProgramAthleteRow,
} from "@/lib/coachProgramAthletes";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  getCachedAthleteProgramHref,
  prefetchAthleteProgramEntry,
  prefetchCoachAthleteProgramEntries,
  useAthleteProgramEntry,
  type AthleteProgramEntryResult,
} from "@/hooks/useAthleteProgramEntry";
import { readAthleteProgramHrefSession } from "@/lib/programEntrySessionCache";
import { prefetchProgramWeekFromHref } from "@/lib/prefetchProgramWeekFromHref";
import { queryKeys } from "@/lib/queryKeys";
import {
  isNoAthleteProgramMessage,
  NO_ATHLETE_PROGRAM_MESSAGE,
} from "@/lib/programNavigation";

function CoachProgramAthletePicker({
  athletes,
  coachId,
}: {
  athletes: CoachProgramAthleteRow[];
  coachId: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    void prefetchCoachAthleteProgramEntries(
      queryClient,
      coachId,
      athletes.map((athlete) => athlete.id),
    );
  }, [athletes, coachId, queryClient]);

  function prefetchAthleteWeek(athleteId: string) {
    const href = getCachedAthleteProgramHref(queryClient, athleteId, coachId);
    if (href && href !== "/programs") {
      void prefetchProgramWeekFromHref(queryClient, href, {
        userId: coachId,
        role: "coach",
      });
    }
  }

  async function openProgram(athleteId: string) {
    setOpeningId(athleteId);
    setCoachLastAthleteId(athleteId);

    let cached = queryClient.getQueryData<AthleteProgramEntryResult>(
      queryKeys.athleteProgramEntry(athleteId, coachId),
    );

    if (!cached) {
      await prefetchAthleteProgramEntry(queryClient, athleteId, coachId);
      cached = queryClient.getQueryData<AthleteProgramEntryResult>(
        queryKeys.athleteProgramEntry(athleteId, coachId),
      );
    }

    if (!cached?.hasProgram || !cached.href || cached.href === "/programs") {
      showAppToast(cached?.error || "Geen programma gevonden voor deze atleet.");
      setOpeningId(null);
      return;
    }

    await prefetchProgramWeekFromHref(queryClient, cached.href, {
      userId: coachId,
      role: "coach",
    });

    router.replace(cached.href);
  }

  if (athletes.length === 0) {
    return (
      <AppShell contentClassName="flex-1 px-4 pb-16 pt-2 md:px-6 md:pt-3">
        <PageContainer size="md">
          <div className="app-card mx-auto max-w-lg p-6 sm:p-8">
            <EmptyState
              icon="athletes"
              title="Nog geen atleten"
              description="Nodig je eerste atleet uit om een programma te bekijken of te bewerken."
              action={
                <Link href="/athletes" className="app-btn-primary inline-flex min-h-[44px]">
                  Naar atleten
                </Link>
              }
            />
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName="flex-1 px-4 pb-16 pt-2 md:px-6 md:pt-3">
      <PageContainer size="md">
        <div className="app-card mx-auto max-w-lg overflow-hidden">
          <div className="border-b border-app-border px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-app-accent/10 text-app-accent">
                <Dumbbell className="h-5 w-5" strokeWidth={1.75} />
              </span>
              <div>
                <h1 className="text-lg font-semibold text-app-text">
                  Kies een atleet
                </h1>
                <p className="mt-0.5 text-[13px] text-app-muted">
                  Open het programma van een atleet om verder te gaan.
                </p>
              </div>
            </div>
          </div>
          <ul className="divide-y divide-app-border">
            {athletes.map((athlete) => (
              <li key={athlete.id}>
                <button
                  type="button"
                  disabled={openingId === athlete.id}
                  onPointerEnter={() => prefetchAthleteWeek(athlete.id)}
                  onFocus={() => prefetchAthleteWeek(athlete.id)}
                  onClick={() => void openProgram(athlete.id)}
                  className="app-focus-ring flex w-full min-h-[52px] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-app-surface-hover disabled:opacity-60"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-app-accent-muted text-[11px] font-bold text-app-accent">
                    {(athlete.full_name || "A")
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase() || "")
                      .join("")}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-app-text">
                    {athlete.full_name || "Atleet"}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-app-muted" />
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-app-border px-5 py-4">
            <Link
              href="/athletes"
              className="app-focus-ring inline-flex min-h-[44px] items-center gap-2 text-[13px] font-medium text-app-accent hover:underline"
            >
              <Users className="h-4 w-4" />
              Alle atleten beheren
            </Link>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

function ProgramsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const athleteQuery = searchParams.get("athlete");
  const queryClient = useQueryClient();
  const { userId, role, loading: authLoading } = useAuth();
  const athleteEntryQuery = useAthleteProgramEntry(
    userId,
    userId,
    role === "atleet" && !authLoading && Boolean(userId),
  );
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);
  const [coachAthletes, setCoachAthletes] = useState<
    CoachProgramAthleteRow[] | null
  >(null);
  const [showCoachPicker, setShowCoachPicker] = useState(false);

  useLayoutEffect(() => {
    if (authLoading || !userId || role !== "atleet") return;

    const resolved =
      athleteEntryQuery.data ??
      queryClient.getQueryData<AthleteProgramEntryResult>(
        queryKeys.athleteProgramEntry(userId, userId),
      );

    const href =
      resolved?.href ??
      (resolved ? null : readAthleteProgramHrefSession());

    if (
      href &&
      href !== "/programs" &&
      resolved?.hasProgram !== false
    ) {
      router.replace(href);
    }
  }, [
    athleteEntryQuery.data,
    authLoading,
    queryClient,
    role,
    router,
    userId,
  ]);

  useEffect(() => {
    if (authLoading) return;

    if (!userId) {
      router.replace("/login");
      return;
    }

    async function redirect() {
      if (isCoachLikeRole(role)) {
        const targetAthleteId =
          athleteQuery || getCoachLastAthleteId() || null;

        if (!targetAthleteId) {
          const cachedAthletes = queryClient.getQueryData<CoachProgramAthleteRow[]>(
            queryKeys.coachProgramAthletes(userId),
          );

          if (cachedAthletes) {
            setCoachAthletes(cachedAthletes);
            setShowCoachPicker(true);
            void prefetchCoachAthleteProgramEntries(
              queryClient,
              userId,
              cachedAthletes.map((athlete) => athlete.id),
            );
            return;
          }

          const athletes = await loadCoachProgramAthletes(userId);
          queryClient.setQueryData(
            queryKeys.coachProgramAthletes(userId),
            athletes,
          );
          setCoachAthletes(athletes);
          setShowCoachPicker(true);
          void prefetchCoachAthleteProgramEntries(
            queryClient,
            userId,
            athletes.map((athlete) => athlete.id),
          );
          return;
        }

        let cached = queryClient.getQueryData<AthleteProgramEntryResult>(
          queryKeys.athleteProgramEntry(targetAthleteId, userId),
        );

        if (!cached) {
          await prefetchAthleteProgramEntry(
            queryClient,
            targetAthleteId,
            userId,
          );
          cached = queryClient.getQueryData<AthleteProgramEntryResult>(
            queryKeys.athleteProgramEntry(targetAthleteId, userId),
          );
        }

        if (!cached?.hasProgram || !cached.href || cached.href === "/programs") {
          if (!athleteQuery) {
            const athletes =
              queryClient.getQueryData<CoachProgramAthleteRow[]>(
                queryKeys.coachProgramAthletes(userId),
              ) ?? (await loadCoachProgramAthletes(userId));

            queryClient.setQueryData(
              queryKeys.coachProgramAthletes(userId),
              athletes,
            );
            setCoachAthletes(athletes);
            setShowCoachPicker(true);
            showAppToast(
              cached?.error || "Geen programma gevonden voor deze atleet.",
            );
            return;
          }

          showAppToast(cached?.error || "Geen programma gevonden voor deze atleet.");
          router.replace(`/athletes/${targetAthleteId}`);
          return;
        }

        setCoachLastAthleteId(targetAthleteId);
        await prefetchProgramWeekFromHref(queryClient, cached.href, {
          userId,
          role,
        });
        router.replace(cached.href);
        return;
      }

      if (role === "atleet") {
        const entryData =
          athleteEntryQuery.data ??
          queryClient.getQueryData<AthleteProgramEntryResult>(
            queryKeys.athleteProgramEntry(userId, userId),
          );

        if (!entryData) {
          if (athleteEntryQuery.isPending) return;
          await prefetchAthleteProgramEntry(queryClient, userId, userId);
        }

        const resolved =
          entryData ??
          queryClient.getQueryData<AthleteProgramEntryResult>(
            queryKeys.athleteProgramEntry(userId, userId),
          );

        if (
          !resolved?.hasProgram &&
          isNoAthleteProgramMessage(resolved?.error ?? null)
        ) {
          setEmptyMessage(NO_ATHLETE_PROGRAM_MESSAGE);
          return;
        }

        if (
          !resolved?.hasProgram ||
          !resolved.href ||
          resolved.href === "/programs"
        ) {
          setEmptyMessage(resolved?.error || "Geen programma gevonden.");
          return;
        }

        router.replace(resolved.href);
        return;
      }
    }

    void redirect();
  }, [
    athleteEntryQuery.data,
    athleteEntryQuery.isPending,
    athleteQuery,
    authLoading,
    queryClient,
    role,
    router,
    userId,
  ]);

  if (showCoachPicker && coachAthletes !== null && userId) {
    return (
      <CoachProgramAthletePicker athletes={coachAthletes} coachId={userId} />
    );
  }

  if (emptyMessage) {
    return (
      <AppShell contentClassName="flex-1 px-4 pb-16 pt-2 md:px-6 md:pt-3">
        <PageContainer size="md">
          <div className="mx-auto max-w-lg rounded-2xl border border-app-border bg-app-surface p-6 text-center sm:p-8">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-app-accent/10 text-app-accent">
              <Dumbbell className="h-7 w-7" />
            </span>
            <h1 className="mt-5 text-xl font-semibold text-app-text">
              Nog geen programma
            </h1>
            <p className="mt-3 text-[14px] leading-relaxed text-app-muted">
              {emptyMessage}
            </p>
            <Link href="/dashboard" className="app-btn-primary mt-6 inline-flex">
              Terug naar dashboard
            </Link>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer size="md">
        <PageLoading label="Programma openen…" />
      </PageContainer>
    </AppShell>
  );
}

export default function ProgramsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer size="md">
            <PageLoading label="Programma openen…" />
          </PageContainer>
        </AppShell>
      }
    >
      <ProgramsRedirectContent />
    </Suspense>
  );
}
