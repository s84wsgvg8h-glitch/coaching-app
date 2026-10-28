"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import { isDemoMode } from "@/lib/demo/demoMode";
import {
  formatPaymentPrice,
  loadCoachPaymentOverview,
  type CoachPaymentOverview,
} from "@/lib/coachPaymentOverview";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";
import { openExternalUrl } from "@/lib/openExternalUrl";

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

export default function BetalingenPage() {
  return (
    <Suspense fallback={<AppShell><PageContainer size="full"><Panel>Laden...</Panel></PageContainer></AppShell>}>
      <BetalingenPageContent />
    </Suspense>
  );
}

function BetalingenPageContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [overview, setOverview] = useState<CoachPaymentOverview | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeConfigured, setStripeConfigured] = useState(true);
  const [stripePendingOnboarding, setStripePendingOnboarding] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<StripeConnectUiStatus | null>(
    null,
  );
  const [message, setMessage] = useState("");

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

  useEffect(() => {
    async function load() {
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
        setLoading(false);
        return;
      }

      const token = session.data.session?.access_token;
      if (token) {
        const stripeStatusError = await refreshStripeStatus(token);
        if (
          stripeStatusError &&
          searchParams.get("stripe") !== "success" &&
          searchParams.get("stripe") !== "refresh"
        ) {
          setMessage(stripeStatusError);
        }
      }

      setLoading(false);
    }

    void load();
  }, []);

  useEffect(() => {
    if (searchParams.get("stripe") !== "success") {
      return;
    }

    void (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (token) {
        const stripeStatusError = await refreshStripeStatus(token);
        if (stripeStatusError) {
          setMessage(stripeStatusError);
        }
      }
    })();
  }, [searchParams]);

  async function handleConnectStripe() {
    setConnecting(true);
    setMessage("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
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
      if (payload.configured === false) {
        setStripeConfigured(false);
      }
      setMessage(payload.error || "Stripe-koppeling kon niet worden gestart.");
      return;
    }

    await openExternalUrl(payload.url);
  }

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Betalingen"
          description="Overzicht van maandprijzen per atleet en Stripe-koppeling voor online betalingen."
          actions={
            <Link
              href="/coach/subscriptions"
              className="app-focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-app-border-strong bg-app-surface-muted px-4 text-[13px] font-semibold text-app-text transition hover:border-app-accent/35 sm:w-auto"
            >
              Stripe-abonnementen
            </Link>
          }
        />

        {message ? (
          <Panel className="mb-4 border-brand-purple/30 bg-brand-purple/10 text-[13px] text-app-text">
            {message}
          </Panel>
        ) : null}

        {loading || !overview ? (
          <Panel>Laden...</Panel>
        ) : (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Panel className="overflow-hidden !p-0">
              <div className="border-b border-app-border px-4 py-3">
                <h2 className="text-[15px] font-semibold text-app-text">
                  Atleetbetalingen
                </h2>
                <p className="mt-0.5 text-[12px] text-app-muted">
                  {overview.payingAthleteCount} betalende atleten ·{" "}
                  {formatPaymentPrice(overview.totalMonthlyIncome)} / maand
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-[13px]">
                  <thead className="border-b border-app-border bg-app-surface-muted/40 text-[11px] uppercase tracking-wide text-app-muted">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Atleet</th>
                      <th className="px-4 py-3 font-semibold">Maandprijs</th>
                      <th className="px-4 py-3 font-semibold">Betaaldag</th>
                      <th className="px-4 py-3 font-semibold">Volgende</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.rows.map((row) => (
                      <tr
                        key={row.athleteId}
                        className="border-b border-app-border/70 last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/athletes/${row.athleteId}`}
                            className="font-medium text-app-text hover:text-brand-purple"
                          >
                            {row.athleteName}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          {formatPaymentPrice(row.monthlyPrice)}
                        </td>
                        <td className="px-4 py-3">
                          {row.paymentDay ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-app-muted">
                          {row.nextPaymentDate
                            ? new Date(`${row.nextPaymentDate}T12:00:00`).toLocaleDateString(
                                "nl-NL",
                                {
                                  day: "numeric",
                                  month: "short",
                                },
                              )
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel>
              <h2 className="text-[15px] font-semibold text-app-text">Stripe</h2>
              <p className="mt-2 text-[13px] leading-6 text-app-muted">
                Koppel je Stripe-account zodat atleten rechtstreeks bij jou
                betalen. Limitless Coaching rekent geen platformfee.
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
                      {[
                        ...stripeStatus.requirementsPastDue,
                        ...stripeStatus.requirementsDue,
                      ]
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
                onClick={() => void handleConnectStripe()}
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
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
