import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { isCronAuthorized } from "@/lib/cronAuth";
import { sendPushToSubscription, type PushPayload } from "@/lib/apnsPush";
import { isIosPushEndpoint } from "@/lib/pushEndpoint";

async function runRemindersCron() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:coach@coaching-app.local";

  const webPushReady = Boolean(serviceKey && vapidPublic && vapidPrivate);
  if (webPushReady) {
    webpush.setVapidDetails(vapidSubject, vapidPublic!, vapidPrivate!);
  }

  if (!serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  const { loadTeamFillScores } = await import("@/lib/athleteFillScoreHistory");

  const { data: coaches } = await admin
    .from("profiles")
    .select("id, role")
    .in("role", ["coach", "admin"]);

  let sent = 0;

  async function deliverPush(
    userId: string,
    payload: PushPayload,
  ): Promise<number> {
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId);

    let delivered = 0;
    for (const sub of subs || []) {
      const ok = await sendPushToSubscription(
        sub,
        payload,
        webPushReady
          ? (subscription, body) => webpush.sendNotification(subscription, body)
          : undefined,
      );
      if (ok) {
        delivered += 1;
        continue;
      }

      if (isIosPushEndpoint(sub.endpoint)) {
        await admin
          .from("push_subscriptions")
          .delete()
          .eq("user_id", userId)
          .eq("endpoint", sub.endpoint);
      }
    }
    return delivered;
  }

  for (const coach of coaches || []) {
    const rows = await loadTeamFillScores(coach.id as string, coach.role === "admin");

    for (const row of rows.filter((r) => r.fillScore < 50)) {
      sent += await deliverPush(coach.id as string, {
        title: "Lage invulscore",
        body: `${row.athleteName}: ${row.fillScore}% invulscore`,
        url: `/athletes/${row.athleteId}`,
      });
    }
  }

  const { data: athletes } = await admin
    .from("profiles")
    .select("id, full_name, preferences")
    .eq("role", "atleet");

  for (const athlete of athletes || []) {
    const prefs =
      athlete.preferences &&
      typeof athlete.preferences === "object" &&
      "coach_settings" in (athlete.preferences as object)
        ? (
            athlete.preferences as {
              coach_settings?: {
                notifications?: { workout_reminders?: boolean };
              };
            }
          ).coach_settings?.notifications
        : null;

    if (prefs?.workout_reminders === false) continue;

    sent += await deliverPush(athlete.id as string, {
      title: "Training invullen",
      body: "Vergeet je check-in en sets vandaag niet.",
      url: "/programs",
    });
  }

  return NextResponse.json({ sent });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runRemindersCron();
}

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runRemindersCron();
}
