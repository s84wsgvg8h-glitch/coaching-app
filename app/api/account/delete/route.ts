import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { accountDeleteSchema, parseJsonBody } from "@/lib/apiValidation";

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRole) {
    return null;
  }

  return createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function POST(request: Request) {
  try {
    const parsed = await parseJsonBody(request, accountDeleteSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const auth = await assertAuthenticatedActive(request);
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error ?? "Niet ingelogd." }, { status: auth.status ?? 401 });
    }

    const admin = getServiceClient();
    if (!admin) {
      return NextResponse.json(
        { error: "Account verwijderen is tijdelijk niet beschikbaar." },
        { status: 503 },
      );
    }

    const userId = auth.user.id;
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Account verwijderen mislukt.",
      },
      { status: 500 },
    );
  }
}
