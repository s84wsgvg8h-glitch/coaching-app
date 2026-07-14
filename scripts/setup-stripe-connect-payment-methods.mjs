#!/usr/bin/env node
/**
 * Enable iDEAL, Bancontact, SEPA Direct Debit and Link for all coach Connect accounts.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_live_... node scripts/setup-stripe-connect-payment-methods.mjs
 *
 * Optional:
 *   SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=...  — sync all coaches from DB
 *   CONNECT_ACCOUNT_ID=acct_...                                  — single account only
 *
 * Platform Dashboard (one-time, cannot be fully replaced by API):
 *   Settings → Connect → Payment methods → Connected accounts
 *   Set iDEAL, Bancontact, SEPA Direct Debit, Link → "On by default"
 */

import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import process from "node:process";

const PAYMENT_METHOD_KEYS = ["ideal", "bancontact", "sepa_debit", "link"];

const CAPABILITIES = {
  card_payments: { requested: true },
  transfers: { requested: true },
  sepa_debit_payments: { requested: true },
  ideal_payments: { requested: true },
  bancontact_payments: { requested: true },
};

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function info(message) {
  console.log(message);
}

async function loadCoachConnectAccountIds() {
  const single = process.env.CONNECT_ACCOUNT_ID?.trim();
  if (single) return [single];

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    fail(
      "Geef CONNECT_ACCOUNT_ID of SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL mee.",
    );
  }

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, stripe_connect_account_id")
    .not("stripe_connect_account_id", "is", null);

  if (error) {
    fail(`Supabase query mislukt: ${error.message}`);
  }

  const ids = new Set();
  for (const row of data ?? []) {
    const accountId = row.stripe_connect_account_id?.trim();
    if (accountId) ids.add(accountId);
  }

  return [...ids];
}

async function requestCapabilities(stripe, accountId) {
  await stripe.accounts.update(accountId, { capabilities: CAPABILITIES });
}

async function enablePaymentMethods(stripe, accountId) {
  const requestOptions = { stripeAccount: accountId };
  const configs = await stripe.paymentMethodConfigurations.list(
    { limit: 20 },
    requestOptions,
  );

  const configuration =
    configs.data.find((entry) => entry.is_default) ?? configs.data[0] ?? null;

  if (!configuration) {
    return {
      configurationId: null,
      updated: [],
      skipped: [],
      errors: ["Geen payment method configuration gevonden"],
    };
  }

  const updated = [];
  const skipped = [];
  const errors = [];

  for (const methodKey of PAYMENT_METHOD_KEYS) {
    const methodState = configuration[methodKey];
    if (methodState?.display_preference?.value === "on") {
      skipped.push(methodKey);
      continue;
    }

    try {
      await stripe.paymentMethodConfigurations.update(
        configuration.id,
        {
          [methodKey]: {
            display_preference: { preference: "on" },
          },
        },
        requestOptions,
      );
      updated.push(methodKey);
    } catch (error) {
      errors.push(
        `${methodKey}: ${error instanceof Error ? error.message : "onbekende fout"}`,
      );
    }
  }

  return {
    configurationId: configuration.id,
    updated,
    skipped,
    errors,
  };
}

async function main() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!secretKey) {
    fail("STRIPE_SECRET_KEY ontbreekt.");
  }

  const stripe = new Stripe(secretKey);
  const accountIds = await loadCoachConnectAccountIds();

  if (accountIds.length === 0) {
    info("Geen connected accounts gevonden.");
    return;
  }

  info(`Verwerken van ${accountIds.length} connected account(s)…`);
  info("");
  info(
    "Let op: zet in Stripe Dashboard ook platform-defaults op On by default:",
  );
  info("Settings → Connect → Payment methods → Connected accounts");
  info("");

  for (const accountId of accountIds) {
    info(`— ${accountId}`);

    try {
      await requestCapabilities(stripe, accountId);
      info("  capabilities: aangevraagd (card, transfers, ideal, bancontact, sepa)");
    } catch (error) {
      info(
        `  capabilities: mislukt (${error instanceof Error ? error.message : "onbekend"})`,
      );
    }

    const pmResult = await enablePaymentMethods(stripe, accountId);
    info(`  config: ${pmResult.configurationId ?? "—"}`);
    if (pmResult.updated.length) {
      info(`  ingeschakeld: ${pmResult.updated.join(", ")}`);
    }
    if (pmResult.skipped.length) {
      info(`  al actief: ${pmResult.skipped.join(", ")}`);
    }
    for (const err of pmResult.errors) {
      info(`  waarschuwing: ${err}`);
    }

    try {
      const account = await stripe.accounts.retrieve(accountId);
      const caps = account.capabilities ?? {};
      info(
        `  status: ideal=${caps.ideal_payments?.status ?? "—"}, bancontact=${caps.bancontact_payments?.status ?? "—"}, sepa=${caps.sepa_debit_payments?.status ?? "—"}`,
      );
    } catch {
      info("  status: kon capabilities niet ophalen");
    }

    info("");
  }

  info("Klaar. Test checkout opnieuw als atleet (nieuwe sessie aanmaken).");
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Onbekende fout");
});
