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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    const email = body.email?.trim();
    const password = body.password?.trim();
    const fullName = body.fullName?.trim();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, wachtwoord en naam zijn verplicht." },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Wachtwoord moet minimaal 6 tekens zijn." },
        { status: 400 },
      );
    }

    const supabase = getSupabaseForRequest(request);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Niet ingelogd." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Alleen admins mogen coach-accounts aanmaken." },
        { status: 403 },
      );
    }

    const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRole || !url) {
      return NextResponse.json(
        { error: "Service role key ontbreekt op de server." },
        { status: 500 },
      );
    }

    const adminClient = createClient(url, serviceRole, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Account aanmaken mislukt." },
        { status: 400 },
      );
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ full_name: fullName, role: "coach" })
      .eq("id", created.user.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      id: created.user.id,
      email,
      fullName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Coach aanmaken mislukt.",
      },
      { status: 500 },
    );
  }
}
