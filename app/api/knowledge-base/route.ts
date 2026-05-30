import { NextRequest, NextResponse } from "next/server";

import { getCuratedKnowledgeAsync } from "@/lib/knowledgeBrowse";
import { getLocalKnowledge } from "@/lib/knowledgeLocal";
import type { KnowledgeScope } from "@/lib/knowledgeSearch";

export async function GET(request: NextRequest) {
  const scopeParam = request.nextUrl.searchParams.get("scope");
  const scope: KnowledgeScope = scopeParam === "athlete" ? "athlete" : "coach";
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
