import { NextResponse } from "next/server";
import { APP_UNIVERSAL_LINK_HOST, IOS_BUNDLE_ID } from "@/lib/universalLinks";

/**
 * Apple App Site Association for Universal Links.
 * Requires APPLE_TEAM_ID in Vercel env (10-char Apple Developer Team ID).
 */
export async function GET() {
  const teamId = process.env.APPLE_TEAM_ID?.trim();
  if (!teamId) {
    return NextResponse.json(
      {
        error: "APPLE_TEAM_ID not configured",
        hint: "Set APPLE_TEAM_ID in Vercel to enable Universal Links",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appIDs: [`${teamId}.${IOS_BUNDLE_ID}`],
          components: [
            {
              "/": "/*",
              comment: "All Limitless Coaching paths open in the native app when installed",
            },
          ],
        },
      ],
    },
    webcredentials: {
      apps: [`${teamId}.${IOS_BUNDLE_ID}`],
    },
  };

  return NextResponse.json(body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
