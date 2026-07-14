import { NextRequest, NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";
import { getAppUrl } from "@/lib/appUrl";
import {
  mapConnectAccountStatus,
  syncCoachConnectProfile,
} from "@/lib/stripeConnect";
import {
  COACH_CONNECT_ACCOUNT_CAPABILITIES,
  ensureCoachConnectPaymentSetup,
  getConnectPaymentMethodDisplayStatus,
  mapConnectPaymentCapabilities,
} from "@/lib/stripeConnectPaymentMethods";
import { getStripe } from "@/lib/stripe";

const STRIPE_DB_CONFIG_ERROR =
  "Stripe-koppeling kon niet worden geladen door een databaseconfiguratiefout.";

function logStripeConnectDbError(
  context: string,
  details: { code?: string; message?: string },
) {
  console.error("[stripe/connect] database error", {
    context,
    code: details.code ?? "unknown",
    message: details.message ?? "unknown",
  });
}

function stripeDbConfigErrorResponse(
  context: string,
  error: { code?: string; message?: string } | null,
) {
  logStripeConnectDbError(context, {
    code: error?.code,
    message: error?.message,
  });
  return NextResponse.json({ error: STRIPE_DB_CONFIG_ERROR }, { status: 500 });
}

function stripeNotConfiguredResponse() {
  return NextResponse.json(
    {
      error: "Stripe is nog niet geconfigureerd.",
      configured: false,
    },
    { status: 503 },
  );
}

export async function POST(request: NextRequest) {
  const auth = await assertCoachLike(request);
  if (auth.error || !auth.db || !auth.userId) {
    return NextResponse.json(
      { error: auth.error ?? "Geen toegang." },
      { status: auth.error === "Niet ingelogd." ? 401 : 403 },
    );
  }

  const supabase = auth.db;
  const stripe = getStripe();
  if (!stripe) {
    return stripeNotConfiguredResponse();
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, stripe_connect_account_id, full_name")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError) {
    return stripeDbConfigErrorResponse("read-profile-post", profileError);
  }

  if (!profile) {
    logStripeConnectDbError("read-profile-post-missing", {
      message: "profile row missing after coach auth",
    });
    return NextResponse.json({ error: STRIPE_DB_CONFIG_ERROR }, { status: 500 });
  }

  let accountId = profile.stripe_connect_account_id as string | null;

  if (!accountId) {
    const { data: authUser } = await supabase.auth.admin.getUserById(auth.userId);
    const coachEmail = authUser?.user?.email?.trim() || undefined;

    try {
      const account = await stripe.accounts.create({
        type: "express",
        country: "NL",
        email: coachEmail,
        capabilities: COACH_CONNECT_ACCOUNT_CAPABILITIES,
        metadata: {
          coach_id: auth.userId,
          coach_name: (profile.full_name as string | null) || "",
        },
      });

      accountId = account.id;

      try {
        await ensureCoachConnectPaymentSetup(accountId);
      } catch (paymentMethodError) {
        console.warn("[stripe/connect] payment method setup after create failed", {
          accountId,
          message:
            paymentMethodError instanceof Error
              ? paymentMethodError.message
              : "unknown",
        });
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_connect_account_id: accountId })
        .eq("id", auth.userId);

      if (updateError) {
        logStripeConnectDbError("write-stripe-connect-account-id", updateError);
        return NextResponse.json({ error: STRIPE_DB_CONFIG_ERROR }, { status: 500 });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Stripe-koppeling mislukt.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    const status = mapConnectAccountStatus(account);

    const origin = request.headers.get("origin") || getAppUrl();
    const returnBase = `${origin.replace(/\/$/, "")}/betalingen`;

    if (status.connected) {
      await syncCoachConnectProfile(supabase, auth.userId, account);
      let paymentMethodSetup = null;
      try {
        paymentMethodSetup = await ensureCoachConnectPaymentSetup(accountId);
      } catch (paymentMethodError) {
        console.warn("[stripe/connect] payment method setup on login failed", {
          accountId,
          message:
            paymentMethodError instanceof Error
              ? paymentMethodError.message
              : "unknown",
        });
      }
      const loginLink = await stripe.accounts.createLoginLink(accountId);
      return NextResponse.json({
        url: loginLink.url,
        mode: "login",
        status,
        paymentCapabilities: mapConnectPaymentCapabilities(account),
        paymentMethodSetup,
      });
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${returnBase}?stripe=refresh`,
      return_url: `${returnBase}?stripe=success`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url, mode: "onboarding", status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe-koppeling mislukt.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function GET(request: NextRequest) {
  const auth = await assertCoachLike(request);
  if (auth.error || !auth.db || !auth.userId) {
    return NextResponse.json(
      { error: auth.error ?? "Geen toegang." },
      { status: auth.error === "Niet ingelogd." ? 401 : 403 },
    );
  }

  const supabase = auth.db;
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ connected: false, configured: false });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, stripe_connect_account_id, stripe_connect_onboarded_at")
    .eq("id", auth.userId)
    .maybeSingle();

  if (profileError) {
    return stripeDbConfigErrorResponse("read-profile-get", profileError);
  }

  if (!profile) {
    logStripeConnectDbError("read-profile-get-missing", {
      message: "profile row missing after coach auth",
    });
    return NextResponse.json({ error: STRIPE_DB_CONFIG_ERROR }, { status: 500 });
  }

  const accountId = profile.stripe_connect_account_id as string | null;
  if (!accountId) {
    return NextResponse.json({
      connected: false,
      configured: true,
      pendingOnboarding: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      requirementsDue: [],
      requirementsEventuallyDue: [],
      requirementsPastDue: [],
    });
  }

  try {
    const account = await stripe.accounts.retrieve(accountId);
    const status = await syncCoachConnectProfile(supabase, auth.userId, account);
    const paymentMethodDisplay = await getConnectPaymentMethodDisplayStatus(
      stripe,
      accountId,
    ).catch(() => null);

    return NextResponse.json({
      connected: status.connected,
      configured: true,
      pendingOnboarding: status.pendingOnboarding,
      accountId: status.accountId,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      requirementsDue: status.requirementsDue,
      requirementsEventuallyDue: status.requirementsEventuallyDue,
      requirementsPastDue: status.requirementsPastDue,
      disabledReason: status.disabledReason,
      onboardedAt: profile.stripe_connect_onboarded_at,
      paymentCapabilities: mapConnectPaymentCapabilities(account),
      paymentMethodDisplay,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe-status ophalen mislukt.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
