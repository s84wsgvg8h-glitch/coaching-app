import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;

  if (!stripeClient) {
    stripeClient = new Stripe(key);
  }

  return stripeClient;
}

export function requireStripe(): Stripe {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is niet geconfigureerd.");
  }
  return stripe;
}
