import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type SendEmailBody = {
  to: string;
  subject: string;
  html: string;
  templateKey?: string;
};

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createClient(supabaseUrl, serviceKey);

  const token = authHeader.slice(7);
  const {
    data: { user },
  } = await admin.auth.getUser(token);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as SendEmailBody;
  const resendKey = process.env.RESEND_API_KEY;

  if (!resendKey) {
    console.info("[send-email stub]", {
      to: body.to,
      subject: body.subject,
      templateKey: body.templateKey,
    });
    return NextResponse.json({
      ok: true,
      stub: true,
      message: "RESEND_API_KEY niet gezet — e-mail gelogd, niet verzonden.",
    });
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL || "Coaching App <onboarding@resend.dev>",
      to: body.to,
      subject: body.subject,
      html: body.html,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    return NextResponse.json({ error: text }, { status: 500 });
  }

  const payload = await response.json();
  return NextResponse.json({ ok: true, id: payload.id });
}
