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
  const [message, setMessage] = useState("");

  useEffect(() => {
    document.title = "Betalingen";
  }, []);

  useEffect(() => {
    if (searchParams.get("stripe") === "success") {
      setMessage("Stripe-koppeling bijgewerkt.");
    } else if (searchParams.get("stripe") === "refresh") {
      setMessage("Rond je Stripe-koppeling af om betalingen te ontvangen.");
    }
  }, [searchParams]);

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
        setLoading(false);
        return;
      }

      const token = session.data.session?.access_token;
      if (token) {
        const response = await fetch("/api/stripe/connect", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.ok) {
          const payload = (await response.json()) as { connected?: boolean };
          setStripeConnected(Boolean(payload.connected));
        }
      }

      setLoading(false);
    }

    void load();
  }, []);

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

    const payload = (await response.json()) as { url?: string; error?: string };
    setConnecting(false);

    if (!response.ok || !payload.url) {
      setMessage(payload.error || "Stripe-koppeling kon niet worden gestart.");
      return;
    }

    window.location.href = payload.url;
  }

  return (
    <AppShell>
      <PageContainer size="full">
        <PageHeader
          title="Betalingen"
          description="Overzicht van maandprijzen per atleet en Stripe-koppeling voor online betalingen."
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
                Koppel je Stripe-account om online betalingen van atleten te
                ontvangen. Maandprijzen blijven ook zichtbaar in atleetprofielen.
              </p>

              <div className="mt-4 rounded-xl border border-app-border bg-app-surface-muted/40 px-3 py-2.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                  Status
                </p>
                <p className="mt-1 text-[13px] font-medium text-app-text">
                  {stripeConnected || overview.stripeConnectOnboardedAt
                    ? "Stripe gekoppeld"
                    : overview.stripeConnectAccountId
                      ? "Koppeling nog afronden"
                      : "Nog niet gekoppeld"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => void handleConnectStripe()}
                disabled={connecting}
                className="app-btn-primary mt-4 w-full disabled:opacity-50"
              >
                {connecting
                  ? "Stripe openen..."
                  : stripeConnected
                    ? "Stripe beheren"
                    : "Koppel met Stripe"}
              </button>
            </Panel>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
