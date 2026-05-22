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

    if (profile) {
      setRole(profile.role || "");
    }

    if (profile?.role === "coach") {
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

    await openAthleteProgram(user.id, profile?.role || "");
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
        return;
      }

      week = createdWeek;
    }

    if (!block || !week) {
      alert("Geen block of week gevonden");
      setOpeningAthleteId("");
      return;
    }

    window.location.href =
      activeRole === "coach"
        ? `/programs/${block.id}/weeks/${week.id}?athlete=${athleteId}`
        : `/programs/${block.id}/weeks/${week.id}`;
  }

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <p className="text-sm text-gray-500 mb-1">Programma’s</p>

          <h1 className="text-3xl font-bold">Kies een atleet</h1>

          <p className="text-gray-500 mt-2">
            Klik op een atleet om direct naar zijn of haar blocks en weken te
            gaan.
          </p>
        </div>

        {loading && (
          <div className="bg-white rounded-2xl shadow p-8">
            <p className="text-gray-500">Laden...</p>
          </div>
        )}

        {!loading && role === "coach" && athletes.length === 0 && (
          <div className="bg-white rounded-2xl shadow p-8">
            <h2 className="text-xl font-bold mb-2">Geen atleten gevonden</h2>

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
                  className={`w-full text-left bg-white rounded-2xl shadow p-5 border-2 transition-all duration-150 ${
                    isOpening
                      ? "border-black scale-[0.99] opacity-80"
                      : "border-transparent hover:border-black hover:-translate-y-0.5 hover:shadow-lg"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center text-xl font-bold">
                        {(athlete.full_name || "A").charAt(0).toUpperCase()}
                      </div>

                      <div>
                        <h2 className="text-lg font-bold">
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
