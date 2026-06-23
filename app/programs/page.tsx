"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Dumbbell } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PageContainer } from "@/components/ui/design-system";
import { PageLoading } from "@/components/ui/Skeleton";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  buildProgramWeekPath,
  isNoAthleteProgramMessage,
  NO_ATHLETE_PROGRAM_MESSAGE,
  resolveProgramEntryForAthlete,
} from "@/lib/programNavigation";

function ProgramsRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const athleteQuery = searchParams.get("athlete");
  const [emptyMessage, setEmptyMessage] = useState<string | null>(null);

  useEffect(() => {
    async function redirect() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "";

      if (isCoachLikeRole(role)) {
        if (!athleteQuery) {
          router.replace("/athletes");
          return;
        }

        const { data: entry, error } = await resolveProgramEntryForAthlete(
          athleteQuery,
          user.id,
        );

        if (error || !entry) {
          alert(error || "Geen programma gevonden voor deze atleet.");
          router.replace(`/athletes/${athleteQuery}`);
          return;
        }

        router.replace(buildProgramWeekPath(entry, { coachViewingAthlete: true }));
        return;
      }

      const { data: entry, error } = await resolveProgramEntryForAthlete(
        user.id,
        user.id,
      );

      if (!entry && isNoAthleteProgramMessage(error)) {
        setEmptyMessage(NO_ATHLETE_PROGRAM_MESSAGE);
        return;
      }

      if (error || !entry) {
        setEmptyMessage(error || "Geen programma gevonden.");
        return;
      }

      router.replace(buildProgramWeekPath(entry));
    }

    void redirect();
  }, [athleteQuery, router]);

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
        <p className="mt-4 text-center text-[13px] text-app-muted">
          Als coach selecteer je eerst een atleet om het programma te bekijken.
        </p>
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
