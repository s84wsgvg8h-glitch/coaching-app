"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type LimitlessAthlete = {
  id: string;
  full_name: string;
  birth_date: string;
  member_number: string;
  competition_member_status: string;
  student_status: string;
  membership_type: string;
};

type DashboardLink = {
  href?: string;
  icon: string;
  title: string;
  description?: string;
  badge?: number;
};

export default function LimitlessDataPage() {
  const [athletes, setAthletes] = useState<LimitlessAthlete[]>([]);

  const [userFullName, setUserFullName] = useState("");
  const [role, setRole] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [competitionMemberStatus, setCompetitionMemberStatus] =
    useState("groen");
  const [studentStatus, setStudentStatus] = useState("groen");
  const [membershipType, setMembershipType] = useState("wedstrijd lid");

  useEffect(() => {
    loadUser();
    loadAthletes();
  }, []);

  async function loadUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setUserFullName(data.full_name || "");
      setRole(data.role || "");
    }

    const { data: pendingProfiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "pending");

    setPendingCount(pendingProfiles?.length || 0);
  }

  async function loadAthletes() {
    const { data, error } = await supabase
      .from("limitless_athletes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setAthletes(data || []);
  }

  async function addAthlete() {
    if (!fullName.trim() || !birthDate || !memberNumber.trim()) {
      alert("Vul alle verplichte velden in");
      return;
    }

    const { error } = await supabase.from("limitless_athletes").insert({
      full_name: fullName.trim(),
      birth_date: birthDate,
      member_number: memberNumber.trim(),
      competition_member_status: competitionMemberStatus,
      student_status: studentStatus,
      membership_type: membershipType,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setFullName("");
    setBirthDate("");
    setMemberNumber("");
    setCompetitionMemberStatus("groen");
    setStudentStatus("groen");
    setMembershipType("wedstrijd lid");

    await loadAthletes();
  }

  async function deleteAthlete(id: string) {
    const zeker = confirm("Weet je zeker dat je deze atleet wilt verwijderen?");

    if (!zeker) return;

    const { error } = await supabase
      .from("limitless_athletes")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    setAthletes(athletes.filter((athlete) => athlete.id !== id));
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("nl-NL", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  function StatusBadge({ value }: { value: string }) {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${
          value === "groen"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {value}
      </span>
    );
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
      href: "/training",
      icon: "🔥",
      title: "Mijn training",
      description: "Bekijk je training van vandaag.",
    },
    {
      href: "/progress",
      icon: "📈",
      title: "Voortgang",
      description: "Bekijk je resultaten.",
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
        <aside className="group w-20 hover:w-64 bg-white shadow-xl p-3 flex flex-col transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-center group-hover:justify-between mb-5 transition-all">
            <button
              onClick={() => (window.location.href = "/profile")}
              className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 transition rounded-xl px-2 py-2 w-full"
            >
              <div className="min-w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">
                👤
              </div>

              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
                <p className="font-semibold text-sm">{userFullName}</p>

                <p className="text-xs text-gray-400 capitalize">
                  Ingelogd als {role}
                </p>

                <p className="text-xs text-gray-500 mt-1">
                  Profiel aanpassen
                </p>
              </div>
            </button>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            {links.map((item) => (
              <a
                key={item.title}
                href={item.href}
                className={`relative p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                  item.href === "/limitless-data"
                    ? "bg-black text-white"
                    : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                <div className="relative">
                  <div
                    className={`min-w-9 h-9 rounded-lg shadow flex items-center justify-center text-lg ${
                      item.href === "/limitless-data"
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

                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
                  <h3 className="font-semibold text-sm">{item.title}</h3>

                  <p
                    className={`text-xs ${
                      item.href === "/limitless-data"
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
            <span className="min-w-9 text-lg">🚪</span>

            <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden text-sm">
              Uitloggen
            </span>
          </button>
        </aside>

        <section className="flex-1 p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold">Limitless Data</h1>

                <p className="text-gray-500">
                  Voeg atleten toe en beheer lidgegevens.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Atleet toevoegen</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Volledige naam"
                  className="border rounded-xl px-4 py-3"
                />

                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="border rounded-xl px-4 py-3"
                />

                <input
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  placeholder="Lidnummer"
                  className="border rounded-xl px-4 py-3"
                />

                <select
                  value={competitionMemberStatus}
                  onChange={(e) =>
                    setCompetitionMemberStatus(e.target.value)
                  }
                  className="border rounded-xl px-4 py-3"
                >
                  <option value="groen">Wedstrijdlid: Groen</option>
                  <option value="rood">Wedstrijdlid: Rood</option>
                </select>

                <select
                  value={studentStatus}
                  onChange={(e) => setStudentStatus(e.target.value)}
                  className="border rounded-xl px-4 py-3"
                >
                  <option value="groen">Studentenstatus: Groen</option>
                  <option value="rood">Studentenstatus: Rood</option>
                </select>

                <select
                  value={membershipType}
                  onChange={(e) => setMembershipType(e.target.value)}
                  className="border rounded-xl px-4 py-3"
                >
                  <option value="wedstrijd lid">Wedstrijd lid</option>
                  <option value="beginnerslid">Beginnerslid</option>
                </select>
              </div>

              <button
                onClick={addAthlete}
                className="mt-4 bg-black text-white px-5 py-3 rounded-xl font-semibold hover:bg-gray-800"
              >
                Atleet toevoegen
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow p-6 overflow-x-auto">
              <h2 className="text-xl font-bold mb-4">Atleten</h2>

              {athletes.length === 0 ? (
                <p className="text-gray-500">
                  Er zijn nog geen atleten toegevoegd.
                </p>
              ) : (
                <table className="w-full min-w-[1000px] border-collapse">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="py-3 px-4">Naam</th>
                      <th className="py-3 px-4">Geboortedatum</th>
                      <th className="py-3 px-4">Lidnummer</th>
                      <th className="py-3 px-4">Wedstrijdlid</th>
                      <th className="py-3 px-4">Studentenstatus</th>
                      <th className="py-3 px-4">Type lid</th>
                      <th className="py-3 px-4">Actie</th>
                    </tr>
                  </thead>

                  <tbody>
                    {athletes.map((athlete) => (
                      <tr
                        key={athlete.id}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="py-4 px-4 font-semibold">
                          {athlete.full_name}
                        </td>

                        <td className="py-4 px-4 text-gray-600">
                          {formatDate(athlete.birth_date)}
                        </td>

                        <td className="py-4 px-4 text-gray-600">
                          {athlete.member_number}
                        </td>

                        <td className="py-4 px-4">
                          <StatusBadge
                            value={athlete.competition_member_status}
                          />
                        </td>

                        <td className="py-4 px-4">
                          <StatusBadge value={athlete.student_status} />
                        </td>

                        <td className="py-4 px-4">
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                            {athlete.membership_type}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <button
                            onClick={() => deleteAthlete(athlete.id)}
                            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl"
                          >
                            Verwijderen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}