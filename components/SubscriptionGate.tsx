"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useAthleteSubscriptionAccess } from "@/hooks/useAthleteSubscriptionAccess";
import { isDemoMode } from "@/lib/demo/demoMode";
import {
  isAthleteSubscriptionGated,
  isSubscriptionEnforcementEnabled,
  isSubscriptionGateAllowedPath,
} from "@/lib/subscriptionEnforcement";

/** Redirect-only gate — athletes zonder actief abonnement gaan naar /abonnement. */
export default function SubscriptionGate({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { userId, profile, loading: authLoading } = useAuth();
  const enforcementEnabled = isSubscriptionEnforcementEnabled();

  const { data, isLoading: subscriptionLoading } = useAthleteSubscriptionAccess(
    userId,
    profile?.role,
  );

  useEffect(() => {
    if (!enforcementEnabled) return;
    if (authLoading || subscriptionLoading) return;
    if (isSubscriptionGateAllowedPath(pathname)) return;
    if (isDemoMode() || !userId) return;
    if (!isAthleteSubscriptionGated(profile?.role)) return;

    if (!data?.hasAccess) {
      router.replace("/abonnement");
    }
  }, [
    authLoading,
    data?.hasAccess,
    enforcementEnabled,
    pathname,
    profile?.role,
    router,
    subscriptionLoading,
    userId,
  ]);

  return <>{children}</>;
}
