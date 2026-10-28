"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ExternalLink, Loader2, RefreshCw } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Badge, PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
import SearchInput from "@/components/ui/SearchInput";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import { isDemoMode } from "@/lib/demo/demoMode";
import {
  formatPaymentPrice,
  loadCoachPaymentOverview,
  type CoachPaymentOverview,
} from "@/lib/coachPaymentOverview";
import {
  pickPreferredAthleteSubscription,
  type CoachAthleteSubscriptionRow,
} from "@/lib/coachStripeSubscriptionsShared";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import { openExternalUrl, prepareExternalWindow } from "@/lib/openExternalUrl";

type StripeConnectUiStatus = {
  connected: boolean;
  configured: boolean;
  pendingOnboarding: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsDue: string[];
  requirementsEventuallyDue: string[];
  requirementsPastDue: string[];
  accountId?: string;
};

type CoverageFilter = "all" | "with" | "without" | "canceled";

type MergedPaymentRow = {
  key: string;
  athleteId: string | null;
  athleteName: string;
  athleteEmail: string | null;
  monthlyPrice: number | null;
  paymentDay: number | null;
  profileNextDate: string | null;
  subscription: CoachAthleteSubscriptionRow | null;
};

const FILTERS: Array<{ key: CoverageFilter; label: string }> = [
  { key: "all", label: "Alle" },
  { key: "with", label: "Met abonnement" },
  { key: "without", label: "Zonder abonnement" },
  { key: "canceled", label: "Geannuleerd" },
];

const LIVE_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "incomplete",
  "paused",
]);

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

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
  });
}

function hasLiveSubscription(row: MergedPaymentRow) {
  return Boolean(
    row.subscription && LIVE_SUBSCRIPTION_STATUSES.has(row.subscription.status),
  );
}

function mergePaymentRows(
  overview: CoachPaymentOverview,
  subscriptions: CoachAthleteSubscriptionRow[],
): MergedPaymentRow[] {
  const byAthleteId = new Map<string, CoachAthleteSubscriptionRow[]>();
  for (const subscription of subscriptions) {
    if (!subscription.athleteUserId) continue;
    const current = byAthleteId.get(subscription.athleteUserId) ?? [];
    current.push(subscription);
    byAthleteId.set(subscription.athleteUserId, current);
  }

  const usedSubscriptionIds = new Set<string>();
  const rows: MergedPaymentRow[] = overview.rows.map((row) => {
    const matches = byAthleteId.get(row.athleteId) ?? [];
    for (const match of matches) usedSubscriptionIds.add(match.id);
    const subscription = pickPreferredAthleteSubscription(matches);
    return {
      key: row.athleteId,
      athleteId: row.athleteId,
      athleteName: row.athleteName,
      athleteEmail: subscription?.athleteEmail || null,
      monthlyPrice: row.monthlyPrice,
      paymentDay: row.paymentDay,
      profileNextDate: row.nextPaymentDate,
      subscription,
    };
  });

  for (const [athleteId, matches] of byAthleteId) {
    if (matches.some((match) => usedSubscriptionIds.has(match.id))) continue;
    for (const match of matches) usedSubscriptionIds.add(match.id);
    const subscription = pickPreferredAthleteSubscription(matches);
    if (!subscription) continue;
    rows.push({
      key: athleteId,
      athleteId,
      athleteName: subscription.athleteName,
      athleteEmail: subscription.athleteEmail,
      monthlyPrice: null,
      paymentDay: null,
      profileNextDate: null,
      subscription,
    });
  }

  for (const subscription of subscriptions) {
    if (subscription.athleteUserId || usedSubscriptionIds.has(subscription.id)) {
      continue;
    }
    usedSubscriptionIds.add(subscription.id);
    rows.push({
      key: subscription.id,
      athleteId: null,
      athleteName: subscription.athleteName,
      athleteEmail: subscription.athleteEmail,
      monthlyPrice: null,
      paymentDay: null,
      profileNextDate: null,
      subscription,
    });
  }

  return rows.sort((left, right) =>
    left.athleteName.localeCompare(right.athleteName, "nl"),
  );
}

function rowMatchesFilter(row: MergedPaymentRow, filter: CoverageFilter) {
  if (filter === "all") return true;
  if (filter === "with") return hasLiveSubscription(row);
  if (filter === "without") return !row.subscription;
  return row.subscription?.status === "canceled";
}

