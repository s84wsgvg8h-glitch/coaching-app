import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";
import { getAppUrl, getAuthRedirectUrls } from "@/lib/appUrl";
import { adminConfigureAuthSchema, parseJsonBody } from "@/lib/apiValidation";

const PROJECT_REF = "dgryvmvfwyixscidmzrc";

export async function POST(request: Request) {
  const access = await assertAdmin(request);
  if (!access.admin) {
    return NextResponse.json({ error: access.error }, { status: 403 });
  }

  const token = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_ACCESS_TOKEN ontbreekt in Vercel. Maak een token op supabase.com/dashboard/account/tokens en voeg toe als env var.",
      },
      { status: 503 },
    );
  }

  const parsed = await parseJsonBody(request, adminConfigureAuthSchema);
  if (!parsed.success) {
    return parsed.response;
  }

  const appUrl = (parsed.data.siteUrl?.trim() || getAppUrl()).replace(/\/$/, "");
  const redirectUrls = getAuthRedirectUrls().map((url) =>
    url.replace("https://limitlesscoaching.app", appUrl).replace(
      "https://coaching-app-tan.vercel.app",
      appUrl,
    ),
  );

  const uniqueRedirects = Array.from(
    new Set([
      ...redirectUrls,
      `${appUrl}/**`,
      `${appUrl}/login`,
      `${appUrl}/signup`,
      `${appUrl}/dashboard`,
      `${appUrl}/reset-password`,
      `${appUrl}/reset-password/update`,
    ]),
  );

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        site_url: appUrl,
        uri_allow_list: uniqueRedirects.join(","),
      }),
    },
  );

  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: `Supabase API fout (${res.status}): ${text}` },
      { status: 502 },
    );
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(text) as Record<string, unknown>;
  } catch {
    payload = { raw: text };
  }

  return NextResponse.json({
    ok: true,
    site_url: appUrl,
    redirect_urls: uniqueRedirects,
    supabase: payload,
  });
}
