/** When true, athletes without subscription are redirected to /abonnement (opt-in). */
export function isSubscriptionEnforcementEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_SUBSCRIPTION_REQUIRED === "true";
}

/**
 * When true, athletes with coach-configured betaling_prijs (35/55/75/100/125)
 * keep access without a Stripe subscription (legacy manual billing).
 */
export function isLegacyCoachingBillingEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRIPE_LEGACY_BILLING_ACCESS !== "false";
}

export function isAthleteSubscriptionGated(role: string | null | undefined): boolean {
  return role === "atleet";
}

export const SUBSCRIPTION_GATE_ALLOWED_PATHS = [
  "/abonnement",
  "/profile",
  "/login",
  "/signup",
  "/privacy",
  "/voorwaarden",
  "/pending-approval",
  "/intake",
] as const;

export function isSubscriptionGateAllowedPath(pathname: string): boolean {
  return SUBSCRIPTION_GATE_ALLOWED_PATHS.some((path) =>
    pathname.startsWith(path),
  );
}
