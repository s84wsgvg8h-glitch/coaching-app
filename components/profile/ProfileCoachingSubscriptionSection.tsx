"use client";

import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getRealSupabase } from "@/lib/supabaseClient";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { normalizeCoachingMonthlyPrice } from "@/lib/coachingPlanFromPrice";
import {
  isSubscriptionAccessStatus,
  subscriptionStatusLabel,
} from "@/lib/subscriptionStatus";
import { useCoachingSubscription } from "@/hooks/useCoachingSubscription";

type ProfileCoachingSubscriptionSectionProps = {
  userId: string;
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ProfileCoachingSubscriptionSection({
  userId,
}: ProfileCoachingSubscriptionSectionProps) {
  const searchParams = useSearchParams();
  const checkoutState = searchParams.get("checkout");

  const {
    data: subscriptionState,
    isLoading,
    error: queryError,
    refetch,
  } = useCoachingSubscription(userId);

  const subscription = subscriptionState?.subscription ?? null;
  const monthlyPrice = subscriptionState?.monthlyPrice ?? null;
  const planLabel = subscriptionState?.planLabel ?? null;

  const [actionLoading, setActionLoading] = useState<"checkout" | "portal" | null>(
    null,
  );
  const [actionError, setActionError] = useState("");

  const checkoutFeedback = useMemo(() => {
    if (checkoutState === "success") {
      return {
        success:
          "Betaling ontvangen. Je abonnement wordt binnen enkele seconden geactiveerd.",
        error: "",
      };
    }
    if (checkoutState === "cancel") {
      return {
        success: "",
        error: "Checkout geannuleerd. Je kunt het opnieuw proberen.",
      };
    }
    return { success: "", error: "" };
  }, [checkoutState]);

  const hasAccess = subscription
    ? isSubscriptionAccessStatus(subscription.status)
    : false;

  const statusTone = useMemo(() => {
    if (!subscription) return "muted";
    if (hasAccess) return "success";
    if (subscription.status === "past_due") return "warning";
    return "muted";
  }, [hasAccess, subscription]);

  const displayError =
    actionError || checkoutFeedback.error || (queryError ? queryError.message : "");

  async function getAccessToken(): Promise<string | null> {
    const { data } = await getRealSupabase().auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function startCheckout() {
    setActionLoading("checkout");
    setActionError("");

    try {
      const token = await getAccessToken();
      if (!token) {
        setActionError("Je bent niet ingelogd.");
        setActionLoading(null);
        return;
      }

      const { data: profileRow } = await getRealSupabase()
        .from("profiles")
        .select("betaling_prijs")
        .eq("id", userId)
        .maybeSingle();

      const monthlyPrice = normalizeCoachingMonthlyPrice(
        profileRow?.betaling_prijs !== null &&
          profileRow?.betaling_prijs !== undefined
          ? Number(profileRow.betaling_prijs)
          : null,
      );

      if (monthlyPrice === null) {
        setActionError(
          "Je coach moet eerst je abonnementsprijs instellen voordat je kunt afsluiten.",
        );
        setActionLoading(null);
        return;
      }

      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        setActionError(payload?.error || "Checkout kon niet worden gestart.");
        setActionLoading(null);
        return;
      }

      await openExternalUrl(payload.url);
    } catch {
      setActionError("Checkout kon niet worden gestart.");
    } finally {
      setActionLoading(null);
    }
  }

  async function openPortal() {
    setActionLoading("portal");
    setActionError("");

    try {
      const token = await getAccessToken();
      if (!token) {
        setActionError("Je bent niet ingelogd.");
        setActionLoading(null);
        return;
      }

      const response = await fetch("/api/stripe/create-portal-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const payload = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.url) {
        setActionError(payload?.error || "Beheerportaal kon niet worden geopend.");
        setActionLoading(null);
        return;
      }

      await openExternalUrl(payload.url);
    } catch {
      setActionError("Beheerportaal kon niet worden geopend.");
    } finally {
      setActionLoading(null);
    }
  }

  useEffect(() => {
    if (checkoutState === "success") {
      void refetch();
    }
  }, [checkoutState, refetch]);

  return (
    <div className="space-y-4 pb-[calc(var(--mobile-nav-total-height)+1.5rem)] lg:pb-0">
      <div className="rounded-2xl border border-app-border/70 bg-app-surface/80 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-app-border/70 bg-app-bg/70">
            <CreditCard className="h-5 w-5 text-app-text" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-app-text">Coachingabonnement</p>
            <p className="mt-1 text-xs leading-relaxed text-app-muted">
              Beheer je maandelijkse coaching via Stripe. Betalingen worden veilig
              buiten de app afgehandeld.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-5 flex items-center gap-2 text-sm text-app-muted">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Abonnement laden…
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-app-border/60 bg-app-bg/50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                  Abonnement
                </p>
                <p className="mt-1 text-sm font-semibold text-app-text">
                  {planLabel
                    ? planLabel
                    : monthlyPrice
                      ? `Coaching abonnement €${monthlyPrice}`
                      : "Coaching abonnement"}
                </p>
              </div>
              <div className="rounded-xl border border-app-border/60 bg-app-bg/50 px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                  Status
                </p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    statusTone === "success"
                      ? "text-emerald-500"
                      : statusTone === "warning"
                        ? "text-amber-500"
                        : "text-app-text"
                  }`}
                >
                  {subscription
                    ? subscriptionStatusLabel(subscription.status)
                    : "Geen actief abonnement"}
                </p>
              </div>
              <div className="rounded-xl border border-app-border/60 bg-app-bg/50 px-3 py-3 sm:col-span-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-app-muted">
                  Volgende betaaldatum
                </p>
                <p className="mt-1 text-sm font-semibold text-app-text">
                  {subscription?.current_period_end
                    ? formatDate(subscription.current_period_end)
                    : "—"}
                </p>
                {subscription?.cancel_at_period_end ? (
                  <p className="mt-1 text-xs text-amber-500">
                    Loopt af aan het einde van de huidige periode.
                  </p>
                ) : null}
              </div>
            </div>

            {checkoutFeedback.success ? (
              <p className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-300">
                {checkoutFeedback.success}
              </p>
            ) : null}

            {displayError ? (
              <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-600 dark:text-red-300">
                {displayError}
              </p>
            ) : null}

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
              {!hasAccess ? (
                <button
                  type="button"
                  onClick={() => void startCheckout()}
                  disabled={actionLoading !== null}
                  className="app-focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-app-text px-4 py-2.5 text-sm font-semibold text-app-bg transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
                >
                  {actionLoading === "checkout" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  )}
                  Abonnement afsluiten
                </button>
              ) : null}

              {hasAccess ? (
                <button
                  type="button"
                  onClick={() => void openPortal()}
                  disabled={actionLoading !== null}
                  className="app-focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-app-border/70 bg-app-bg/60 px-4 py-2.5 text-sm font-semibold text-app-text transition hover:bg-app-bg sm:w-auto"
                >
                  {actionLoading === "portal" ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  )}
                  Beheer abonnement
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
