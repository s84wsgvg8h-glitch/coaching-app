import { NextRequest, NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";
import { loadCoachStripeSubscriptions } from "@/lib/coachStripeSubscriptions";
import { getStripe } from "@/lib/stripe";

export async function GET(request: NextRequest) {
  const auth = await assertCoachLike(request);
  if (auth.error || !auth.db || !auth.userId) {
    return NextResponse.json(
      { error: auth.error ?? "Geen toegang." },
      { status: auth.error === "Niet ingelogd." ? 401 : 403 },
    );
  }

  if (!getStripe()) {
    return NextResponse.json(
      { error: "Stripe is nog niet geconfigureerd.", configured: false },
      { status: 503 },
    );
  }

  const result = await loadCoachStripeSubscriptions(auth.db, auth.userId);

  if (result.error) {
    const status = result.error.includes("Koppel eerst Stripe") ? 404 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({
    connectAccountId: result.connectAccountId,
    subscriptions: result.subscriptions,
  });
}
