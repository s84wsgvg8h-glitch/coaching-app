import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";
import { adminSendEmailSchema, parseJsonBody } from "@/lib/apiValidation";

export async function POST(request: Request) {
  const access = await assertAdmin(request);
  if (!access.admin) {
    return NextResponse.json(
      { error: access.error ?? "Geen toegang." },
      { status: access.error === "Niet ingelogd." ? 401 : 403 },
    );
  }

  const parsed = await parseJsonBody(request, adminSendEmailSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const body = parsed.data;
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
