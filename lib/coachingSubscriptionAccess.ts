import type { SupabaseClient, User } from "@supabase/supabase-js";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import {
  getCoachingAccessDetails,
  hasCoachingAccess,
  shouldEnforceCoachingSubscription,
} from "@/lib/coachingAccess";
import type { CoachingSubscriptionRow } from "@/lib/subscriptionStatus";
import { requireSupabaseServiceClient } from "@/lib/supabaseService";

type SubscriptionAccessResult =
  | {
      error: null;
      enforced: boolean;
      hasAccess: boolean;
      subscription: CoachingSubscriptionRow | null;
      supabase: SupabaseClient;
      user: User;
    }
  | {
      error: string;
      status: 401 | 403;
      enforced: boolean;
      hasAccess: false;
      subscription: null;
      supabase: null;
      user: null;
    };

export async function getAthleteSubscriptionAccess(userId: string): Promise<{
  hasAccess: boolean;
  subscription: CoachingSubscriptionRow | null;
  accessSource: "stripe" | "legacy" | "none";
  legacyBilling: boolean;
}> {
  const service = requireSupabaseServiceClient();
  const details = await getCoachingAccessDetails(service, userId);
  return {
    hasAccess: details.hasAccess,
    subscription: details.subscription,
    accessSource: details.accessSource,
    legacyBilling: details.legacyBilling,
  };
}

export async function requireActiveCoachingSubscription(
  request: Request,
): Promise<SubscriptionAccessResult> {
  const auth = await assertAuthenticatedActive(request);
  if (auth.error || !auth.user || !auth.supabase) {
    return {
      error: auth.error,
      status: auth.status,
      enforced: shouldEnforceCoachingSubscription(),
      hasAccess: false,
      subscription: null,
      supabase: null,
      user: null,
    };
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  if (profile?.role !== "atleet" || !shouldEnforceCoachingSubscription()) {
    return {
      error: null,
      enforced: false,
      hasAccess: true,
      subscription: null,
      supabase: auth.supabase,
      user: auth.user,
    };
  }

  const service = requireSupabaseServiceClient();
  const allowed = await hasCoachingAccess(service, auth.user.id);

  if (!allowed) {
    return {
      error: "Actief coachingabonnement vereist.",
      status: 403,
      enforced: true,
      hasAccess: false,
      subscription: null,
      supabase: null,
      user: null,
    };
  }

  const details = await getCoachingAccessDetails(service, auth.user.id);

  return {
    error: null,
    enforced: true,
    hasAccess: true,
    subscription: details.subscription,
    supabase: auth.supabase,
    user: auth.user,
  };
}
