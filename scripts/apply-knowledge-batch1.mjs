/**
 * Rewrites BATCH 1 chunks in lib/knowledgeBase.ts (kennisbank-page … volume-deload-block-length).
 * Uses generated overrides; leaves later chunks untouched.
 *
 * Run: node scripts/generate-knowledge-overrides.mjs && node scripts/apply-knowledge-batch1.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const kbPath = path.join(root, "lib/knowledgeBase.ts");
const overridesPath = path.join(root, "scripts/knowledge-base-overrides.json");
const BATCH_LAST_ID = "volume-deload-block-length";

const FILLER_PATTERNS = [
  /\n\nDit beperkt effectieve coachingbeslissingen zolang het patroon niet wordt herkend\./g,
  /\n\nDeze mechanismen verklaren waarom de technische aanpassing onder (?:belasting|load) het gewenste effect geeft\./g,
];

const DEEP_DUTCH_REPLACEMENTS = [
  [/Weekly volume waves/gi, "Wekelijkse volumegolven"],
  [/planned deload/gi, "geplande deload"],
  [/peaked/gi, "piekt"],
  [/\bgrind\b/gi, "doorgrindt"],
  [/maxed/gi, "maximaal is"],
  [/Planned deloads enable stable/gi, "Geplande deloads houden stabiel"],
  [/week 1 lighter/gi, "week 1 lichter"],
  [/Adaptation model/gi, "Adaptatiemodel"],
  [/assume roughly linear strength rise then plateau/gi, "neem globaal lineaire krachtstijging gevolgd door plateau aan"],
  [/track over multiple blocks when athlete peaks/gi, "volg meerdere blocks wanneer de atleet piekt"],
  [/feels beat up/gi, "zich slap voelt"],
  [/after peak week/gi, "na piekweek"],
  [/not fixed 4-week blocks for billing/gi, "niet automatisch vaste vierweeksblocks voor administratie"],
  [/Deload framework/gi, "Deload-kader"],
  [/prior week/gi, "vorige week"],
  [/prior weight/gi, "vorig gewicht"],
  [/detrain risk/gi, "detrain-risico"],
  [/Post-deload feedback/gi, "Feedback na deload"],
  [/fresh = good/gi, "fris = goed"],
  [/Lagging\/explosive loss/gi, "Traagheid of verlies van explosiviteit"],
  [/adjust vol\/int deload/gi, "pas volume- en intensiteitsdeload aan"],
  [/Resets fatigue without losing all fitness/gi, "Reset fatigue zonder alle fitheid kwijt te raken"],
  [/stealing freshness/gi, "frisheid stelen"],
  [/not magic PRs/gi, "geen magische PR's"],
  [/athlete check-in drive deload timing/gi, "atleet-check-ins sturen deload-timing"],
  [/same protocol weekly is extreme version/gi, "identiek weekprotocol is een extreme variant"],
  [/this system allows more flexibility with deload anchor/gi, "dit systeem laat meer flexibiliteit toe met deload als ankerpunt"],
  [/primarily total sets per lift\/week/gi, "primair totaal sets per lift per week"],
  [/Sets week-to-week en block-to-block fairly stable/gi, "Sets week-op-week en block-op-block redelijk stabiel"],
  [/Manipulate intensity more, volume less/gi, "Manipuleer vooral intensiteit, verander volume minder"],
  [/on paper same reps but different fatigue/gi, "op papier dezelfde reps maar andere fatigue"],
  [/sets metric avoids gokwerk/gi, "sets-metriek voorkomt gokwerk"],
  [/Consistent set count = fewer variables to interpret progress/gi, "Consistent set-aantal = minder variabelen bij progressie-interpreteren"],
  [/Skill decay/gi, "Skill-decay"],
  [/Rep tweaks small block-to-block/gi, "Rep-aanpassingen klein block-op-block"],
  [/not wild swings/gi, "geen wilde swings"],
  [/Andere coaches use tonnage\/wave/gi, "Andere coaches gebruiken tonnage of wave"],
  [/valid in their system/gi, "geldig in hun systeem"],
  [/Link theory chunk/gi, "Koppel aan chunk"],
  [/both valid/gi, "beide geldig"],
  [/Technique work/gi, "techniekwerk"],
  [/competition-SBD/gi, "wedstrijd-SBD"],
  [/competition SBD/gi, "wedstrijd-SBD"],
  [/skill under zware load/gi, "techniek onder zware belasting"],
  [/check-in drive/gi, "check-ins sturen"],
  [/copy-paste frameworks/gi, "copy-paste frameworks"],
  [/recovery voordat/gi, "herstel voordat"],
];

function deepDutchify(content) {
  let out = content;
  for (const [pattern, replacement] of DEEP_DUTCH_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

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
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");
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

function cleanContent(content) {
  let out = deepDutchify(content);
  for (const pattern of FILLER_PATTERNS) {
    out = out.replace(pattern, "");
  }
  return out.replace(/\n{3,}/g, "\n\n").trim();
}

if (!fs.existsSync(overridesPath)) {
  console.error("Missing overrides. Run: node scripts/generate-knowledge-overrides.mjs");
  process.exit(1);
}

const overrides = JSON.parse(fs.readFileSync(overridesPath, "utf8"));
const source = fs.readFileSync(kbPath, "utf8");
const beforeLines = source.split("\n").length;
const chunks = parseChunks(source);

const batchEndIndex = chunks.findIndex((c) => c.id === BATCH_LAST_ID);
if (batchEndIndex === -1) {
  console.error(`Batch end id not found: ${BATCH_LAST_ID}`);
  process.exit(1);
}

let rewritten = 0;
const merged = chunks.map((chunk, index) => {
  if (index > batchEndIndex) return chunk;
  const override = overrides[chunk.id];
  if (!override) {
    console.warn(`No override for batch chunk: ${chunk.id}`);
    return chunk;
  }
  rewritten++;
  return {
    id: chunk.id,
    title: override.title ?? chunk.title,
    category: override.category ?? chunk.category,
    content: cleanContent(override.content ?? chunk.content),
    keywords: override.keywords ?? chunk.keywords,
  };
});

const header = `export type KnowledgeChunk = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
};

export const APP_KNOWLEDGE: KnowledgeChunk[] = [
`;

const output = header + merged.map(formatChunk).join(",\n") + "];\n";
fs.writeFileSync(kbPath, output, "utf8");

const afterLines = output.split("\n").length;
console.log(
  JSON.stringify(
    {
      firstId: merged[0].id,
      lastId: merged[batchEndIndex].id,
      rewritten,
      lineCountBefore: beforeLines,
      lineCountAfter: afterLines,
      lineDelta: afterLines - beforeLines,
      untouchedFrom: merged[batchEndIndex + 1]?.id,
    },
    null,
    2,
  ),
);
