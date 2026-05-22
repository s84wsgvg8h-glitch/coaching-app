"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
};

type ProgramBlock = {
  id: string;
  title: string;
  athlete_id: string | null;
  start_date: string | null;
};

type ProgramWeek = {
  id: string;
  title: string;
  week_number: number;
  program_block_id: string;
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

    if (loadedRole === "coach") {
      const { data: acceptedAthletes, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

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

    const { data: blocks, error: blocksError } = await supabase
      .from("program_blocks")
      .select("*")
      .eq("athlete_id", athleteId)
      .order("start_date", { ascending: true });

    if (blocksError) {
      alert(blocksError.message);
      setOpeningAthleteId("");
      setRedirectingAthlete(false);
      return;
    }

    let block: ProgramBlock | null = blocks?.[0] || null;

    if (!block) {
      const { data: createdBlock, error: createBlockError } = await supabase
        .from("program_blocks")
        .insert({
          title: "Block 1",
          description: "",
          start_date: new Date().toISOString().split("T")[0],
          athlete_id: athleteId,
          created_by: userId || athleteId,
        })
        .select("*")
        .single();

      if (createBlockError || !createdBlock) {
        alert(createBlockError?.message || "Block kon niet worden aangemaakt");
        setOpeningAthleteId("");
        setRedirectingAthlete(false);
        return;
      }

      block = createdBlock;
    }

    const { data: weeks, error: weeksError } = await supabase
      .from("program_weeks")
      .select("*")
      .eq("program_block_id", block!.id)
      .order("week_number", { ascending: true });

    if (weeksError) {
      alert(weeksError.message);
      setOpeningAthleteId("");
      setRedirectingAthlete(false);
      return;
    }

    let week: ProgramWeek | null = weeks?.[0] || null;

    if (!week) {
      const { data: createdWeek, error: createWeekError } = await supabase
        .from("program_weeks")
        .insert({
          title: "Week 1",
          week_number: 1,
          program_block_id: block!.id,
        })
        .select("*")
        .single();

      if (createWeekError || !createdWeek) {
        alert(createWeekError?.message || "Week kon niet worden aangemaakt");
        setOpeningAthleteId("");
        setRedirectingAthlete(false);
        return;
      }

      week = createdWeek;
    }

    if (!block || !week) {
      alert("Geen block of week gevonden");
      setOpeningAthleteId("");
      setRedirectingAthlete(false);
      return;
    }

    window.location.href =
      activeRole === "coach"
        ? `/programs/${block.id}/weeks/${week.id}?athlete=${athleteId}`
        : `/programs/${block.id}/weeks/${week.id}`;
  }

  if (redirectingAthlete || (loading && role !== "coach")) {
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
        </div>

        {loading && (
          <div className="rounded-2xl bg-white p-8 shadow">
            <p className="text-gray-500">Laden...</p>
          </div>
        )}

        {!loading && role === "coach" && athletes.length === 0 && (
          <div className="rounded-2xl bg-white p-8 shadow">
            <h2 className="mb-2 text-xl font-bold text-black">Geen atleten gevonden</h2>

            <p className="text-gray-500">
              Er zijn nog geen atleten met de rol “atleet”.
            </p>
          </div>
        )}

        {!loading && role === "coach" && athletes.length > 0 && (
          <div className="flex flex-col gap-4">
            {athletes.map((athlete) => {
              const isOpening = openingAthleteId === athlete.id;

              return (
                <button
                  key={athlete.id}
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
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
