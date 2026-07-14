import { NextResponse } from "next/server";
import { assertCoachLike } from "@/lib/coachApiAuth";
import { coachCreateAthleteSchema, parseJsonBody } from "@/lib/apiValidation";

function generateTempPassword() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export async function POST(request: Request) {
  try {
    const auth = await assertCoachLike(request);
    if (auth.error || !auth.db || !auth.userId) {
      return NextResponse.json({ error: auth.error ?? "Geen toegang." }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, coachCreateAthleteSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { fullName, email, geboortedatum, lidnummer, password } = parsed.data;
    const resolvedPassword = password?.trim() || generateTempPassword();
    const adminClient = auth.db;

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password: resolvedPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName.trim() },
      });

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message || "Atleet aanmaken mislukt." },
        { status: 400 },
      );
    }

    const athleteId = created.user.id;

    const { data: coachProfile } = await adminClient
      .from("profiles")
      .select("organization_id")
      .eq("id", auth.userId)
      .maybeSingle();

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: athleteId,
      full_name: fullName.trim(),
      role: "atleet",
      coach_id: auth.userId,
      organization_id: coachProfile?.organization_id ?? null,
      geboortedatum: geboortedatum || null,
      lidnummer: lidnummer?.trim() || null,
      pending_kind: null,
    });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(athleteId);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    return NextResponse.json({
      id: athleteId,
      fullName: fullName.trim(),
      email,
      geboortedatum: geboortedatum || null,
      lidnummer: lidnummer?.trim() || null,
      generatedPassword: password?.trim() ? null : resolvedPassword,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Atleet aanmaken mislukt.",
      },
      { status: 500 },
    );
  }
}