function rowMatchesSearch(row: MergedPaymentRow, search: string) {
  const query = search.trim().toLowerCase();
  if (!query) return true;
  return (
    row.athleteName.toLowerCase().includes(query) ||
    (row.athleteEmail || "").toLowerCase().includes(query)
  );
}

export default function BetalingenPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer size="full">
            <Panel>Laden...</Panel>
          </PageContainer>
        </AppShell>
      }
    >
      <BetalingenPageContent />
    </Suspense>
  );
}

function BetalingenPageContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [overview, setOverview] = useState<CoachPaymentOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<CoachAthleteSubscriptionRow[]>(
    [],
  );
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [stripePendingOnboarding, setStripePendingOnboarding] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectUiStatus | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [openingPortal, setOpeningPortal] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Betalingen";
  }, []);

  useEffect(() => {
    deferEffectUpdate(() => {
      if (searchParams.get("stripe") === "success") {
        setMessage("Stripe-koppeling bijgewerkt.");
      } else if (searchParams.get("stripe") === "refresh") {
        setMessage("Rond je Stripe-koppeling af om betalingen te ontvangen.");
      }
    });
  }, [searchParams]);

  async function refreshStripeStatus(token: string): Promise<string | null> {
    const response = await fetch("/api/stripe/connect", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = (await response.json()) as StripeConnectUiStatus & {
      configured?: boolean;
      error?: string;
    };

    if (!response.ok) {
      return (
        payload.error ||
        "Stripe-status kon niet worden geladen. Probeer het later opnieuw."
      );
    }

    const nextStatus: StripeConnectUiStatus = {
      connected: Boolean(payload.connected),
      configured: payload.configured !== false,
      pendingOnboarding: Boolean(payload.pendingOnboarding),
      chargesEnabled: Boolean(payload.chargesEnabled),
      payoutsEnabled: Boolean(payload.payoutsEnabled),
      requirementsDue: payload.requirementsDue ?? [],
      requirementsEventuallyDue: payload.requirementsEventuallyDue ?? [],
      requirementsPastDue: payload.requirementsPastDue ?? [],
      accountId: payload.accountId,
    };

    setStripeStatus(nextStatus);
    setStripeConfigured(nextStatus.configured);
    setStripeConnected(nextStatus.connected);
    setStripePendingOnboarding(nextStatus.pendingOnboarding);
    return null;
  }

  async function loadSubscriptions(token: string) {
    const response = await fetch("/api/stripe/coach/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const payload = (await response.json()) as {
      subscriptions?: CoachAthleteSubscriptionRow[];
      error?: string;
    };

    if (!response.ok) {
      setSubscriptions([]);
      if (payload.error?.includes("Koppel eerst Stripe")) return null;
      return payload.error || "Abonnementen konden niet worden geladen.";
    }

    setSubscriptions(payload.subscriptions ?? []);
    return null;
  }

  async function loadPage(options?: { silent?: boolean }) {
    if (options?.silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

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

    const [paymentOverview, session] = await Promise.all([
      loadCoachPaymentOverview(user.id, profile?.role || "coach"),
      isDemoMode()
        ? Promise.resolve({ data: { session: { access_token: "demo" } } })
        : supabase.auth.getSession(),
    ]);

    setOverview(paymentOverview);

    if (isDemoMode()) {
      setStripeConnected(false);
      setStripeConfigured(true);
      setSubscriptions([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const token = session.data.session?.access_token;
    if (token) {
      const [stripeStatusError, subscriptionError] = await Promise.all([
        refreshStripeStatus(token),
        loadSubscriptions(token),
      ]);
      const stripeParam = searchParams.get("stripe");
      if (
        stripeStatusError &&
        stripeParam !== "success" &&
        stripeParam !== "refresh"
      ) {
        setMessage(stripeStatusError);
      } else if (subscriptionError) {
        setMessage(subscriptionError);
      }
    }

    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    void loadPage();
    // searchParams is read for the banner, not as a reload trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("stripe") !== "success") return;

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) return;
      const stripeStatusError = await refreshStripeStatus(token);
      if (stripeStatusError) setMessage(stripeStatusError);
      await loadSubscriptions(token);
    })();
  }, [searchParams]);

  const mergedRows = useMemo(
    () => (overview ? mergePaymentRows(overview, subscriptions) : []),
    [overview, subscriptions],
  );

  const visibleRows = useMemo(
    () =>
      mergedRows.filter(
        (row) =>
          rowMatchesFilter(row, coverageFilter) && rowMatchesSearch(row, search),
      ),
    [mergedRows, coverageFilter, search],
  );

  const withSubscriptionCount = mergedRows.filter(hasLiveSubscription).length;
  const withoutSubscriptionCount = mergedRows.filter((row) => !row.subscription).length;

  async function handleConnectStripe() {
    const preparedWindow = prepareExternalWindow();
    setConnecting(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      preparedWindow?.close();
      setMessage("Kon geen sessie vinden.");
      setConnecting(false);
      return;
    }

    const response = await fetch("/api/stripe/connect", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const payload = (await response.json()) as {
      url?: string;
      error?: string;
      configured?: boolean;
    };
    setConnecting(false);

    if (!response.ok || !payload.url) {
      preparedWindow?.close();
      if (payload.configured === false) setStripeConfigured(false);
      setMessage(payload.error || "Stripe-koppeling kon niet worden gestart.");
      return;
    }

    await openExternalUrl(payload.url, { newTab: true, preparedWindow });
  }

  async function handleOpenPortal(subscriptionId: string) {
    const preparedWindow = prepareExternalWindow();
    setMessage("");
    setOpeningPortal(subscriptionId);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (!token) {
      preparedWindow?.close();
      window.location.assign("/login");
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
        preparedWindow?.close();
        setMessage(payload.error || "Beheerportaal kon niet worden geopend.");
        return;
      }

      await openExternalUrl(payload.url, { newTab: true, preparedWindow });
    } catch {
      preparedWindow?.close();
      setMessage("Beheerportaal kon niet worden geopend.");
    } finally {
      setOpeningPortal(null);
    }
  }

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Betalingen"
          description="Maandprijzen en Stripe-abonnementen per atleet. Zie direct wie er al een abonnement heeft."
          actions={
            <button
              type="button"
              onClick={() => void loadPage({ silent: true })}
              disabled={loading || refreshing}
              className="app-focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app-border-strong bg-app-surface px-4 text-[13px] font-semibold text-app-text transition hover:border-app-accent/35 disabled:opacity-60 sm:w-auto"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              Vernieuwen
            </button>
          }
        />

        {message ? (
          <Panel className="mb-4 border-brand-purple/30 bg-brand-purple/10 text-[13px] text-app-text">
            {message}
          </Panel>
        ) : null}

        {loading || !overview ? (
          <Panel className="flex min-h-[220px] items-center justify-center gap-2 text-[13px] text-app-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Betalingen laden…
          </Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0">
              <div className="mb-4 flex flex-col gap-3">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Zoek op naam of e-mailadres…"
                  className="w-full max-w-xl"
                />
                <div className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
                  {FILTERS.map((filter) => {
                    const active = coverageFilter === filter.key;
                    return (
                      <button
                        key={filter.key}
                        type="button"
                        onClick={() => setCoverageFilter(filter.key)}
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

              <Panel className="overflow-hidden !p-0">
                <div className="border-b border-app-border px-4 py-3">
                  <h2 className="text-[15px] font-semibold text-app-text">
                    Atleten
                  </h2>
                  <p className="mt-0.5 text-[12px] text-app-muted">
                    {withSubscriptionCount} met abonnement · {withoutSubscriptionCount}{" "}
                    zonder · {formatPaymentPrice(overview.totalMonthlyIncome)} / maand
                  </p>
                </div>

                {visibleRows.length === 0 ? (
                  <p className="px-4 py-8 text-center text-[13px] text-app-muted">
                    {mergedRows.length === 0
                      ? "Nog geen atleten."
                      : "Geen atleten voor deze filter of zoekopdracht."}
                  </p>
                ) : (
                  <>
                    <div className="hidden overflow-x-auto md:block">
                      <table className="min-w-full text-left text-[13px]">
                        <thead className="border-b border-app-border bg-app-surface-muted/40 text-[11px] uppercase tracking-wide text-app-muted">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Atleet</th>
                            <th className="px-4 py-3 font-semibold">Maandprijs</th>
                            <th className="px-4 py-3 font-semibold">Betaaldag</th>
                            <th className="px-4 py-3 font-semibold">Abonnement</th>
                            <th className="px-4 py-3 font-semibold">Volgende</th>
                            <th className="px-4 py-3 font-semibold" />
                          </tr>
                        </thead>
                        <tbody>
                          {visibleRows.map((row) => (
                            <PaymentAthleteRow
                              key={row.key}
                              row={row}
                              openingPortal={openingPortal}
                              onOpenPortal={(id) => void handleOpenPortal(id)}
                            />
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid grid-cols-1 gap-3 p-3 md:hidden">
                      {visibleRows.map((row) => (
                        <PaymentAthleteCard
                          key={row.key}
                          row={row}
                          openingPortal={openingPortal}
                          onOpenPortal={(id) => void handleOpenPortal(id)}
                        />
                      ))}
                    </div>
                  </>
                )}
              </Panel>
            </div>

            <StripeConnectPanel
              overview={overview}
              stripeConfigured={stripeConfigured}
              stripeConnected={stripeConnected}
              stripePendingOnboarding={stripePendingOnboarding}
              stripeStatus={stripeStatus}
              connecting={connecting}
              onConnect={() => void handleConnectStripe()}
            />
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}

function SubscriptionStatus({
  subscription,
}: {
  subscription: CoachAthleteSubscriptionRow | null;
}) {
  if (!subscription) {
    return <Badge>Geen abonnement</Badge>;
  }

  return (
    <Badge variant={statusBadgeVariant(subscription.status)}>
      {subscription.statusLabel}
    </Badge>
  );
}

function nextPaymentLabel(row: MergedPaymentRow) {
  if (row.subscription?.nextPaymentDate) return row.subscription.nextPaymentDate;
  return formatShortDate(row.profileNextDate);
}

function PaymentAthleteRow({
  row,
  openingPortal,
  onOpenPortal,
}: {
  row: MergedPaymentRow;
  openingPortal: string | null;
  onOpenPortal: (subscriptionId: string) => void;
}) {
  const subscriptionId = row.subscription?.id || null;
  const isOpening = Boolean(subscriptionId && openingPortal === subscriptionId);

  return (
    <tr className="border-b border-app-border/70 last:border-b-0">
      <td className="px-4 py-3 align-top">
        {row.athleteId ? (
          <Link
            href={`/athletes/${row.athleteId}`}
            className="font-medium text-app-text hover:text-brand-purple"
          >
            {row.athleteName}
          </Link>
        ) : (
          <p className="font-medium text-app-text">{row.athleteName}</p>
        )}
        {row.athleteEmail && row.athleteEmail !== "—" ? (
          <p className="mt-0.5 text-[12px] text-app-muted">{row.athleteEmail}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 align-top">{formatPaymentPrice(row.monthlyPrice)}</td>
      <td className="px-4 py-3 align-top">{row.paymentDay ?? "—"}</td>
      <td className="px-4 py-3 align-top">
        <SubscriptionStatus subscription={row.subscription} />
        {row.subscription?.cancelAtPeriodEnd ? (
          <p className="mt-1 text-[11px] font-medium text-amber-400">
            Stopt aan einde periode
          </p>
        ) : null}
      </td>
      <td className="px-4 py-3 align-top text-app-muted">{nextPaymentLabel(row)}</td>
      <td className="px-4 py-3 align-top">
        {subscriptionId ? (
          <button
            type="button"
            onClick={() => onOpenPortal(subscriptionId)}
            disabled={Boolean(openingPortal)}
            className="app-focus-ring inline-flex min-h-11 items-center gap-2 rounded-xl border border-app-border-strong bg-app-surface px-3 text-[12px] font-semibold text-app-text transition hover:border-app-accent/35 disabled:opacity-60"
          >
            {isOpening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Beheer
          </button>
        ) : null}
      </td>
    </tr>
  );
}

function PaymentAthleteCard({
  row,
  openingPortal,
  onOpenPortal,
}: {
  row: MergedPaymentRow;
  openingPortal: string | null;
  onOpenPortal: (subscriptionId: string) => void;
}) {
  const subscriptionId = row.subscription?.id || null;
  const isOpening = Boolean(subscriptionId && openingPortal === subscriptionId);

  return (
    <article className="rounded-2xl border border-app-border bg-app-surface-muted/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {row.athleteId ? (
            <Link
              href={`/athletes/${row.athleteId}`}
              className="block truncate text-[14px] font-semibold text-app-text"
            >
              {row.athleteName}
            </Link>
          ) : (
            <p className="truncate text-[14px] font-semibold text-app-text">
              {row.athleteName}
            </p>
          )}
          {row.athleteEmail && row.athleteEmail !== "—" ? (
            <p className="mt-0.5 truncate text-[12px] text-app-muted">
              {row.athleteEmail}
            </p>
          ) : null}
        </div>
        <SubscriptionStatus subscription={row.subscription} />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-[12px]">
        <div>
          <dt className="text-app-subtle">Maandprijs</dt>
          <dd className="font-medium text-app-text">
            {formatPaymentPrice(row.monthlyPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-app-subtle">Betaaldag</dt>
          <dd className="font-medium text-app-text">{row.paymentDay ?? "—"}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-app-subtle">Volgende betaling</dt>
          <dd className="font-medium text-app-text">{nextPaymentLabel(row)}</dd>
        </div>
      </dl>
      {subscriptionId ? (
        <button
          type="button"
          onClick={() => onOpenPortal(subscriptionId)}
          disabled={Boolean(openingPortal)}
          className="app-focus-ring mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app-border-strong bg-app-surface px-3 text-[13px] font-semibold text-app-text transition hover:border-app-accent/35 disabled:opacity-60"
        >
          {isOpening ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
          )}
          Beheer in Stripe
        </button>
      ) : null}
    </article>
  );
}

function StripeConnectPanel({
  overview,
  stripeConfigured,
  stripeConnected,
  stripePendingOnboarding,
  stripeStatus,
  connecting,
  onConnect,
}: {
  overview: CoachPaymentOverview;
  stripeConfigured: boolean;
  stripeConnected: boolean;
  stripePendingOnboarding: boolean;
  stripeStatus: StripeConnectUiStatus | null;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <Panel>
      <h2 className="text-[15px] font-semibold text-app-text">Stripe</h2>
      <p className="mt-2 text-[13px] leading-6 text-app-muted">
        Koppel je Stripe-account zodat atleten rechtstreeks bij jou betalen.
        Limitless Coaching rekent geen platformfee.
      </p>

      <div className="mt-4 space-y-2">
        <div className="rounded-xl border border-app-border bg-app-surface-muted/40 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
            Status
          </p>
          <p className="mt-1 text-[13px] font-medium text-app-text">
            {!stripeConfigured
              ? "Platform niet geconfigureerd"
              : stripeConnected || overview.stripeConnectOnboardedAt
                ? "Stripe actief"
                : stripePendingOnboarding || overview.stripeConnectAccountId
                  ? "Koppeling nog afronden"
                  : "Nog niet gekoppeld"}
          </p>
        </div>

        {stripeStatus ? (
          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="rounded-xl border border-app-border bg-app-surface-muted/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-app-muted">
                Betalingen
              </p>
              <p className="mt-1 font-medium text-app-text">
                {stripeStatus.chargesEnabled ? "Ingeschakeld" : "Uit"}
              </p>
            </div>
            <div className="rounded-xl border border-app-border bg-app-surface-muted/30 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-app-muted">
                Uitbetalingen
              </p>
              <p className="mt-1 font-medium text-app-text">
                {stripeStatus.payoutsEnabled ? "Ingeschakeld" : "Uit"}
              </p>
            </div>
          </div>
        ) : null}

        {stripeStatus &&
        (stripeStatus.requirementsDue.length > 0 ||
          stripeStatus.requirementsPastDue.length > 0) ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-300">
              Onboarding vereist
            </p>
            <ul className="mt-2 space-y-1 text-[12px] leading-5 text-app-text">
              {[...stripeStatus.requirementsPastDue, ...stripeStatus.requirementsDue]
                .slice(0, 6)
                .map((item) => (
                  <li key={item}>• {item.replaceAll(".", " ")}</li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>

      {!stripeConfigured ? (
        <p className="mt-3 text-[12px] leading-5 text-app-muted">
          Voeg{" "}
          <code className="rounded bg-app-surface-muted px-1 py-0.5 text-[11px]">
            STRIPE_SECRET_KEY
          </code>{" "}
          toe in Vercel Production en redeploy. Daarna kun je hier je
          Stripe-account koppelen.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onConnect}
        disabled={connecting || !stripeConfigured}
        className="app-btn-primary mt-4 w-full disabled:opacity-50"
      >
        {connecting
          ? "Stripe openen..."
          : stripeConnected
            ? "Stripe beheren"
            : stripePendingOnboarding || overview.stripeConnectAccountId
              ? "Koppeling afronden"
              : "Koppel met Stripe"}
      </button>
    </Panel>
  );
}
