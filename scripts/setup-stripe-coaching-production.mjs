#!/usr/bin/env node
/**
 * Configure Stripe coaching webhook + Vercel Production secrets.
 *
 * Usage (run locally — never commit secrets):
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe-coaching-production.mjs
 *
 * Optional:
 *   VERCEL_SET_SECRETS=true  — also push secrets to Vercel Production via CLI
 *   STRIPE_WEBHOOK_URL=https://limitlesscoaching.app/api/stripe/webhook
 */

import { spawnSync } from "node:child_process";
import process from "node:process";

const WEBHOOK_URL =
  process.env.STRIPE_WEBHOOK_URL?.trim() ||
  "https://limitlesscoaching.app/api/stripe/webhook";

const WEBHOOK_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
  "account.updated",
];

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(message);
}

function maskSecret(value) {
  if (!value || value.length < 8) return "***";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

async function stripeRequest(secretKey, path, body) {
  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(body).toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error?.message || `Stripe request failed (${response.status})`);
  }
  return payload;
}

function listWebhookEndpoints(secretKey) {
  return fetch("https://api.stripe.com/v1/webhook_endpoints?limit=100", {
    headers: { Authorization: `Bearer ${secretKey}` },
  }).then(async (response) => {
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error?.message || "Could not list webhook endpoints");
    }
    return payload.data ?? [];
  });
}

function vercelEnvAdd(name, value, environment = "production") {
  const result = spawnSync(
    "npx",
    ["vercel", "env", "add", name, environment, "--force", "--yes"],
    {
      input: value,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    },
  );

  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() || result.stdout?.trim() || `vercel env add ${name} failed`,
    );
  }
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    fail(
      "STRIPE_SECRET_KEY ontbreekt. Export je live secret key en run opnieuw.",
    );
  }

  if (!secretKey.startsWith("sk_live_") && !secretKey.startsWith("sk_test_")) {
    fail("STRIPE_SECRET_KEY lijkt ongeldig (verwacht sk_live_ of sk_test_).");
  }

  info(`Stripe key: ${maskSecret(secretKey)}`);
  info(`Webhook URL: ${WEBHOOK_URL}`);

  const existing = await listWebhookEndpoints(secretKey);
  let endpoint =
    existing.find((item) => item.url === WEBHOOK_URL && !item.disabled) ?? null;

  if (endpoint) {
    info(`Bestaande webhook endpoint gevonden: ${endpoint.id}`);
  } else {
    const body = {
      url: WEBHOOK_URL,
      connect: "true",
    };
    WEBHOOK_EVENTS.forEach((event, index) => {
      body[`enabled_events[${index}]`] = event;
    });

    endpoint = await stripeRequest(secretKey, "/webhook_endpoints", body);
    info(`Nieuwe webhook endpoint aangemaakt: ${endpoint.id}`);
  }

  const webhookSecret = endpoint.secret;
  if (!webhookSecret?.startsWith("whsec_")) {
    fail(
      "Geen webhook signing secret ontvangen. Maak endpoint opnieuw aan in Stripe Dashboard.",
    );
  }

  info(`Webhook secret: ${maskSecret(webhookSecret)}`);

  if (process.env.VERCEL_SET_SECRETS === "true") {
    info("Vercel Production secrets bijwerken…");
    vercelEnvAdd("STRIPE_SECRET_KEY", secretKey, "production");
    vercelEnvAdd("STRIPE_COACHING_WEBHOOK_SECRET", webhookSecret, "production");
    const feePercent = process.env.STRIPE_APPLICATION_FEE_PERCENT?.trim() || "10";
    vercelEnvAdd("STRIPE_APPLICATION_FEE_PERCENT", feePercent, "production");
    info("Vercel secrets bijgewerkt. Redeploy vereist.");
  } else {
    info("");
    info("Voeg handmatig toe aan Vercel Production (waarden niet opnieuw loggen):");
    info("- STRIPE_SECRET_KEY");
    info("- STRIPE_COACHING_WEBHOOK_SECRET");
    info("");
    info("Of run opnieuw met VERCEL_SET_SECRETS=true");
  }

  info("");
  info("Klaar. Run daarna:");
  info("  npm run verify:stripe-coaching");
  info("  npx vercel --prod --yes");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Onbekende fout");
});
