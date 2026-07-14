import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { parseJsonBody, pushSubscriptionSchema } from "@/lib/apiValidation";

export async function POST(request: Request) {
  const auth = await assertAuthenticatedActive(request);
  if (!auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const parsed = await parseJsonBody(request, pushSubscriptionSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const { endpoint, p256dh, auth: pushAuth } = parsed.data;

  const { error } = await auth.supabase.from("push_subscriptions").upsert(
    {
      user_id: auth.user.id,
      endpoint,
      p256dh: p256dh || null,
      auth: pushAuth || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const auth = await assertAuthenticatedActive(request);
  if (!auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const endpoint = searchParams.get("endpoint");

  let query = auth.supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", auth.user.id);
  if (endpoint) query = query.eq("endpoint", endpoint);

  const { error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
