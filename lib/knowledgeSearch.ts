import { APP_KNOWLEDGE, type KnowledgeChunk } from "@/lib/knowledgeBase";
import { ATHLETE_KNOWLEDGE } from "@/lib/athleteKnowledgeBase";
import { getLocalKnowledge } from "@/lib/knowledgeLocal";

export type KnowledgeScope = "coach" | "athlete";

function allKnowledge(scope: KnowledgeScope = "coach"): KnowledgeChunk[] {
  if (scope === "athlete") {
    return ATHLETE_KNOWLEDGE;
  }

  return [...APP_KNOWLEDGE, ...getLocalKnowledge()];
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9/]+/)
    .filter((token) => token.length > 1);
}

function scoreChunk(chunk: KnowledgeChunk, queryTokens: string[], rawQuery: string) {
  const normalizedQuery = rawQuery.toLowerCase().trim();
  let score = 0;

  for (const keyword of chunk.keywords) {
    const normalizedKeyword = keyword.toLowerCase();
    if (normalizedQuery.includes(normalizedKeyword)) {
      score += normalizedKeyword.startsWith("/") ? 12 : 8;
    }
  }

  const chunkText = `${chunk.title} ${chunk.content} ${chunk.category}`.toLowerCase();

  for (const token of queryTokens) {
    if (chunkText.includes(token)) {
      score += 2;
    }
  }

  if (chunkText.includes(normalizedQuery) && normalizedQuery.length > 3) {
    score += 6;
  }

  // Prefer curated app/ESS summaries over raw local PDF excerpts when scores tie.
  if (!chunk.id.startsWith("ess-local")) {
    score += 3;
  } else if (chunk.id.endsWith("-ref")) {
    score += 2;
  }

  return score;
}

export function searchKnowledge(
  query: string,
  limit = 5,
  scope: KnowledgeScope = "coach",
): KnowledgeChunk[] {
  const queryTokens = tokenize(query);

  return allKnowledge(scope)
    .map((chunk) => ({
      chunk,
      score: scoreChunk(chunk, queryTokens, query),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.chunk);
}

export function getKnowledgeScopeLabel(scope: KnowledgeScope) {
  return scope === "athlete" ? "Atleten-kennisbank" : "Coach-kennisbank";
}

export function formatKnowledgeForPrompt(chunks: KnowledgeChunk[]) {
  if (chunks.length === 0) {
    return "Geen specifieke kennisbank-resultaten voor deze vraag.";
  }

  return chunks
    .map(
      (chunk, index) =>
        `${index + 1}. [${chunk.category}] ${chunk.title}\n${chunk.content}`,
    )
    .join("\n\n");
}

export type CoachSnapshot = {
  totalIncome?: number | null;
  payingAthleteCount?: number;
  pendingCount?: number;
  athletes?: Array<{
    name: string;
    href: string;
    lidnummer?: string | null;
    betalingPrijs?: number | null;
    betalingDag?: number | null;
  }>;
};

export function formatCoachSnapshotForPrompt(snapshot?: CoachSnapshot) {
  if (!snapshot) return "Geen live coach-data meegestuurd.";

  const lines = [
    snapshot.totalIncome !== null && snapshot.totalIncome !== undefined
      ? `- Totale inkomsten (som atleetprijzen): €${snapshot.totalIncome.toFixed(2)}`
      : null,
    snapshot.payingAthleteCount !== undefined
      ? `- Betalende atleten: ${snapshot.payingAthleteCount}`
      : null,
    snapshot.pendingCount !== undefined
      ? `- Open aanmeldingen: ${snapshot.pendingCount}`
      : null,
  ].filter(Boolean);

  const athleteLines = (snapshot.athletes || []).map((athlete) => {
    const paymentParts = [
      athlete.betalingPrijs !== null && athlete.betalingPrijs !== undefined
        ? `€${athlete.betalingPrijs}/maand`
        : null,
      athlete.betalingDag ? `betaaldag ${athlete.betalingDag}` : null,
    ].filter(Boolean);

    return `- ${athlete.name}${athlete.lidnummer ? ` (lidnr ${athlete.lidnummer})` : ""}${
      paymentParts.length ? `: ${paymentParts.join(", ")}` : ""
    } → ${athlete.href}`;
  });

  return [
    "Live coach-data:",
    ...lines,
    athleteLines.length ? "Atleten:" : null,
    ...athleteLines,
  ]
    .filter(Boolean)
    .join("\n");
}
