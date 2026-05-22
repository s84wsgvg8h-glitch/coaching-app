"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

type DashboardLink = {
  href?: string;
  icon: string;
  title: string;
  description?: string;
  badge?: number;
};

export default function AthletesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    loadProfiles();
    loadUser();
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
      setFullName(data.full_name || "");
      setRole(data.role || "");
    }
  }

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setProfiles(data || []);

    const pending = data?.filter(
      (profile) => profile.role === "pending"
    );

    setPendingCount(pending?.length || 0);
  }

  async function acceptAsAthlete(profileId: string) {
    const { error } = await supabase
      .from("profiles")
      .update({ role: "atleet" })
      .eq("id", profileId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProfiles();
  }

  async function deleteProfile(profileId: string) {
    const confirmed = confirm(
      "Weet je zeker dat je deze aanvraag wilt verwijderen?"
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", profileId);

    if (error) {
      alert(error.message);
      return;
    }

    await loadProfiles();
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

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        <aside className="group relative w-20 hover:w-64 min-w-[80px] max-w-[80px] hover:max-w-[256px] bg-white shadow-xl p-3 flex flex-col transition-all duration-300 overflow-hidden">
  <div className="flex items-center justify-center group-hover:justify-between mb-5 transition-all">
    <a
      href="/profile"
      className="flex items-center gap-3 bg-gray-100 hover:bg-gray-200 transition rounded-xl px-2 py-2 w-full"
    >
      <div className="w-9 h-9 min-w-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">
        👤
      </div>

      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
        <p className="font-semibold text-sm">
          {fullName}
        </p>

        <p className="text-xs text-gray-400 capitalize">
          Ingelogd als {role}
        </p>

        <p className="text-xs text-gray-500 mt-1">
          Profiel aanpassen
        </p>
      </div>
    </a>
  </div>

  <nav className="flex flex-col gap-2 flex-1">
    {coachLinks.map((item) => (
      <a
        key={item.title}
        href={item.href}
        className={`relative p-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
          item.href === "/athletes"
            ? "bg-black text-white"
            : "bg-gray-100 hover:bg-gray-200"
        }`}
      >
        <div className="relative">
          <div
            className={`w-9 h-9 min-w-9 rounded-lg shadow flex items-center justify-center text-lg ${
              item.href === "/athletes"
                ? "bg-white text-black"
                : "bg-white"
            }`}
          >
            {item.icon}
          </div>

          {item.badge !== undefined &&
            item.badge > 0 && (
              <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow">
                {item.badge}
              </div>
            )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
          <h3 className="font-semibold text-sm">
            {item.title}
          </h3>

          <p
            className={`text-xs ${
              item.href === "/athletes"
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

    <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden text-sm">
      Uitloggen
    </span>
  </button>
</aside>

        <section className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold">
                Atleten beheren
              </h1>

              <p className="text-gray-500">
                Accepteer of verwijder nieuwe aanmeldingen
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow overflow-hidden">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="p-5 border-b flex items-center justify-between gap-4"
                >
                  <div>
                    <h2 className="font-semibold text-lg">
                      {profile.full_name || "Geen naam"}
                    </h2>

                    <p className="text-gray-500 text-sm">
                      Status: {profile.role}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {profile.role === "pending" && (
                      <button
                        onClick={() =>
                          acceptAsAthlete(profile.id)
                        }
                        className="bg-black text-white px-4 py-2 rounded-xl"
                      >
                        Accepteren
                      </button>
                    )}

                    <button
                      onClick={() =>
                        deleteProfile(profile.id)
                      }
                      className="bg-red-500 text-white px-4 py-2 rounded-xl"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}