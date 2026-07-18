"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge, PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
import SearchInput from "@/components/ui/SearchInput";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  filterCoachSubscriptions,
  type CoachAthleteSubscriptionRow,
  type CoachSubscriptionStatusFilter,
} from "@/lib/coachStripeSubscriptionsShared";
import { openExternalUrl } from "@/lib/openExternalUrl";

const STATUS_FILTERS: Array<{ key: CoachSubscriptionStatusFilter; label: string }> =
  [
    { key: "all", label: "Alle" },
    { key: "trialing", label: "Proefperiode" },
    { key: "active", label: "Actief" },
    { key: "past_due", label: "Achterstallig" },
    { key: "canceled", label: "Geannuleerd" },
  ];

function statusBadgeVariant(
  status: string,
): "default" | "success" | "warning" | "danger" | "accent" {
  switch (status) {
    case "active":
      return "success";
    case "trialing":
      return "accent";
    case "past_due":
    case "unpaid":
      return "danger";
    case "incomplete":
    case "paused":
      return "warning";
    default:
      return "default";
  }
}

function SubscriptionMobileCard({
  row,
  onOpenPortal,
  openingPortal,
}: {
  row: CoachAthleteSubscriptionRow;
  onOpenPortal: (subscriptionId: string) => void;
  openingPortal: string | null;
}) {
  const isOpening = openingPortal === row.id;

  return (
    <article className="rounded-2xl border border-app-border bg-app-surface-muted/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-app-text">
            {row.athleteName}
          </p>
          <p className="mt-0.5 truncate text-[12px] text-app-muted">
            {row.athleteEmail}
          </p>
        </div>
        <Badge variant={statusBadgeVariant(row.status)}>{row.statusLabel}</Badge>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
        <div>
          <dt className="text-app-subtle">Pakket</dt>
          <dd className="font-medium text-app-text">{row.packageName}</dd>
        </div>
        <div>
          <dt className="text-app-subtle">Bedrag</dt>
          <dd className="font-medium text-app-text">{row.monthlyAmountLabel}</dd>
        </div>
        <div>
          <dt className="text-app-subtle">Proefperiode tot</dt>
          <dd className="font-medium text-app-text">{row.trialEnd || "—"}</dd>
        </div>
        <div>
          <dt className="text-app-subtle">Volgende betaling</dt>
          <dd className="font-medium text-app-text">
            {row.nextPaymentDate || "—"}
          </dd>
        </div>
      </dl>

      {row.cancelAtPeriodEnd ? (
        <p className="mt-2 text-[11px] font-medium text-amber-400">
          Wordt aan het einde van de periode opgezegd
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => onOpenPortal(row.id)}
        disabled={Boolean(openingPortal)}
        className="app-focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app-border-strong bg-app-surface px-3 text-[13px] font-semibold text-app-text transition hover:border-app-accent/35 hover:bg-app-accent-muted disabled:opacity-60"
      >
        {isOpening ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        )}
        Beheer in Stripe
      </button>
    </article>
  );
}

