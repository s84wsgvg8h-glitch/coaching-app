#!/usr/bin/env node

const BASE = process.env.APP_URL?.replace(/\/$/, "") || "https://limitlesscoaching.app";

const checks = [];

function record(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "ok" : "fail"} - ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  const unauthCheckout = await fetch(`${BASE}/api/stripe/create-checkout-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan: "coaching_35" }),
  });
  record(
    "checkout zonder login → 401",
    unauthCheckout.status === 401,
    String(unauthCheckout.status),
  );

  const invalidPlanCheckout = await fetch(
    `${BASE}/api/stripe/create-checkout-session`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "coaching_999" }),
    },
  );
  record(
    "checkout ongeldige plan (zonder login) → 401",
    invalidPlanCheckout.status === 401,
    String(invalidPlanCheckout.status),
  );

  const merchCheckout = await fetch(`${BASE}/api/merch/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchItemId: "00000000-0000-0000-0000-000000000000",
      size: "M",
    }),
  });
  record(
    "merch checkout zonder login → 401",
    merchCheckout.status === 401,
    String(merchCheckout.status),
  );

  const subStatus = await fetch(`${BASE}/api/stripe/subscription-status`);
  record(
    "subscription-status zonder login → 401",
    subStatus.status === 401,
    String(subStatus.status),
  );

  const home = await fetch(`${BASE}/`, { method: "GET" });
  record("homepage bereikbaar", home.status === 200, String(home.status));

  const failed = checks.filter((check) => !check.ok);
  if (failed.length > 0) {
    process.exit(1);
  }

  console.log("verify-stripe-coaching passed");
}

main().catch((error) => {
  console.error("verify-stripe-coaching failed:", error.message);
  process.exit(1);
});
