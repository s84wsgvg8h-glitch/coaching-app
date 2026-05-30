/**
 * Applies hand-written overrides and writes lib/knowledgeBase.ts
 * Run: node scripts/apply-knowledge-overrides.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const kbPath = path.join(root, "lib/knowledgeBase.ts");
const overridePaths = [
  path.join(root, "scripts/knowledge-base-overrides.json"),
  path.join(root, "scripts/knowledge-base-overrides.partial.json"),
].filter((p) => fs.existsSync(p));

function parseChunks(source) {
  const arrayStart = source.indexOf("export const APP_KNOWLEDGE");
  const body = source.slice(arrayStart);
  const chunks = [];
  const chunkRegex =
    /\{\s*id:\s*"([^"]+)",[\s\S]*?title:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)",[\s\S]*?content:\s*"([\s\S]*?)",\s*keywords:\s*\[([\s\S]*?)\],\s*\}/g;
  let match;
  while ((match = chunkRegex.exec(body))) {
    const [, id, title, category, contentRaw, keywordsRaw] = match;
    const content = contentRaw.replace(/\\n/g, "\n").replace(/\\"/g, '"');
    const keywords = [...keywordsRaw.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    chunks.push({ id, title, category, content, keywords });
  }
  return chunks;
}

function escapeTsString(value) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\r?\n/g, "\\n");
}

function formatChunk(chunk) {
  const keywordLines = chunk.keywords
    .map((k) => `      "${k.replace(/"/g, '\\"')}",`)
    .join("\n");
  return `  {
    id: "${chunk.id}",
    title: "${chunk.title.replace(/"/g, '\\"')}",
    category: "${chunk.category.replace(/"/g, '\\"')}",
    content:
      "${escapeTsString(chunk.content)}",
    keywords: [
${keywordLines}
    ],
  }`;
}

const overrides = {};
for (const overridePath of overridePaths) {
  Object.assign(overrides, JSON.parse(fs.readFileSync(overridePath, "utf8")));
}

const source = fs.readFileSync(kbPath, "utf8");
const chunks = parseChunks(source).map((chunk) => ({
  ...chunk,
  ...(overrides[chunk.id] ?? {}),
}));

const header = `export type KnowledgeChunk = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
};

export const APP_KNOWLEDGE: KnowledgeChunk[] = [
`;

const output = header + chunks.map(formatChunk).join(",\n") + "];\n";
fs.writeFileSync(kbPath, output, "utf8");
console.log(`Applied ${Object.keys(overrides).length} overrides to ${chunks.length} chunks`);
