"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import BodyAreaDiagram from "@/components/BodyAreaDiagram";
import { getChatReturnRoute } from "@/lib/chatNavigation";

type Profile = {
  id: string;
  full_name: string | null;
  role: string | null;
  lidnummer: string | null;
  geboortedatum: string | null;
};

export default function UserProfilePage() {
  const params = useParams();
  const profileId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [viewerRole, setViewerRole] = useState("");
  const [chatBackHref, setChatBackHref] = useState("/chat");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);

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

      setViewerRole(viewerProfile?.role || "");

      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, role, lidnummer, geboortedatum")
        .eq("id", profileId)
        .single();

      if (error || !data) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setProfile(data);
      setLoading(false);
    }

    loadProfile();
    setChatBackHref(getChatReturnRoute());
  }, [profileId]);

  const roleLabel =
    profile?.role === "coach"
      ? "Coach"
      : profile?.role === "atleet"
        ? "Atleet"
        : profile?.role || "Gebruiker";

  return (
    <AppShell contentClassName="flex-1 p-4 pb-16 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href={chatBackHref}
          className="inline-flex items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black shadow"
        >
          ← Terug naar chat
        </Link>

        {loading && (
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <p className="text-gray-500">Profiel laden...</p>
          </div>
        )}

        {!loading && !profile && (
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <p className="text-gray-500">Profiel niet gevonden.</p>
          </div>
        )}

        {!loading && profile && (
          <div className="rounded-3xl bg-white p-8 shadow-xl">
            <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-gray-400">
              Profiel
            </p>
            <h1 className="text-3xl font-bold text-black">
              {profile.full_name || "Onbekende gebruiker"}
            </h1>
            <p className="mt-2 text-gray-500">{roleLabel}</p>

            <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              {profile.geboortedatum && (
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Geboortedatum
                  </p>
                  <p className="mt-1 font-semibold text-black">
                    {new Date(profile.geboortedatum).toLocaleDateString("nl-NL")}
                  </p>
                </div>
              )}

              {viewerRole === "coach" && profile.lidnummer && (
                <div className="rounded-2xl bg-gray-50 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Lidnummer
                  </p>
                  <p className="mt-1 font-semibold text-black">{profile.lidnummer}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {!loading && profile && <BodyAreaDiagram />}
      </div>
    </AppShell>
  );
}
