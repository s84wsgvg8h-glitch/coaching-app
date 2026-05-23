import { APP_KNOWLEDGE, type KnowledgeChunk } from "@/lib/knowledgeBase";

export type KnowledgeBrowseStats = {
  curatedCount: number;
  localCount: number;
  localReferenceCount: number;
  localExcerptCount: number;
  hasLocalPdf: boolean;
};

export function getCuratedKnowledge(): KnowledgeChunk[] {
  return APP_KNOWLEDGE;
}

export function getKnowledgeCategories(chunks: KnowledgeChunk[]) {
  return Array.from(new Set(chunks.map((chunk) => chunk.category))).sort((a, b) =>
    a.localeCompare(b, "nl"),
  );
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterKnowledgeChunks(chunks: KnowledgeChunk[], query: string) {
  const trimmed = query.trim();
  if (!trimmed) return chunks;

  const tokens = normalize(trimmed).split(/\s+/).filter(Boolean);

  return chunks.filter((chunk) => {
    const haystack = normalize(
      `${chunk.title} ${chunk.category} ${chunk.content} ${chunk.keywords.join(" ")}`,
    );
    return tokens.every((token) => haystack.includes(token));
  });
}

export function groupKnowledgeByCategory(chunks: KnowledgeChunk[]) {
  const grouped = new Map<string, KnowledgeChunk[]>();

  for (const chunk of chunks) {
    const existing = grouped.get(chunk.category) || [];
    existing.push(chunk);
    grouped.set(chunk.category, existing);
  }

  return Array.from(grouped.entries())
    .sort(([a], [b]) => a.localeCompare(b, "nl"))
    .map(([category, items]) => ({
      category,
      items: [...items].sort((a, b) => a.title.localeCompare(b.title, "nl")),
    }));
}
