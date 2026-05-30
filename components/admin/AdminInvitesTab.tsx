"use client";

import { useEffect, useState } from "react";
import {
  buildCoachInviteUrl,
  formatInviteExpiry,
} from "@/lib/coachInviteLinks";
import {
  buildCoachSignupUrl,
  createCoachSignupInvite,
  formatInviteExpiry as formatSignupExpiry,
  type CoachSignupInvite,
} from "@/lib/coachSignupInvites";
import {
  loadAdminInviteOverview,
  revokeAthleteInviteLink,
  revokeCoachSignupInvite,
} from "@/lib/adminInvites";

type AdminInvitesTabProps = {
  adminId: string;
};

export default function AdminInvitesTab({ adminId }: AdminInvitesTabProps) {
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState("");
  const [signupInvites, setSignupInvites] = useState<CoachSignupInvite[]>([]);
  const [athleteInvites, setAthleteInvites] = useState<
    Awaited<ReturnType<typeof loadAdminInviteOverview>>["athleteInvites"]
  >([]);

  async function reload() {
    const overview = await loadAdminInviteOverview();
    setSignupInvites(overview.coachSignupInvites);
    setAthleteInvites(overview.athleteInvites);
    setLoading(false);
  }

  useEffect(() => {
    void reload();
  }, []);

  async function handleCreateCoachInvite() {
    if (!adminId) return;
    setCreating(true);
    const { data, error } = await createCoachSignupInvite(adminId);
    setCreating(false);

    if (error || !data) {
      alert(error?.message || "Link kon niet worden aangemaakt.");
      return;
    }

    setSignupInvites((current) => [data, ...current]);
  }

  async function copyUrl(url: string, token: string) {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      window.setTimeout(() => setCopiedToken(""), 2000);
    } catch {
      prompt("Kopieer deze link:", url);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Uitnodigingen laden...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-black">Coach signup-links</h2>
            <p className="text-sm text-gray-500">
              Tijdelijke links voor nieuwe coach-aanmeldingen.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void handleCreateCoachInvite()}
            disabled={creating}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {creating ? "Link maken..." : "Nieuwe coach-link"}
          </button>
        </div>
        <InviteList
          items={signupInvites.map((invite) => ({
            id: invite.id,
            url: buildCoachSignupUrl(invite.token),
            token: invite.token,
            meta: `Geldig t/m ${formatSignupExpiry(invite.expires_at)}`,
            active: invite.active,
          }))}
          copiedToken={copiedToken}
          onCopy={copyUrl}
          onRevoke={(id) => void revokeCoachSignupInvite(id).then(reload)}
          emptyLabel="Geen coach signup-links."
        />
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">Atleet uitnodigingslinks</h2>
        <p className="text-sm text-gray-500">
          Alle actieve en inactieve links van coaches.
        </p>
        <InviteList
          items={athleteInvites.map((invite) => ({
            id: invite.id,
            url: buildCoachInviteUrl(invite.token),
            token: invite.token,
            meta: `${invite.coach_name || "Coach"} · ${invite.active ? "actief" : "inactief"} · ${formatInviteExpiry(invite)}`,
            active: invite.active,
          }))}
          copiedToken={copiedToken}
          onCopy={copyUrl}
          onRevoke={(id) => void revokeAthleteInviteLink(id).then(reload)}
          emptyLabel="Geen atleet-links."
        />
      </section>
    </div>
  );
}

function InviteList({
  items,
  copiedToken,
  onCopy,
  onRevoke,
  emptyLabel,
}: {
  items: Array<{
    id: string;
    url: string;
    token: string;
    meta: string;
    active: boolean;
  }>;
  copiedToken: string;
  onCopy: (url: string, token: string) => void;
  onRevoke: (id: string) => void;
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="mt-3 text-sm text-gray-500">{emptyLabel}</p>;
  }

  return (
    <div className="mt-4 space-y-3">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border border-gray-200 p-3">
          <p className="break-all text-sm font-medium text-black">{item.url}</p>
          <p className="mt-1 text-xs text-gray-500">{item.meta}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopy(item.url, item.token)}
              className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
            >
              {copiedToken === item.token ? "Gekopieerd" : "Kopieer"}
            </button>
            {item.active ? (
              <button
                type="button"
                onClick={() => onRevoke(item.id)}
                className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
              >
                Intrekken
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
