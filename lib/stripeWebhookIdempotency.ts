import type { SupabaseClient } from "@supabase/supabase-js";

export async function claimStripeWebhookEvent(
  service: SupabaseClient,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const { error } = await service.from("stripe_webhook_events").insert({
    id: eventId,
    event_type: eventType,
  });

  if (!error) {
    return true;
  }

  if (error.code === "23505") {
    return false;
  }

  throw new Error(error.message);
}

export async function releaseStripeWebhookEventClaim(
  service: SupabaseClient,
  eventId: string,
): Promise<void> {
  await service.from("stripe_webhook_events").delete().eq("id", eventId);
}
