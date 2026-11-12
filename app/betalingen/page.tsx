"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
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

type SortKey =
  | "athlete"
  | "monthlyPrice"
  | "paymentDay"
  | "subscription"
  | "next";

type SortDirection = "asc" | "desc";

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

const SORT_COLUMNS: Array<{ key: SortKey; label: string }> = [
  { key: "athlete", label: "Atleet" },
  { key: "monthlyPrice", label: "Maandprijs" },
  { key: "paymentDay", label: "Betaaldag" },
  { key: "subscription", label: "Abonnement" },
  { key: "next", label: "Volgende" },
];

const SUBSCRIPTION_SORT_RANK: Record<string, number> = {
  active: 1,
  trialing: 2,
  past_due: 3,
  unpaid: 4,
  paused: 5,
  incomplete: 6,
  canceled: 7,
};

function statusTextClass(status: string | null | undefined) {
  switch (status) {
    case "active":
    case "trialing":
      return "text-emerald-400";
    case "past_due":
    case "unpaid":
      return "text-rose-400";
    case "canceled":
    case "incomplete":
    case "paused":
      return "text-app-muted";
    default:
      return "text-app-muted";
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

function nextPaymentSortValue(row: MergedPaymentRow) {
  const raw = row.subscription?.nextPaymentDate || row.profileNextDate;
  if (!raw) return Number.POSITIVE_INFINITY;
  const parsed = new Date(
    raw.includes("T") ? raw : `${raw}T12:00:00`,
  ).getTime();
  return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
}

function subscriptionSortValue(row: MergedPaymentRow) {
  if (!row.subscription) return 99;
  return SUBSCRIPTION_SORT_RANK[row.subscription.status] ?? 50;
}

function compareNullableNumber(
  left: number | null,
  right: number | null,
  direction: SortDirection,
) {
  const leftEmpty = left == null;
  const rightEmpty = right == null;
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1;
  if (rightEmpty) return -1;
  return direction === "asc" ? left - right : right - left;
}

function compareRows(
  left: MergedPaymentRow,
  right: MergedPaymentRow,
  sortKey: SortKey,
  direction: SortDirection,
) {
  const sign = direction === "asc" ? 1 : -1;
  let result = 0;

  switch (sortKey) {
    case "athlete":
      result = left.athleteName.localeCompare(right.athleteName, "nl") * sign;
      break;
    case "monthlyPrice":
      result = compareNullableNumber(
        left.monthlyPrice,
        right.monthlyPrice,
        direction,
      );
      break;
    case "paymentDay":
      result = compareNullableNumber(
        left.paymentDay,
        right.paymentDay,
        direction,
      );
      break;
    case "subscription": {
      const leftRank = subscriptionSortValue(left);
      const rightRank = subscriptionSortValue(right);
      if (leftRank !== rightRank) {
        result = (leftRank - rightRank) * sign;
      } else {
        result =
          (left.subscription?.statusLabel || "Geen abonnement").localeCompare(
            right.subscription?.statusLabel || "Geen abonnement",
            "nl",
          ) * sign;
      }
      break;
    }
    case "next": {
      const leftValue = nextPaymentSortValue(left);
      const rightValue = nextPaymentSortValue(right);
      const leftEmpty = !Number.isFinite(leftValue);
      const rightEmpty = !Number.isFinite(rightValue);
      if (leftEmpty || rightEmpty) {
        result = Number(leftEmpty) - Number(rightEmpty);
      } else {
        result = (leftValue - rightValue) * sign;
      }
      break;
    }
  }

  if (result === 0 && sortKey !== "athlete") {
    return left.athleteName.localeCompare(right.athleteName, "nl");
  }

  return result;
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
  const { userId, role, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [overview, setOverview] = useState<CoachPaymentOverview | null>(null);
  const [subscriptions, setSubscriptions] = useState<CoachAthleteSubscriptionRow[]>(
    [],
  );
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [stripePendingOnboarding, setStripePendingOnboarding] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [openingPortal, setOpeningPortal] = useState<string | null>(null);

  function handleSort(nextKey: SortKey) {
    // Three states per column: first direction → opposite → normale volgorde.
    if (sortKey !== nextKey) {
      setSortKey(nextKey);
      setSortDirection(nextKey === "athlete" ? "asc" : "desc");
      return;
    }
    if (sortDirection === (nextKey === "athlete" ? "asc" : "desc")) {
      setSortDirection(nextKey === "athlete" ? "desc" : "asc");
      return;
    }
    setSortKey(null);
    setSortDirection("asc");
  }

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
    if (!userId || !isCoachLikeRole(role)) {
      if (!authLoading && !userId) {
        window.location.href = "/login";
      } else if (!authLoading && userId) {
        window.location.href = "/dashboard";
      }
      return;
    }

    if (!options?.silent) {
      setLoading(true);
    }

    const paymentOverview = await loadCoachPaymentOverview(
      userId,
      role || "coach",
    );
    setOverview(paymentOverview);
    setLoading(false);

    if (isDemoMode()) {
      setStripeConnected(false);
      setStripeConfigured(true);
      setSubscriptions([]);
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    if (token) {
      const [stripeStatusError, subscriptionError] = await Promise.all([
        refreshStripeStatus(token),
        loadSubscriptions(token),
      ]);
      if (!options?.silent) {
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
    }
  }

  const reloadLiveRef = useRef<() => void>(() => {});
  reloadLiveRef.current = () => {
    void loadPage({ silent: true });
  };

  useEffect(() => {
    if (authLoading) return;
    void loadPage();
    // searchParams is read for the banner, not as a reload trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, userId, role]);

  useEffect(() => {
    let lastFetchAt = Date.now();

    const reloadIfDue = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastFetchAt < 30_000) return;
      lastFetchAt = now;
      reloadLiveRef.current();
    };

    document.addEventListener("visibilitychange", reloadIfDue);
    window.addEventListener("focus", reloadIfDue);

    return () => {
      document.removeEventListener("visibilitychange", reloadIfDue);
      window.removeEventListener("focus", reloadIfDue);
    };
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

  const visibleRows = useMemo(() => {
    const filtered = mergedRows.filter((row) => rowMatchesSearch(row, search));
    if (!sortKey) return filtered;
    return [...filtered].sort((left, right) =>
      compareRows(left, right, sortKey, sortDirection),
    );
  }, [mergedRows, search, sortKey, sortDirection]);


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
        {message ? (
          <Panel className="mb-4 border-brand-purple/30 bg-brand-purple/10 text-[13px] text-app-text">
            {message}
          </Panel>
        ) : null}

        {loading || !overview ? (
          <div className="min-w-0 space-y-4" aria-busy="true" aria-live="polite">
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              <div className="h-11 w-11 animate-pulse rounded-full bg-app-surface-muted" />
              <div className="h-11 w-full animate-pulse rounded-xl bg-app-surface-muted sm:ml-auto sm:w-36" />
            </div>
            <div className="overflow-hidden rounded-2xl border border-app-border">
              <div className="grid grid-cols-5 gap-3 border-b border-app-border px-4 py-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-5 animate-pulse rounded bg-app-surface-muted"
                  />
                ))}
              </div>
              <div className="space-y-3 p-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-10 animate-pulse rounded-xl bg-app-surface-muted"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="min-w-0">
              <PageHeader
                title="Betalingen"
                description="Overzicht van maandprijzen, betaaldagen en Stripe-abonnementen."
                actions={
                  <button
                    type="button"
                    onClick={() => void handleConnectStripe()}
                    disabled={loading || connecting || !stripeConfigured}
                    className="app-focus-ring inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-xl border border-app-border px-3 text-[12px] font-semibold text-app-muted transition hover:border-app-border-strong hover:text-app-text disabled:opacity-50 sm:w-auto"
                  >
                    {connecting
                      ? "Stripe openen..."
                      : !overview ||
                          stripeConnected ||
                          overview.stripeConnectOnboardedAt
                        ? "Beheer Stripe"
                        : stripePendingOnboarding ||
                            overview.stripeConnectAccountId
                          ? "Koppeling afronden"
                          : "Koppel met Stripe"}
                  </button>
                }
              />

              <Panel className="overflow-hidden !border-0 !bg-transparent !p-0 !shadow-none">
                <div className="mb-3 flex items-center md:hidden">
                  <SearchInput
                    value={search}
                    onChange={setSearch}
                    placeholder="Zoek op naam of e-mail…"
                    collapsible
                    compact
                    variant="ghost"
                    className="shrink-0"
                    aria-label="Zoek atleten"
                  />
                </div>
                {visibleRows.length === 0 ? (
                  <p className="px-1 py-8 text-center text-[13px] text-app-muted">
                    {mergedRows.length === 0
                      ? "Nog geen atleten."
                      : "Geen atleten voor deze zoekopdracht."}
                  </p>
                ) : (
                  <>
                    <div className="table-compact-wrap hidden overflow-x-auto md:block">
                      <table className="min-w-full text-center text-[11px]">
                        <thead>
                          <tr className="border-b border-app-border/60">
                            <th className="w-11 px-1 py-2.5 text-center align-middle sm:px-2">
                              <SearchInput
                                value={search}
                                onChange={setSearch}
                                placeholder="Zoek op naam of e-mail…"
                                collapsible
                                compact
                                variant="ghost"
                                className="mx-auto shrink-0"
                                aria-label="Zoek atleten"
                              />
                            </th>
                            {SORT_COLUMNS.map((column) => {
                              const active = sortKey === column.key;
                              return (
                                <th
                                  key={column.key}
                                  className="px-2 py-2.5 text-center align-middle sm:px-3"
                                  aria-sort={
                                    active
                                      ? sortDirection === "asc"
                                        ? "ascending"
                                        : "descending"
                                      : "none"
                                  }
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleSort(column.key)}
                                    className={`app-focus-ring inline-flex min-h-11 items-center justify-center gap-1 rounded-lg px-1.5 text-[15px] font-semibold leading-none transition ${
                                      active
                                        ? "text-app-text"
                                        : "text-app-muted hover:text-app-text"
                                    }`}
                                  >
                                    {column.label}
                                    {active ? (
                                      sortDirection === "asc" ? (
                                        <ArrowUp
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                      ) : (
                                        <ArrowDown
                                          className="h-3.5 w-3.5"
                                          aria-hidden="true"
                                        />
                                      )
                                    ) : null}
                                  </button>
                                </th>
                              );
                            })}
                            <th className="w-24 px-2 py-2.5 text-center sm:px-3" />
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
                    <div className="grid grid-cols-1 gap-2 md:hidden">
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
    return <span className="text-app-muted">Geen abonnement</span>;
  }

  return (
    <span className={statusTextClass(subscription.status)}>
      {subscription.statusLabel}
    </span>
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
    <tr className="h-14 border-b border-app-border/40 last:border-b-0">
      <td className="w-11 px-1 py-0 align-middle sm:px-2" aria-hidden="true" />
      <td className="px-2 py-0 text-center align-middle text-[11px] sm:px-3">
        <p className="font-medium text-app-text">{row.athleteName}</p>
      </td>
      <td className="px-2 py-0 text-center align-middle text-[11px] text-app-text sm:px-3">
        {formatPaymentPrice(row.monthlyPrice)}
      </td>
      <td className="px-2 py-0 text-center align-middle text-[11px] text-app-muted sm:px-3">
        {row.paymentDay ?? "—"}
      </td>
      <td className="px-2 py-0 text-center align-middle text-[11px] sm:px-3">
        <div className="flex min-h-11 flex-col items-center justify-center">
          <SubscriptionStatus subscription={row.subscription} />
          {row.subscription?.cancelAtPeriodEnd ? (
            <p className="mt-0.5 text-[10px] text-amber-400/90">Stopt eind periode</p>
          ) : null}
        </div>
      </td>
      <td className="px-2 py-0 text-center align-middle text-[11px] text-app-muted sm:px-3">
        {nextPaymentLabel(row)}
      </td>
      <td className="w-24 px-2 py-0 text-center align-middle sm:px-3">
        <div className="flex min-h-11 items-center justify-center">
          {subscriptionId ? (
            <button
              type="button"
              onClick={() => onOpenPortal(subscriptionId)}
              disabled={Boolean(openingPortal)}
              className="app-focus-ring inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-app-muted transition hover:text-app-text disabled:opacity-60"
            >
              {isOpening ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Beheer
            </button>
          ) : (
            <span className="invisible inline-flex min-h-11 items-center px-2 text-[11px]">
              Beheer
            </span>
          )}
        </div>
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
    <article className="border-b border-app-border/50 py-3.5 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-app-text">
            {row.athleteName}
          </p>
          <p className={`mt-0.5 text-[12px] ${statusTextClass(row.subscription?.status)}`}>
            {row.subscription?.statusLabel || "Geen abonnement"}
          </p>
        </div>
        {subscriptionId ? (
          <button
            type="button"
            onClick={() => onOpenPortal(subscriptionId)}
            disabled={Boolean(openingPortal)}
            className="app-focus-ring inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-[12px] font-medium text-app-muted transition hover:text-app-text disabled:opacity-60"
          >
            {isOpening ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            Beheer
          </button>
        ) : null}
      </div>
      <dl className="mt-2.5 grid grid-cols-3 gap-2 text-[12px]">
        <div>
          <dt className="text-app-subtle">Prijs</dt>
          <dd className="font-medium text-app-text">
            {formatPaymentPrice(row.monthlyPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-app-subtle">Dag</dt>
          <dd className="font-medium text-app-text">{row.paymentDay ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-app-subtle">Volgende</dt>
          <dd className="font-medium text-app-text">{nextPaymentLabel(row)}</dd>
        </div>
      </dl>
    </article>
  );
}