export default function CoachSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [subscriptions, setSubscriptions] = useState<CoachAthleteSubscriptionRow[]>(
    [],
  );
  const [statusFilter, setStatusFilter] =
    useState<CoachSubscriptionStatusFilter>("all");
  const [search, setSearch] = useState("");
  const [openingPortal, setOpeningPortal] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState("");

  useEffect(() => {
    document.title = "Abonnementen";
  }, []);

  async function loadSubscriptions(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    const response = await fetch("/api/stripe/coach/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = (await response.json()) as {
      subscriptions?: CoachAthleteSubscriptionRow[];
      error?: string;
    };

    if (!response.ok) {
      setError(payload.error || "Abonnementen konden niet worden geladen.");
      setSubscriptions([]);
    } else {
      setSubscriptions(payload.subscriptions ?? []);
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isCoachLikeRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      await loadSubscriptions();
    }

    void init();
  }, []);

  const filteredSubscriptions = useMemo(
    () => filterCoachSubscriptions(subscriptions, statusFilter, search),
    [subscriptions, statusFilter, search],
  );

  async function handleOpenPortal(subscriptionId: string) {
    setActionMessage("");
    setOpeningPortal(subscriptionId);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      window.location.href = "/login";
      return;
    }

    try {
      const response = await fetch("/api/stripe/coach/subscription-portal", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscriptionId }),
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        setActionMessage(
          payload.error || "Beheerportaal kon niet worden geopend.",
        );
        return;
      }

      await openExternalUrl(payload.url);
    } catch {
      setActionMessage("Beheerportaal kon niet worden geopend.");
    } finally {
      setOpeningPortal(null);
    }
  }

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Abonnementen"
          description="Stripe-abonnementen van je atleten op je gekoppelde account."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                href="/betalingen"
                className="app-focus-ring inline-flex min-h-11 items-center justify-center rounded-xl border border-app-border-strong bg-app-surface-muted px-4 text-[13px] font-semibold text-app-text transition hover:border-app-accent/35"
              >
                Stripe-koppeling
              </Link>
              <button
                type="button"
                onClick={() => void loadSubscriptions({ silent: true })}
                disabled={loading || refreshing}
                className="app-focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-app-border-strong bg-app-surface px-4 text-[13px] font-semibold text-app-text transition hover:border-app-accent/35 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Vernieuwen
              </button>
            </div>
          }
        />

        <div className="mb-4 flex flex-col gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Zoek op naam of e-mailadres…"
            className="w-full max-w-xl"
          />

          <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
            {STATUS_FILTERS.map((filter) => {
              const active = statusFilter === filter.key;
              return (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setStatusFilter(filter.key)}
                  className={`app-focus-ring inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-[12px] font-semibold transition ${
                    active
                      ? "border-app-accent/35 bg-app-accent-muted text-app-text"
                      : "border-app-border bg-app-surface-muted text-app-muted hover:text-app-text"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {actionMessage ? (
          <Panel className="mb-4 border border-amber-500/30 bg-amber-500/10 text-[13px] text-amber-200">
            {actionMessage}
          </Panel>
        ) : null}

        {loading ? (
          <Panel className="flex min-h-[220px] items-center justify-center gap-2 text-[13px] text-app-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Abonnementen laden…
          </Panel>
        ) : error ? (
          <Panel className="border border-red-500/25 bg-red-500/10">
            <p className="text-[14px] font-semibold text-app-text">
              Kon abonnementen niet laden
            </p>
            <p className="mt-1 text-[13px] text-app-muted">{error}</p>
            {error.includes("Koppel eerst Stripe") ? (
              <Link
                href="/betalingen"
                className="app-focus-ring mt-3 inline-flex min-h-11 items-center rounded-xl border border-app-border-strong bg-app-surface px-4 text-[13px] font-semibold text-app-text"
              >
                Naar Stripe-koppeling
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => void loadSubscriptions()}
                className="app-focus-ring mt-3 inline-flex min-h-11 items-center rounded-xl border border-app-border-strong bg-app-surface px-4 text-[13px] font-semibold text-app-text"
              >
                Opnieuw proberen
              </button>
            )}
          </Panel>
        ) : filteredSubscriptions.length === 0 ? (
          <Panel className="text-center">
            <p className="text-[14px] font-semibold text-app-text">
              {subscriptions.length === 0
                ? "Nog geen abonnementen"
                : "Geen resultaten"}
            </p>
            <p className="mt-1 text-[13px] text-app-muted">
              {subscriptions.length === 0
                ? "Zodra atleten een coachingabonnement afsluiten, verschijnen ze hier."
                : "Pas je zoekopdracht of filter aan."}
            </p>
          </Panel>
        ) : (
          <>
            <Panel className="hidden overflow-hidden !p-0 lg:block">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[13px]">
                  <thead className="border-b border-app-border bg-app-surface-muted/40 text-[11px] uppercase tracking-wide text-app-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Atleet</th>
                      <th className="px-4 py-3 font-semibold">Pakket</th>
                      <th className="px-4 py-3 font-semibold">Bedrag</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold">Proefperiode</th>
                      <th className="px-4 py-3 font-semibold">Volgende betaling</th>
                      <th className="px-4 py-3 font-semibold">Opzegging</th>
                      <th className="px-4 py-3 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((row) => {
                      const isOpening = openingPortal === row.id;
                      return (
                        <tr
                          key={row.id}
                          className="border-b border-app-border/70 last:border-b-0"
                        >
                          <td className="px-4 py-3 align-top">
                            <p className="font-semibold text-app-text">
                              {row.athleteName}
                            </p>
                            <p className="mt-0.5 text-[12px] text-app-muted">
                              {row.athleteEmail}
                            </p>
                          </td>
                          <td className="px-4 py-3 align-top text-app-text">
                            {row.packageName}
                          </td>
                          <td className="px-4 py-3 align-top text-app-text">
                            {row.monthlyAmountLabel}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <Badge variant={statusBadgeVariant(row.status)}>
                              {row.statusLabel}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 align-top text-app-muted">
                            {row.trialEnd || "—"}
                          </td>
                          <td className="px-4 py-3 align-top text-app-muted">
                            {row.nextPaymentDate || "—"}
                          </td>
                          <td className="px-4 py-3 align-top text-app-muted">
                            {row.cancelAtPeriodEnd ? "Einde periode" : "—"}
                          </td>
                          <td className="px-4 py-3 align-top">
                            <button
                              type="button"
                              onClick={() => void handleOpenPortal(row.id)}
                              disabled={Boolean(openingPortal)}
                              className="app-focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-app-border-strong bg-app-surface px-3 text-[12px] font-semibold text-app-text transition hover:border-app-accent/35 disabled:opacity-60"
                            >
                              {isOpening ? (
                                <Loader2
                                  className="h-3.5 w-3.5 animate-spin"
                                  aria-hidden="true"
                                />
                              ) : (
                                <ExternalLink
                                  className="h-3.5 w-3.5"
                                  aria-hidden="true"
                                />
                              )}
                              Beheer
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {filteredSubscriptions.map((row) => (
                <SubscriptionMobileCard
                  key={row.id}
                  row={row}
                  onOpenPortal={(id) => void handleOpenPortal(id)}
                  openingPortal={openingPortal}
                />
              ))}
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
