"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

type DashboardLink = {
  href: string;
  icon: string;
  title: string;
  description?: string;
  badge?: number;
};

export default function ProgramsPage() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [fullName, setFullName] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

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
      setFullName(profile.full_name || "");
    }

    const { data: pendingProfiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "pending");

    setPendingCount(pendingProfiles?.length || 0);

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

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const coachLinks: DashboardLink[] = [
    {
      href: "/dashboard",
      icon: "🏠",
      title: "Dashboard",
      description: "Ga terug naar het dashboard.",
    },
    {
      href: "/athletes",
      icon: "👥",
      title: "Atleten beheren",
      description: "Bekijk en accepteer atleten.",
      badge: pendingCount,
    },
    {
      href: "/athlete-profiles",
      icon: "📋",
      title: "Atleten profielen",
      description: "Bekijk alle geaccepteerde atleten.",
    },
    {
      href: "/programs",
      icon: "🏋️",
      title: "Programma’s",
      description: "Maak trainingsschema’s aan.",
    },
    {
      href: "/chat",
      icon: "💬",
      title: "Chat",
      description: "Stuur berichten naar atleten.",
    },
    {
      href: "/wedstrijd-kalender",
      icon: "📅",
      title: "Wedstrijd kalender",
      description: "Bekijk en beheer wedstrijden.",
    },
    {
      href: "/limitless-data",
      icon: "📊",
      title: "Limitless Data",
      description: "Voeg atleten toe en beheer lidgegevens.",
    },
  ];

  const athleteLinks: DashboardLink[] = [
    {
      href: "/dashboard",
      icon: "🏠",
      title: "Dashboard",
      description: "Ga terug naar het dashboard.",
    },
    {
      href: "/programs",
      icon: "🏋️",
      title: "Programma’s",
      description: "Bekijk je trainingsprogramma’s.",
    },
    {
      href: "/chat",
      icon: "💬",
      title: "Chat met coach",
      description: "Stel vragen aan je coach.",
    },
    {
      href: "/wedstrijd-kalender",
      icon: "📅",
      title: "Wedstrijd kalender",
      description: "Bekijk je aankomende wedstrijden.",
    },
  ];

  const links = role === "coach" ? coachLinks : athleteLinks;

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        <aside className="group sticky top-0 h-screen self-start relative w-20 hover:w-64 min-w-[80px] max-w-[80px] hover:max-w-[256px] bg-white shadow-xl p-3 flex flex-col transition-all duration-150 overflow-hidden z-30">
          <div className="flex items-center justify-center group-hover:justify-between mb-5 transition-all duration-150">
            <a
              href="/profile"
              className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 transition rounded-xl px-2 py-2 w-full"
            >
              <div className="w-9 h-9 min-w-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">
                👤
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden">
                <p className="font-semibold text-sm">{fullName}</p>

                <p className="text-xs text-gray-400 capitalize">
                  Ingelogd als {role}
                </p>

                <p className="text-xs text-gray-500 mt-1">Profiel aanpassen</p>
              </div>
            </a>
          </div>

          <nav className="flex flex-col gap-2 flex-1 overflow-y-auto">
            {links.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className={`relative p-3 rounded-xl transition-all duration-150 flex items-center gap-3 ${
                  item.href === "/programs"
                    ? "bg-black text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <div className="relative">
                  <div
                    className={`w-9 h-9 min-w-9 rounded-lg shadow flex items-center justify-center text-lg ${
                      item.href === "/programs"
                        ? "bg-white text-black"
                        : "bg-white"
                    }`}
                  >
                    {item.icon}
                  </div>

                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow">
                      {item.badge}
                    </div>
                  )}
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden">
                  <h3 className="font-semibold text-sm">{item.title}</h3>

                  <p
                    className={`text-xs ${
                      item.href === "/programs"
                        ? "text-gray-300"
                        : "text-gray-500"
                    }`}
                  >
                    {item.description}
                  </p>
                </div>
              </a>
            ))}
          </nav>

          <button
            onClick={logout}
            className="bg-black text-white px-3 py-2 rounded-xl mt-5 flex items-center gap-3 hover:opacity-90 transition"
          >
            <span className="w-9 min-w-9 text-lg">🚪</span>

            <span className="opacity-0 group-hover:opacity-100 transition-all duration-150 whitespace-nowrap overflow-hidden text-sm">
              Uitloggen
            </span>
          </button>
        </aside>

        <section className="flex-1 p-8">
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
        </section>
      </div>
    </main>
  );
}