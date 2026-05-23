import { NextResponse } from "next/server";

import { getCuratedKnowledge } from "@/lib/knowledgeBrowse";
import { getLocalKnowledge } from "@/lib/knowledgeLocal";

export async function GET() {
  const curated = getCuratedKnowledge();
  const local = getLocalKnowledge();
  const localReferences = local.filter((chunk) => chunk.id.endsWith("-ref"));
  const localExcerpts = local.filter(
    (chunk) => chunk.id.startsWith("ess-local") && !chunk.id.endsWith("-ref"),
  );

  return NextResponse.json({
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
