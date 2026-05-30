"use client";

import { useEffect, useState } from "react";
import {
  buildCoachInviteUrl,
  createCoachInviteLink,
  formatInviteExpiry,
  loadCoachInviteLinks,
  type CoachInviteLink,
} from "@/lib/coachInviteLinks";

type CoachInvitePanelProps = {
  coachId: string;
  compact?: boolean;
};

export default function CoachInvitePanel({
  coachId,
  compact = false,
}: CoachInvitePanelProps) {
  const [links, setLinks] = useState<CoachInviteLink[]>([]);
  const [creating, setCreating] = useState(false);
  const [copiedToken, setCopiedToken] = useState("");

  useEffect(() => {
    void loadCoachInviteLinks(coachId).then(setLinks);
  }, [coachId]);

  async function handleCreate() {
    setCreating(true);
    const { data } = await createCoachInviteLink(coachId);
    setCreating(false);
    if (data) {
      setLinks(await loadCoachInviteLinks(coachId));
    }
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(buildCoachInviteUrl(token));
    setCopiedToken(token);
    window.setTimeout(() => setCopiedToken(""), 2000);
  }

  return (
    <div className={compact ? "space-y-3" : "app-card space-y-4"}>
      {!compact ? (
        <div>
          <h2 className="text-lg font-bold text-app-text">Atleten uitnodigen</h2>
          <p className="mt-1 text-sm text-app-muted">
            Links verlopen na 4 dagen.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleCreate()}
        disabled={creating}
        className="app-btn-primary disabled:opacity-60"
      >
        {creating ? "Link maken..." : "Nieuwe uitnodigingslink"}
      </button>

      {links.length === 0 ? (
        <p className="text-sm text-app-muted">Geen actieve links.</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <div
              key={link.id}
              className="rounded-xl border border-app-border p-3 text-sm"
            >
              <p className="break-all font-medium">{buildCoachInviteUrl(link.token)}</p>
              <p className="mt-1 text-xs text-app-muted">
                Verloopt: {formatInviteExpiry(link)}
              </p>
              <button
                type="button"
                onClick={() => void copyLink(link.token)}
                className="app-btn-secondary mt-2 text-xs"
              >
                {copiedToken === link.token ? "Gekopieerd" : "Kopieer link"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
