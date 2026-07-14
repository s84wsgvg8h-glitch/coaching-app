import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";
import {
  adminDeleteUserSchema,
  parseJsonBody,
} from "@/lib/apiValidation";

export async function DELETE(request: Request) {
  try {
    const parsed = await parseJsonBody(request, adminDeleteUserSchema);
    if (!parsed.success) {
      return parsed.response;
    }

    const access = await assertAdmin(request);

    if (!access.admin || !access.userId) {
      return NextResponse.json({ error: access.error ?? "Geen toegang." }, { status: 403 });
    }

    const { userId } = parsed.data;

    if (access.userId === userId) {
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
