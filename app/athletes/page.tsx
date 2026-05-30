"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AppShell from "@/components/AppShell";
import ChatAvatar from "@/components/chat/ChatAvatar";
import EmptyState from "@/components/ui/EmptyState";
import { SkeletonList } from "@/components/ui/Skeleton";
import {
  buildCoachInviteUrl,
  createCoachInviteLink,
  deactivateCoachInviteLink,
  formatInviteExpiry,
  loadCoachInviteLinks,
  type CoachInviteLink,
} from "@/lib/coachInviteLinks";
import {
  formatPaymentPrice,
  loadTotalAthleteIncome,
} from "@/lib/athletePayments";
import { isAdminRole, isCoachLikeRole } from "@/lib/authRoles";

type Profile = {
  id: string;
  full_name: string;
  role: string;
  coach_id?: string | null;
};

type AthleteProfile = {
  id: string;
  full_name: string | null;
  lidnummer: string | null;
  geboortedatum: string | null;
  avatar_url: string | null;
};

type AthletesTab = "beheren" | "profielen";

function AthletesPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: AthletesTab =
    tabParam === "profielen" ? "profielen" : "beheren";

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [profileAthletes, setProfileAthletes] = useState<AthleteProfile[]>([]);
  const [profileSearch, setProfileSearch] = useState("");
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [inviteLinks, setInviteLinks] = useState<CoachInviteLink[]>([]);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState("");
  const [totalIncome, setTotalIncome] = useState<number | null>(null);
  const [payingAthleteCount, setPayingAthleteCount] = useState(0);

  useEffect(() => {
    document.title = "Atleten";

    async function init() {
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
        .select("role")
        .eq("id", user.id)
        .single();

      const viewerRole = profile?.role || "";
      setRole(viewerRole);

      if (viewerRole !== "coach" && viewerRole !== "admin") {
        window.location.href = "/dashboard";
        return;
      }

      await Promise.all([
        loadProfiles(viewerRole, user.id),
        loadProfileAthletes(viewerRole, user.id),
      ]);

      if (isCoachLikeRole(viewerRole) && !isAdminRole(viewerRole)) {
        const incomeResult = await loadTotalAthleteIncome();
        setTotalIncome(incomeResult.total);
        setPayingAthleteCount(incomeResult.payingAthleteCount);
      }
    }

    void init();
  }, []);

  async function loadProfiles(viewerRole: string, viewerId: string) {
    let query = supabase.from("profiles").select("*").order("created_at", {
      ascending: false,
    });

    if (viewerRole === "coach") {
      query = query.or(`coach_id.eq.${viewerId},role.eq.pending`);
      setInviteLinks(await loadCoachInviteLinks(viewerId));
    }

    const { data } = await query;
    setProfiles(data || []);
  }

  async function loadProfileAthletes(viewerRole: string, viewerId: string) {
    setProfilesLoading(true);

    let query = supabase
      .from("profiles")
      .select("id, full_name, lidnummer, geboortedatum, avatar_url")
      .eq("role", "atleet")
      .order("full_name", { ascending: true });

    if (isCoachLikeRole(viewerRole) && !isAdminRole(viewerRole)) {
      query = query.eq("coach_id", viewerId);
    }

    const { data, error } = await query;

    if (error) {
      alert(error.message);
      setProfilesLoading(false);
      return;
    }

    setProfileAthletes((data || []) as AthleteProfile[]);
    setProfilesLoading(false);
  }

  const myAthletes = useMemo(
    () => profiles.filter((profile) => profile.coach_id === userId),
    [profiles, userId],
  );

  const pendingProfiles = useMemo(
    () =>
      profiles.filter(
        (profile) =>
          profile.role === "pending" &&
          (profile as Profile & { pending_kind?: string }).pending_kind !==
            "coach",
      ),
    [profiles],
  );

  const filteredProfileAthletes = useMemo(() => {
    const query = profileSearch.trim().toLowerCase();
    if (!query) return profileAthletes;

    return profileAthletes.filter((athlete) => {
      const name = athlete.full_name?.toLowerCase() || "";
      const lidnummer = athlete.lidnummer?.toLowerCase() || "";
      return name.includes(query) || lidnummer.includes(query);
    });
  }, [profileAthletes, profileSearch]);

  function switchTab(tab: AthletesTab) {
    router.replace(`/athletes?tab=${tab}`, { scroll: false });
  }

  async function acceptAsAthlete(profileId: string) {
    const updatePayload: { role: string; coach_id?: string } = {
      role: "atleet",
    };

    if (isCoachLikeRole(role) && !isAdminRole(role)) {
      updatePayload.coach_id = userId;
    }

    const { error } = await supabase
      .from("profiles")
      .update(updatePayload)
      .eq("id", profileId);

    if (error) {
      alert(error.message);
      return;
    }

    await Promise.all([
      loadProfiles(role, userId),
      loadProfileAthletes(role, userId),
    ]);
  }

  async function deleteProfile(profileId: string) {
    const confirmed = confirm(
      "Weet je zeker dat je deze aanvraag wilt verwijderen?",
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

    await loadProfiles(role, userId);
  }

  async function handleCreateInviteLink() {
    if (!userId) return;

    setCreatingLink(true);

    const { data, error } = await createCoachInviteLink(userId);

    setCreatingLink(false);

    if (error || !data) {
      alert(error?.message || "Link kon niet worden aangemaakt.");
      return;
    }

    setInviteLinks((current) => [data, ...current]);
  }

  async function copyInviteLink(token: string) {
    const url = buildCoachInviteUrl(token);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(""), 2000);
    } catch {
      prompt("Kopieer deze link:", url);
    }
  }

  async function removeInviteLink(linkId: string) {
    const { error } = await deactivateCoachInviteLink(linkId);

    if (error) {
      alert(error.message);
      return;
    }

    setInviteLinks((current) => current.filter((link) => link.id !== linkId));
  }

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Atleten</h1>
          <p className="text-gray-500">
            Beheer uitnodigingen, accepteer aanmeldingen en open atleetprofielen.
          </p>
        </div>

        <div className="mb-6 inline-flex rounded-xl bg-white p-1 shadow">
          <button
            type="button"
            onClick={() => switchTab("beheren")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              activeTab === "beheren"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Beheren
          </button>
          <button
            type="button"
            onClick={() => switchTab("profielen")}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
              activeTab === "profielen"
                ? "bg-black text-white"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            Profielen
          </button>
        </div>

        {activeTab === "beheren" ? (
          <>
            {isCoachLikeRole(role) && totalIncome !== null && (
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white px-5 py-4 shadow">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Totale inkomsten
                  </p>
                  <p className="mt-2 text-3xl font-bold text-black">
                    {formatPaymentPrice(totalIncome)}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Som van alle atleetprijzen per maand
                  </p>
                </div>

                <div className="rounded-2xl bg-white px-5 py-4 shadow">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                    Atleten
                  </p>
                  <p className="mt-2 text-3xl font-bold text-black">
                    {myAthletes.length}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {payingAthleteCount} met ingevulde prijs
                  </p>
                </div>
              </div>
            )}

            <section className="mb-6 rounded-2xl bg-white p-5 shadow">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-black">
                    Atleten uitnodigen
                  </h2>
                  <p className="text-sm text-gray-500">
                    Atleten die via deze link registreren worden automatisch aan
                    jou gekoppeld.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCreateInviteLink()}
                  disabled={creatingLink}
                  className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {creatingLink ? "Link maken..." : "Nieuwe uitnodigingslink"}
                </button>
              </div>

              {inviteLinks.length === 0 ? (
                <p className="text-sm text-gray-500">
                  Nog geen actieve uitnodigingslinks.
                </p>
              ) : (
                <div className="space-y-3">
                  {inviteLinks.map((link) => {
                    const url = buildCoachInviteUrl(link.token);

                    return (
                      <div
                        key={link.id}
                        className="rounded-xl border border-gray-200 p-3"
                      >
                        <p className="break-all text-sm font-medium text-black">
                          {url}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Verloopt: {formatInviteExpiry(link)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => void copyInviteLink(link.token)}
                            className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                          >
                            {copiedToken === link.token
                              ? "Gekopieerd"
                              : "Kopieer link"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void removeInviteLink(link.id)}
                            className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Deactiveer
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {myAthletes.length > 0 && (
              <section className="mb-6 overflow-hidden rounded-2xl bg-white shadow">
                <div className="border-b px-5 py-4">
                  <h2 className="text-lg font-bold">Mijn atleten</h2>
                </div>
                {myAthletes.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
                  >
                    <div>
                      <h3 className="text-sm font-semibold">
                        {profile.full_name || "Geen naam"}
                      </h3>
                      <p className="text-xs text-gray-500">Atleet</p>
                    </div>
                    <Link
                      href={`/profile/${profile.id}`}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                    >
                      Profiel
                    </Link>
                  </div>
                ))}
              </section>
            )}

            {pendingProfiles.length > 0 && (
              <section className="overflow-hidden rounded-2xl bg-white shadow">
                <div className="border-b px-5 py-4">
                  <h2 className="text-lg font-bold">Openstaande aanmeldingen</h2>
                </div>
                {pendingProfiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between gap-3 border-b px-4 py-2.5 last:border-b-0"
                  >
                    <div>
                      <h3 className="text-sm font-semibold">
                        {profile.full_name || "Geen naam"}
                      </h3>
                      <p className="text-xs text-gray-500">Status: pending</p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => void acceptAsAthlete(profile.id)}
                        className="rounded-xl bg-black px-4 py-2 text-white"
                      >
                        Accepteren
                      </button>
                      <button
                        onClick={() => void deleteProfile(profile.id)}
                        className="rounded-xl bg-red-500 px-4 py-2 text-white"
                      >
                        Verwijderen
                      </button>
                    </div>
                  </div>
                ))}
              </section>
            )}

            {myAthletes.length === 0 && pendingProfiles.length === 0 && (
              <EmptyState
                icon="athletes"
                title="Nog geen atleten"
                description="Deel een uitnodigingslink om je eerste atleet te koppelen."
              />
            )}
          </>
        ) : (
          <>
            <div className="mb-6">
              <input
                type="search"
                value={profileSearch}
                onChange={(event) => setProfileSearch(event.target.value)}
                placeholder="Zoek op naam of lidnummer..."
                className="w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div className="table-compact-wrap overflow-hidden rounded-2xl bg-white shadow">
              {profilesLoading ? (
                <div className="p-4">
                  <SkeletonList rows={5} />
                </div>
              ) : filteredProfileAthletes.length === 0 ? (
                <EmptyState
                  icon="athletes"
                  title={
                    profileAthletes.length === 0
                      ? "Er zijn nog geen atleten"
                      : "Geen resultaten"
                  }
                  description={
                    profileAthletes.length === 0
                      ? "Atleten verschijnen hier zodra ze gekoppeld zijn."
                      : "Pas je zoekopdracht aan."
                  }
                />
              ) : (
                <table className="table-compact">
                  <thead>
                    <tr className="text-left text-xs uppercase text-gray-500">
                      <th>Atleet</th>
                      <th className="col-hide-sm">Lidnummer</th>
                      <th className="col-hide-sm">Geboortedatum</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProfileAthletes.map((athlete) => (
                      <tr key={athlete.id} className="hover:bg-gray-50">
                        <td>
                          <div className="flex items-center gap-3">
                            <ChatAvatar
                              name={athlete.full_name || "Atleet"}
                              imageUrl={athlete.avatar_url}
                              className="h-10 w-10 shrink-0 text-sm"
                            />
                            <span className="font-semibold">
                              {athlete.full_name || "Naamloos"}
                            </span>
                          </div>
                        </td>
                        <td className="col-hide-sm text-gray-500">
                          {athlete.lidnummer || "—"}
                        </td>
                        <td className="col-hide-sm text-gray-500">
                          {athlete.geboortedatum
                            ? new Date(`${athlete.geboortedatum}T12:00:00`).toLocaleDateString("nl-NL")
                            : "—"}
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/profile/${athlete.id}`}
                            className="app-btn-primary inline-flex text-xs"
                          >
                            Profiel
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

export default function AthletesPage() {
  return (
    <Suspense
      fallback={
        <AppShell contentClassName="flex-1 p-8">
          <div className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow">
            <p className="text-gray-500">Atleten laden...</p>
          </div>
        </AppShell>
      }
    >
      <AthletesPageContent />
    </Suspense>
  );
}
