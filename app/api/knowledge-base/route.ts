import { NextRequest, NextResponse } from "next/server";

import { assertAuthenticatedActive } from "@/lib/apiAuth";
import { isAthleteRole, isCoachLikeRole } from "@/lib/authRoles";
import { getCuratedKnowledgeAsync } from "@/lib/knowledgeBrowse";
import { getLocalKnowledge } from "@/lib/knowledgeLocal";
import type { KnowledgeScope } from "@/lib/knowledgeSearch";

function resolveKnowledgeScope(
  role: string | null | undefined,
  scopeParam: string | null,
): KnowledgeScope {
  if (isAthleteRole(role)) {
    return "athlete";
  }

  if (isCoachLikeRole(role)) {
    return scopeParam === "athlete" ? "athlete" : "coach";
  }

  return scopeParam === "athlete" ? "athlete" : "coach";
}

export async function GET(request: NextRequest) {
  const auth = await assertAuthenticatedActive(request);
  if (!auth.user || !auth.supabase) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const scopeParam = request.nextUrl.searchParams.get("scope");
  const scope = resolveKnowledgeScope(profile?.role, scopeParam);
  const curated = await getCuratedKnowledgeAsync(scope);
  const local = scope === "coach" ? getLocalKnowledge() : [];
  const localReferences = local.filter((chunk) => chunk.id.endsWith("-ref"));
  const localExcerpts = local.filter(
    (chunk) => chunk.id.startsWith("ess-local") && !chunk.id.endsWith("-ref"),
  );

  return NextResponse.json({
    scope,
    curated,
    stats: {
      curatedCount: curated.length,
      localCount: local.length,
      localReferenceCount: localReferences.length,
      localExcerptCount: localExcerpts.length,
      hasLocalPdf: local.length > 0,
    },
  });
}
