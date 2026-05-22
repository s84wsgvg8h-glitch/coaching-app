"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";

type Profile = {
  id: string;
  full_name: string;
  role: string;
};

export default function AthletesPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      await loadProfiles();
    }

    init();
  }, []);

  async function loadProfiles() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    setProfiles(data || []);
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

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Atleten beheren</h1>

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
                    onClick={() => acceptAsAthlete(profile.id)}
                    className="bg-black text-white px-4 py-2 rounded-xl"
                  >
                    Accepteren
                  </button>
                )}

                <button
                  onClick={() => deleteProfile(profile.id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-xl"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
