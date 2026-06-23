"use client";

import { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Copy,
  Link2,
  MessageCircle,
  Plus,
  ShieldCheck,
  X,
} from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import {
  buildCoachInviteUrl,
  formatInviteExpiry,
  type CoachInviteLink,
} from "@/lib/coachInviteLinks";

type PendingProfile = {
  id: string;
  fullName: string;
};

type AthletesInvitePanelProps = {
  open: boolean;
  onClose: () => void;
  inviteLinks: CoachInviteLink[];
  pendingProfiles: PendingProfile[];
  creatingLink: boolean;
  copiedToken: string;
  onCreateLink: (requiresIntake: boolean) => void;
  onCopyLink: (token: string) => void;
  onRemoveLink: (linkId: string) => void;
  onAcceptPending: (profileId: string) => void;
  onRejectPending: (profileId: string) => void;
};

function stopRowNav(event: React.MouseEvent) {
  event.stopPropagation();
}

export default function AthletesInvitePanel({
  open,
  onClose,
  inviteLinks,
  pendingProfiles,
  creatingLink,
  copiedToken,
  onCreateLink,
  onCopyLink,
  onRemoveLink,
  onAcceptPending,
  onRejectPending,
}: AthletesInvitePanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [requiresIntake, setRequiresIntake] = useState(true);
  const primaryLink = inviteLinks[0] ?? null;
  const primaryUrl = primaryLink ? buildCoachInviteUrl(primaryLink.token) : null;

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  function shareWhatsApp(url: string) {
    window.open(
      `https://wa.me/?text=${encodeURIComponent(`Meld je aan als atleet bij Limitless Coaching:\n${url}`)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        aria-label="Sluiten"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="athletes-invite-modal fixed left-1/2 top-[10%] z-50 flex max-h-[min(82dvh,760px)] w-[min(calc(100vw-1.5rem),560px)] -translate-x-1/2 flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="athletes-invite-title"
        onClick={stopRowNav}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="athletes-invite-title" className="text-[19px] font-semibold text-app-text">
                Atleten uitnodigen
              </h2>
              {pendingProfiles.length > 0 ? (
                <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300 ring-1 ring-amber-500/30">
                  {pendingProfiles.length} wachtend
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-app-muted">
              Deel je persoonlijke link. Nieuwe aanmeldingen keur jij eerst goed.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-app-muted transition hover:bg-white/10 hover:text-app-text app-focus-ring"
            aria-label="Sluiten"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5">
          {primaryUrl ? (
            <div className="mb-5 rounded-2xl border border-app-accent/30 bg-app-accent/[0.08] p-4 ring-1 ring-app-accent/20">
              <div className="mb-3 flex items-center gap-2 text-app-accent">
                <Link2 className="h-4 w-4 shrink-0" />
                <p className="text-[12px] font-semibold uppercase tracking-wide">Actieve link</p>
              </div>
              <p className="break-all rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-[12px] leading-relaxed text-app-text">
                {primaryUrl}
              </p>
              {primaryLink ? (
                <p className="mt-2 text-[11px] text-app-muted">
                  Verloopt: {formatInviteExpiry(primaryLink)}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => primaryLink && onCopyLink(primaryLink.token)}
                  className="athletes-pill-btn-primary inline-flex items-center gap-2 !px-4 !py-2 text-[13px]"
                >
                  <Copy className="h-4 w-4" />
                  {primaryLink && copiedToken === primaryLink.token ? "Gekopieerd!" : "Kopieer link"}
                </button>
                <button
                  type="button"
                  onClick={() => shareWhatsApp(primaryUrl)}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-4 py-2 text-[13px] font-medium text-emerald-300 transition hover:bg-emerald-500/15 app-focus-ring"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-5 rounded-2xl border border-dashed border-app-accent/35 bg-app-accent/[0.06] p-5 text-center">
              <p className="text-[14px] font-medium text-app-text">Nog geen uitnodigingslink</p>
              <p className="mt-1 text-[13px] text-app-muted">
                Maak een link om atleten direct te laten aanmelden.
              </p>
              <label className="mt-4 flex cursor-pointer items-center justify-center gap-2.5 text-left text-[13px] text-app-text">
                <input
                  type="checkbox"
                  checked={requiresIntake}
                  onChange={(event) => setRequiresIntake(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-transparent accent-[var(--app-accent)]"
                />
                <span>Atleet moet eerst het intakeformulier invullen</span>
              </label>
              <button
                type="button"
                onClick={() => onCreateLink(requiresIntake)}
                disabled={creatingLink}
                className="athletes-pill-btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                {creatingLink ? "Link maken…" : "Maak uitnodigingslink"}
              </button>
            </div>
          )}

          <div className="mb-5 grid gap-2 sm:grid-cols-3">
            {[
              { icon: Link2, text: "Deel de link met je atleet" },
              { icon: ShieldCheck, text: "Atleet vult intake in" },
              { icon: CheckCircle2, text: "Jij keurt de aanmelding goed" },
            ].map(({ icon: Icon, text }) => (
              <div
                key={text}
                className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5"
              >
                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-app-accent" />
                <p className="text-[11px] leading-snug text-app-muted">{text}</p>
              </div>
            ))}
          </div>

          {inviteLinks.length > 1 ? (
            <section className="mb-5">
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-app-subtle">
                Meer links
              </p>
              <div className="space-y-2">
                {inviteLinks.slice(1).map((link) => {
                  const url = buildCoachInviteUrl(link.token);
                  return (
                    <div
                      key={link.id}
                      className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <p className="break-all text-[12px] text-app-text">{url}</p>
                      <p className="mt-1 text-[11px] text-app-muted">
                        Verloopt: {formatInviteExpiry(link)}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          onClick={() => onCopyLink(link.token)}
                          className="app-btn-secondary !rounded-full !px-3 !py-1 text-[11px]"
                        >
                          {copiedToken === link.token ? "Gekopieerd" : "Kopieer"}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveLink(link.id)}
                          className="app-btn-secondary !rounded-full !px-3 !py-1 text-[11px] !text-app-destructive"
                        >
                          Deactiveer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}

          {primaryUrl ? (
            <div className="mb-5 flex flex-col items-end gap-3">
              <label className="flex w-full cursor-pointer items-start gap-2.5 rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2.5 text-left text-[13px] text-app-text">
                <input
                  type="checkbox"
                  checked={requiresIntake}
                  onChange={(event) => setRequiresIntake(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[var(--app-accent)]"
                />
                <span>
                  Intakeformulier verplicht voor nieuwe atleten via een nieuwe link
                </span>
              </label>
              <button
                type="button"
                onClick={() => onCreateLink(requiresIntake)}
                disabled={creatingLink}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-app-accent transition hover:text-app-text disabled:opacity-50 app-focus-ring"
              >
                <Plus className="h-3.5 w-3.5" />
                {creatingLink ? "Bezig…" : "Nieuwe link aanmaken"}
              </button>
            </div>
          ) : null}

          {pendingProfiles.length > 0 ? (
            <section className="overflow-hidden rounded-2xl border border-amber-500/25 bg-amber-500/[0.04]">
              <div className="border-b border-amber-500/20 px-4 py-3">
                <h3 className="text-[14px] font-semibold text-app-text">
                  Openstaande aanmeldingen
                </h3>
                <p className="text-[12px] text-app-muted">Keur goed of wijs af.</p>
              </div>
              {pendingProfiles.map((profile) => (
                <div
                  key={profile.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/10 px-4 py-3 last:border-b-0"
                >
                  <p className="text-[13px] font-medium text-app-text">{profile.fullName}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onAcceptPending(profile.id)}
                      className="app-btn-primary !rounded-full !px-3 !py-1.5 text-[12px]"
                    >
                      Accepteren
                    </button>
                    <button
                      type="button"
                      onClick={() => onRejectPending(profile.id)}
                      className="app-btn-secondary !rounded-full !px-3 !py-1.5 text-[12px] !text-app-destructive"
                    >
                      Afwijzen
                    </button>
                  </div>
                </div>
              ))}
            </section>
          ) : inviteLinks.length === 0 ? (
            <EmptyState
              icon="athletes"
              title="Nog geen atleten"
              description="Deel een uitnodigingslink om je eerste atleet te koppelen."
            />
          ) : null}
        </div>
      </div>
    </>
  );
}
