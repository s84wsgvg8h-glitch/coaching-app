import { NextRequest, NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";
import { assertCoachOwnsStripeSubscription } from "@/lib/coachStripeSubscriptions";
import { getAppUrl } from "@/lib/appUrl";
import { stripeConnectOptions } from "@/lib/stripeConnect";
import { getStripe, requireStripe } from "@/lib/stripe";

export async function POST(request: NextRequest) {
  const auth = await assertCoachLike(request);
  if (auth.error || !auth.db || !auth.userId) {
    return NextResponse.json(
      { error: auth.error ?? "Geen toegang." },
      { status: auth.error === "Niet ingelogd." ? 401 : 403 },
    );
  }

  if (!getStripe()) {
    return NextResponse.json(
      { error: "Stripe is nog niet geconfigureerd." },
      { status: 503 },
    );
  }

  let body: { subscriptionId?: string };
  try {
    body = (await request.json()) as { subscriptionId?: string };
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const subscriptionId = body.subscriptionId?.trim();
  if (!subscriptionId) {
    return NextResponse.json(
      { error: "subscriptionId is verplicht." },
      { status: 400 },
    );
  }

  const { data: coachProfile, error: coachError } = await auth.db
    .from("profiles")
    .select("stripe_connect_account_id")
    .eq("id", auth.userId)
    .maybeSingle();

  if (coachError || !coachProfile) {
    return NextResponse.json(
      { error: "Coachprofiel kon niet worden geladen." },
      { status: 500 },
    );
  }

  const connectAccountId =
    (coachProfile.stripe_connect_account_id as string | null)?.trim() || null;

  if (!connectAccountId) {
    return NextResponse.json(
      { error: "Geen gekoppeld Stripe-account gevonden." },
      { status: 404 },
    );
  }

  const ownership = await assertCoachOwnsStripeSubscription(
    auth.db,
    auth.userId,
    connectAccountId,
    subscriptionId,
  );

  if (ownership.error || !ownership.customerId) {
    return NextResponse.json(
      { error: ownership.error ?? "Geen toegang." },
      { status: 403 },
    );
  }

  const stripe = requireStripe();

  try {
    const portalSession = await stripe.billingPortal.sessions.create(
      {
        customer: ownership.customerId,
        return_url: `${getAppUrl()}/betalingen`,
      },
      stripeConnectOptions(connectAccountId),
    );

    return NextResponse.json({ url: portalSession.url });
  } catch (error) {
    console.error("[stripe/coach/subscription-portal] session create failed", {
      coachId: auth.userId,
      subscriptionId,
      connectAccountId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Beheerportaal kon niet worden geopend." },
      { status: 500 },
    );
  }
}
