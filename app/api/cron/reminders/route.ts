import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { isCronAuthorized } from "@/lib/cronAuth";

export async function POST(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || "mailto:coach@coaching-app.local";

  if (!serviceKey || !vapidPublic || !vapidPrivate) {
    return NextResponse.json({ error: "Push not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublic, vapidPrivate);
  const admin = createClient(supabaseUrl, serviceKey);

  const { loadTeamFillScores } = await import("@/lib/athleteFillScoreHistory");
  const { syncLowComplianceTodos } = await import("@/lib/coachTodoSync");

  const { data: coaches } = await admin
    .from("profiles")
    .select("id, role")
    .in("role", ["coach", "admin"]);

  let sent = 0;

  for (const coach of coaches || []) {
    const rows = await loadTeamFillScores(coach.id as string, coach.role === "admin");
    await syncLowComplianceTodos(coach.id as string, rows, 50);

    for (const row of rows.filter((r) => r.fillScore < 50)) {
      const { data: subs } = await admin
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", coach.id);

      for (const sub of subs || []) {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify({
              title: "Lage invulscore",
              body: `${row.athleteName}: ${row.fillScore}% invulscore`,
              url: `/athletes/${row.athleteId}`,
            }),
          );
          sent += 1;
        } catch {
          // ignore invalid subscriptions
        }
      }
    }
  }

  // Workout reminders for athletes with open past days (simplified: push if subscribed)
  const { data: athletes } = await admin
    .from("profiles")
    .select("id, full_name, preferences")
    .eq("role", "atleet");

  for (const athlete of athletes || []) {
    const prefs =
      athlete.preferences &&
      typeof athlete.preferences === "object" &&
      "coach_settings" in (athlete.preferences as object)
        ? (athlete.preferences as { coach_settings?: { notifications?: { workout_reminders?: boolean } } })
            .coach_settings?.notifications
        : null;

    if (prefs?.workout_reminders === false) continue;

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", athlete.id);

    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: "Training invullen",
            body: "Vergeet je check-in en sets vandaag niet.",
            url: "/programs",
          }),
        );
        sent += 1;
      } catch {
        // ignore
      }
    }
  }

  return NextResponse.json({ sent });
}
