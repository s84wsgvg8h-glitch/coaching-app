import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabaseForRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase is niet geconfigureerd.");
  }

  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

  return createClient(url, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
  });
}

async function assertAdmin(request: Request) {
  const supabase = getSupabaseForRequest(request);
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { error: "Niet ingelogd.", admin: null as ReturnType<typeof createClient> | null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { error: "Alleen admins.", admin: null };
  }

  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceRole || !url) {
    return { error: "Service role key ontbreekt.", admin: null };
  }

  const adminClient = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return { error: null, admin: adminClient };
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { userId?: string };
    const userId = body.userId?.trim();

    if (!userId) {
      return NextResponse.json({ error: "userId is verplicht." }, { status: 400 });
    }

    const access = await assertAdmin(request);

    if (!access.admin) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const {
      data: { user: adminUser },
    } = await getSupabaseForRequest(request).auth.getUser();

    if (adminUser?.id === userId) {
      return NextResponse.json(
        { error: "Je kunt je eigen admin-account niet verwijderen." },
        { status: 400 },
      );
    }

    const { error } = await access.admin.auth.admin.deleteUser(userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Gebruiker verwijderen mislukt.",
      },
      { status: 500 },
    );
  }
}
