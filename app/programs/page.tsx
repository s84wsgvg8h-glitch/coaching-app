"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import ProgramSearch from "@/components/ProgramSearch";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import { ApplyTemplatePanel } from "@/components/programs/ProgramTemplateActions";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  buildProgramWeekPath,
  resolveProgramEntryForAthlete,
} from "@/lib/programNavigation";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

export default function ProgramsPage() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [athletes, setAthletes] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAthleteId, setOpeningAthleteId] = useState("");
  const [redirectingAthlete, setRedirectingAthlete] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const loadedRole = profile?.role || "";
    setRole(loadedRole);

    if (isCoachLikeRole(loadedRole)) {
      let athletesQuery = supabase
        .from("profiles")
        .select("*")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      if (!isAdminRole(loadedRole)) {
        athletesQuery = athletesQuery.eq("coach_id", user.id);
      }

      const { data: acceptedAthletes, error } = await athletesQuery;

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setAthletes(acceptedAthletes || []);
      setLoading(false);
      return;
    }

    setRedirectingAthlete(true);
    await openAthleteProgram(user.id, loadedRole);
    setLoading(false);
  }

  async function openAthleteProgram(athleteId: string, loadedRole?: string) {
    setOpeningAthleteId(athleteId);

    const activeRole = loadedRole || role;
    const actingUserId = userId || athleteId;

    const { data: entry, error } = await resolveProgramEntryForAthlete(
      athleteId,
      actingUserId,
    );

    if (error || !entry) {
      alert(error || "Geen block of week gevonden");
      setOpeningAthleteId("");
      setRedirectingAthlete(false);
      return;
    }

    window.location.href = buildProgramWeekPath(entry, {
      coachViewingAthlete: isCoachLikeRole(activeRole),
    });
  }

  if (redirectingAthlete || (loading && !isCoachLikeRole(role))) {
    return (
      <AppShell contentClassName="flex-1 p-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl bg-white p-8 shadow">
            <p className="text-gray-500">Programma openen...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <p className="mb-1 text-sm text-gray-500">Programma’s</p>

          <h1 className="text-3xl font-bold text-black">Kies een atleet</h1>

          <p className="mt-2 text-gray-500">
            Klik op een atleet om direct naar zijn of haar blocks en weken te
            gaan.
          </p>

          {!loading && isCoachLikeRole(role) && (
            <div className="mt-4">
              <ProgramSearch
                context={{
                  athletes: athletes.map((athlete) => ({
                    id: athlete.id,
                    name: athlete.full_name || "Atleet",
                  })),
                }}
              />
            </div>
          )}
        </div>

        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow">
            <SkeletonList rows={4} />
          </div>
        )}

        {!loading && isCoachLikeRole(role) && athletes.length === 0 && (
          <EmptyState
            icon="programs"
            title="Geen atleten gevonden"
            description='Er zijn nog geen atleten met de rol "atleet".'
          />
        )}

        {!loading && isCoachLikeRole(role) && athletes.length > 0 && (
          <div className="flex flex-col gap-4">
            {athletes.map((athlete) => {
              const isOpening = openingAthleteId === athlete.id;

              return (
                <div key={athlete.id} className="space-y-3">
                  <button
                    type="button"
                    onClick={() => openAthleteProgram(athlete.id)}
                    disabled={!!openingAthleteId}
                    className={`w-full rounded-2xl border-2 bg-white p-5 text-left shadow transition-all duration-150 ${
                      isOpening
                        ? "scale-[0.99] border-black opacity-80"
                        : "border-transparent hover:-translate-y-0.5 hover:border-black hover:shadow-lg"
                    }`}
                  >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-xl font-bold text-white">
                        {(athlete.full_name || "A").charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h2 className="text-lg font-bold text-black">
                          {athlete.full_name || "Naamloze atleet"}
                        </h2>

                        <p className="text-sm text-gray-500">
                          Open trainingsprogramma
                        </p>
                      </div>
                    </div>

                    <div className="text-2xl text-gray-300">
                      {isOpening ? "…" : "→"}
                    </div>
                  </div>
                </button>
                  <ApplyTemplatePanel
                    coachId={userId}
                    athleteId={athlete.id}
                    actingUserId={userId}
                    onApplied={(blockId) => {
                      window.location.href = `/programs/${blockId}`;
                    }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
