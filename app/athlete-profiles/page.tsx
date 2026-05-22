"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import ChatAvatar from "@/components/chat/ChatAvatar";

type AthleteProfile = {
  id: string;
  full_name: string | null;
  lidnummer: string | null;
  geboortedatum: string | null;
  avatar_url: string | null;
};

export default function AthleteProfilesPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (viewerProfile?.role !== "coach") {
        window.location.href = "/profile";
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, lidnummer, geboortedatum, avatar_url")
        .eq("role", "atleet")
        .order("full_name", { ascending: true });

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      setAthletes((data || []) as AthleteProfile[]);
      setLoading(false);
    }

    void init();
  }, []);

  const filteredAthletes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return athletes;

    return athletes.filter((athlete) => {
      const name = athlete.full_name?.toLowerCase() || "";
      const lidnummer = athlete.lidnummer?.toLowerCase() || "";
      return name.includes(query) || lidnummer.includes(query);
    });
  }, [athletes, search]);

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Atleten profielen</h1>
            <p className="mt-1 text-gray-500">
              Kies een atleet om gegevens, wedstrijden en blessures aan te passen.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg bg-black px-4 py-2 text-white"
          >
            Terug naar dashboard
          </Link>
        </div>

        <div className="mb-6">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Zoek op naam of lidnummer..."
            className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />
        </div>

        <div className="overflow-hidden rounded-2xl bg-white shadow">
          {loading ? (
            <p className="p-6 text-gray-500">Atleten laden...</p>
          ) : filteredAthletes.length === 0 ? (
            <p className="p-6 text-gray-500">
              {athletes.length === 0
                ? "Er zijn nog geen atleten."
                : "Geen atleten gevonden voor deze zoekopdracht."}
            </p>
          ) : (
            filteredAthletes.map((athlete) => (
              <Link
                key={athlete.id}
                href={`/profile/${athlete.id}`}
                className="flex items-center justify-between gap-4 border-b p-5 transition hover:bg-gray-50 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <ChatAvatar
                    name={athlete.full_name || "Atleet"}
                    imageUrl={athlete.avatar_url}
                    className="h-12 w-12 shrink-0 text-base"
                  />

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">
                      {athlete.full_name || "Naamloos"}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {athlete.lidnummer
                        ? `Lidnummer ${athlete.lidnummer}`
                        : "Geen lidnummer"}
                      {athlete.geboortedatum
                        ? ` · Geb. ${new Date(`${athlete.geboortedatum}T12:00:00`).toLocaleDateString("nl-NL")}`
                        : ""}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white">
                  Profiel openen
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
