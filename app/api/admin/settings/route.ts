import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/adminApiAuth";
import type { AppSettings, SystemBannerRow } from "@/lib/adminSettings";

export async function GET(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const [settingsResult, bannersResult] = await Promise.all([
      access.admin.from("app_settings").select("*").eq("id", 1).maybeSingle(),
      access.admin
        .from("system_banners")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

    return NextResponse.json({
      settings: (settingsResult.data || null) as AppSettings | null,
      banners: (bannersResult.data || []) as SystemBannerRow[],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Instellingen laden mislukt.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const access = await assertAdmin(request);
    if (!access.admin || !access.userId) {
      return NextResponse.json({ error: access.error }, { status: 403 });
    }

    const body = (await request.json()) as {
      settings?: Partial<AppSettings>;
      banner?: Partial<SystemBannerRow> & { id?: string };
      deleteBannerId?: string;
      createBanner?: Omit<SystemBannerRow, "id" | "created_at" | "created_by">;
    };

    if (body.settings) {
      const { error } = await access.admin
        .from("app_settings")
        .update({
          maintenance_mode: body.settings.maintenance_mode,
          maintenance_message: body.settings.maintenance_message,
          welcome_message: body.settings.welcome_message,
          feature_flags: body.settings.feature_flags,
          email_templates: body.settings.email_templates,
          updated_at: new Date().toISOString(),
          updated_by: access.userId,
        })
        .eq("id", 1);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (body.createBanner) {
      const { error } = await access.admin.from("system_banners").insert({
        message: body.createBanner.message,
        banner_type: body.createBanner.banner_type,
        active: body.createBanner.active,
        starts_at: body.createBanner.starts_at,
        ends_at: body.createBanner.ends_at,
        created_by: access.userId,
      });

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (body.banner?.id) {
      const { id, ...patch } = body.banner;
      const { error } = await access.admin
        .from("system_banners")
        .update(patch)
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    if (body.deleteBannerId) {
      const { error } = await access.admin
        .from("system_banners")
        .delete()
        .eq("id", body.deleteBannerId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Instellingen opslaan mislukt.",
      },
      { status: 500 },
    );
  }
}
