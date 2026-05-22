import fs from "fs";
import path from "path";

import type { KnowledgeChunk } from "@/lib/knowledgeBase";

const LOCAL_KNOWLEDGE_PATH = path.join(process.cwd(), "data", "knowledge-local.json");

let cachedLocalKnowledge: KnowledgeChunk[] | null = null;

export function getLocalKnowledge(): KnowledgeChunk[] {
  if (cachedLocalKnowledge) {
    return cachedLocalKnowledge;
  }

  try {
    if (!fs.existsSync(LOCAL_KNOWLEDGE_PATH)) {
      cachedLocalKnowledge = [];
      return cachedLocalKnowledge;
    }

    const raw = fs.readFileSync(LOCAL_KNOWLEDGE_PATH, "utf8");
    const parsed = JSON.parse(raw) as KnowledgeChunk[];

    cachedLocalKnowledge = Array.isArray(parsed) ? parsed : [];
    return cachedLocalKnowledge;
  } catch {
    cachedLocalKnowledge = [];
    return cachedLocalKnowledge;
  }
}

export function clearLocalKnowledgeCache() {
  cachedLocalKnowledge = null;
}
