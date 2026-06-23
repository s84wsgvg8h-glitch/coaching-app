import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { getAppUrl } from "@/lib/appUrl";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const stripe = getStripe();
  if (!supabase || !stripe) {
    return NextResponse.json(
      { error: "Stripe is nog niet geconfigureerd." },
      { status: 503 },
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, stripe_connect_account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "coach" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Geen toegang." }, { status: 403 });
  }

  let accountId = profile.stripe_connect_account_id as string | null;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    accountId = account.id;

    await supabase
      .from("profiles")
      .update({ stripe_connect_account_id: accountId })
      .eq("id", user.id);
  }

  const origin = request.headers.get("origin") || getAppUrl();

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/betalingen?stripe=refresh`,
    return_url: `${origin}/betalingen?stripe=success`,
    type: "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const supabase = getServiceSupabase();
  const stripe = getStripe();
  if (!supabase || !stripe) {
    return NextResponse.json({ connected: false, configured: false });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_connect_account_id, stripe_connect_onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  const accountId = profile?.stripe_connect_account_id as string | null;
  if (!accountId) {
    return NextResponse.json({ connected: false, configured: true });
  }

  const account = await stripe.accounts.retrieve(accountId);
  const connected = Boolean(account.charges_enabled && account.payouts_enabled);

  if (connected && !profile?.stripe_connect_onboarded_at) {
    await supabase
      .from("profiles")
      .update({ stripe_connect_onboarded_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return NextResponse.json({
    connected,
    configured: true,
    accountId,
  });
}
