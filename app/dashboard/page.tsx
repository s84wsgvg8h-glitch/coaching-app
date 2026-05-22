"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DashboardLink = {
  href?: string;
  icon: string;
  title: string;
  description?: string;
  badge?: number;
  action?: () => void;
};

export default function DashboardPage() {
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const [profileOpen, setProfileOpen] = useState(false);
  const [editedFullName, setEditedFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setEditedFullName(data.full_name || "");
        setRole(data.role || "");
      }

      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "pending");

      setPendingCount(pendingProfiles?.length || 0);
    }

    getProfile();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function saveProfile() {
    if (!editedFullName.trim()) return;

    setSavingProfile(true);

    await supabase
      .from("profiles")
      .update({
        full_name: editedFullName.trim(),
      })
      .eq("id", userId);

    setFullName(editedFullName.trim());

    setSavingProfile(false);
    setProfileOpen(false);
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
      href: "/rpe-table",
      icon: "👥",
      title: "Rpe tabel",
      description: "RPE TABEL",
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
    },{
      href: "/video-gallery",
      icon: "🏋️",
      title: "Video gallery",
      description: "Bekijk alle video's",
    },
    {
  href: "/statistics",
  icon: "📈",
  title: "Statistics",
  description: "Bekijk statistieken en grafieken.",
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
    },{
  href: "/leaderboard",
  icon: "🏆",
  title: "Leaderboard",
  description: "Bekijk rankings en prestaties.",
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
            </button>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            {links.map((item) => {
              const content = (
                <>
                  <div className="relative">
                    <div className="min-w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">
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

                    <p className="text-xs text-gray-500">
                      {item.description}
                    </p>
                  </div>
                </>
              );

              if (item.href) {
                return (
                  <a
                    key={item.title}
                    href={item.href}
                    className="relative bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-all duration-200 flex items-center gap-3"
                  >
                    {content}
                  </a>
                );
              }

              return (
                <button
                  key={item.title}
                  onClick={item.action}
                  className="relative bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-all duration-200 flex items-center gap-3 text-left"
                >
                  {content}
                </button>
              );
            })}
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

        <section className="flex-1 p-6">
          <div className="bg-white rounded-3xl shadow-xl p-10 min-h-[400px]">
            <h2 className="text-4xl font-bold mb-3">
              {fullName}
            </h2>

            <p className="text-gray-500 text-lg">
              Hover met je muis over de linkerkolom om het menu uit te
              klappen.
            </p>
          </div>
        </section>
      </div>

      {profileOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">
              Profiel aanpassen
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">
                Volledige naam
              </label>

              <input
                type="text"
                value={editedFullName}
                onChange={(e) =>
                  setEditedFullName(e.target.value)
                }
                className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setProfileOpen(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 py-3 rounded-2xl transition"
              >
                Annuleren
              </button>

              <button
                onClick={saveProfile}
                disabled={savingProfile}
                className="flex-1 bg-black text-white py-3 rounded-2xl hover:opacity-90 transition"
              >
                {savingProfile ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}