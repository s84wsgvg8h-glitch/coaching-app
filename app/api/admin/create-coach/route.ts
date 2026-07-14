import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";
import {
  adminCreateCoachSchema,
  parseJsonBody,
} from "@/lib/apiValidation";

export async function POST(request: Request) {
  try {
    const auth = await assertAdmin(request);
    if (auth.error || !auth.admin) {
      return NextResponse.json({ error: auth.error ?? "Geen toegang." }, { status: 403 });
    }

    const parsed = await parseJsonBody(request, adminCreateCoachSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const { email, password, fullName } = parsed.data;
    const adminClient = auth.admin;

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

    const { error: profileError } = await adminClient.from("profiles").upsert({
      id: created.user.id,
      full_name: fullName,
      role: "coach",
      pending_kind: null,
    });

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
