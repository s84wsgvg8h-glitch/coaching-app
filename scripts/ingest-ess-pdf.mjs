/**
 * Local PDF ingestion for NSCA Essentials of Strength Training and Conditioning (4th ed).
 *
 * Copyright: do NOT commit the generated JSON — it may contain extracted textbook text.
 * Place your licensed PDF locally and run:
 *
 *   npm run ingest:ess
 *   npm run ingest:ess -- /path/to/EssentialsofStrengthTrainingandConditioning4thEdition.pdf
 *
 * Or set ESS_PDF_PATH in the environment.
 *
 * Output: data/knowledge-local.json (gitignored)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { PDFParse } from "pdf-parse";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUTPUT_PATH = path.join(ROOT, "data", "knowledge-local.json");

const DEFAULT_PDF = path.join(
  process.env.HOME || "",
  "Downloads",
  "EssentialsofStrengthTrainingandConditioning4thEdition.pdf",
);

const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, " ").trim();
}

function tokenizeForKeywords(text) {
  return [
    ...new Set(
      text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .split(/[^a-z0-9/]+/)
        .filter((token) => token.length > 2),
    ),
  ].slice(0, 12);
}

function chunkText(text, chunkSize = CHUNK_SIZE, overlap = CHUNK_OVERLAP) {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const chunks = [];
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = Math.max(0, end - overlap);
  }

  return chunks;
}

function parseChapterStarts(fullText) {
  const pattern = /CHAPTER\s+(\d+)\s+([^\n]+?)\s+(\d+)/gi;
  const matches = [];

  for (const match of fullText.matchAll(pattern)) {
    const chapterNumber = Number.parseInt(match[1], 10);
    const title = normalizeWhitespace(match[2]);
    if (chapterNumber >= 1 && chapterNumber <= 24 && title.length > 3) {
      matches.push({
        chapterNumber,
        title,
        index: match.index ?? 0,
      });
    }
  }

  const byChapter = new Map();
  for (const entry of matches) {
    if (!byChapter.has(entry.chapterNumber)) {
      byChapter.set(entry.chapterNumber, entry);
    }
  }

  return [...byChapter.values()].sort((a, b) => a.chapterNumber - b.chapterNumber);
}

function outlineToReferenceChunks(outline) {
  if (!outline?.length) return [];

  const chapterItems = outline.filter((item) => /^Chapter \d+:/i.test(item.title || ""));

  return chapterItems.map((item) => {
    const title = item.title.replace(/^Chapter\s+\d+:\s*/i, "").trim();
    const chapterMatch = item.title.match(/Chapter\s+(\d+)/i);
    const chapterNumber = chapterMatch ? Number.parseInt(chapterMatch[1], 10) : 0;

    return {
      id: `ess-local-ch${chapterNumber}-ref`,
      title: `ESS 4e — Hoofdstuk ${chapterNumber}: ${title}`,
      category: "Referentie (ESS 4e)",
      content: `NSCA Essentials of Strength Training and Conditioning (4e), hoofdstuk ${chapterNumber}: ${title}. Raadpleeg je lokale exemplaar voor volledige inhoud; deze chunk is een structuurreferentie uit de PDF-outline.`,
      keywords: [
        "ess",
        "nsca",
        "essentials",
        "strength training",
        "conditioning",
        `chapter ${chapterNumber}`,
        `hoofdstuk ${chapterNumber}`,
        ...tokenizeForKeywords(title),
      ],
    };
  });
}

async function main() {
  const pdfPath = process.argv[2] || process.env.ESS_PDF_PATH || DEFAULT_PDF;

  if (!fs.existsSync(pdfPath)) {
    console.error(`PDF niet gevonden: ${pdfPath}`);
    console.error("Geef het pad mee: npm run ingest:ess -- /pad/naar/boek.pdf");
    process.exit(1);
  }

  const stat = fs.statSync(pdfPath);
  console.log(`PDF: ${pdfPath}`);
  console.log(`Grootte: ${(stat.size / (1024 * 1024)).toFixed(1)} MB`);

  const parser = new PDFParse({ data: fs.readFileSync(pdfPath) });
  const info = await parser.getInfo();
  console.log(`Pagina's: ${info.total}`);

  const textResult = await parser.getText();
  const fullText = textResult.text || "";
  const chapterStarts = parseChapterStarts(fullText);

  console.log(`Hoofdstuk-markers gevonden: ${chapterStarts.length}`);

  const chunks = [...outlineToReferenceChunks(info.outline)];

  for (let i = 0; i < chapterStarts.length; i += 1) {
    const current = chapterStarts[i];
    const next = chapterStarts[i + 1];
    const start = current.index;
    const end = next?.index ?? fullText.length;
    const chapterText = fullText.slice(start, end);

    const textChunks = chunkText(chapterText);
    textChunks.forEach((content, partIndex) => {
      chunks.push({
        id: `ess-local-ch${current.chapterNumber}-p${partIndex + 1}`,
        title: `ESS 4e — Hoofdstuk ${current.chapterNumber}: ${current.title} (deel ${partIndex + 1})`,
        category: "ESS 4e (lokaal)",
        content,
        keywords: [
          "ess",
          "nsca",
          "essentials",
          `chapter ${current.chapterNumber}`,
          `hoofdstuk ${current.chapterNumber}`,
          ...tokenizeForKeywords(current.title),
        ],
      });
    });
  }

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(chunks, null, 2));

  console.log(`Geschreven: ${OUTPUT_PATH}`);
  console.log(`Chunks: ${chunks.length} (${outlineToReferenceChunks(info.outline).length} referentie + ${chunks.length - outlineToReferenceChunks(info.outline).length} tekst)`);

  await parser.destroy();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
