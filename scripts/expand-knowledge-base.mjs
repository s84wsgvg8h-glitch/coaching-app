/**
 * Expands knowledgeBase.ts chunks to full Dutch coach prose.
 * Run: node scripts/expand-knowledge-base.mjs
 */
import fs from "node:fs";
import path from "node:path";

const filePath = path.join(process.cwd(), "lib/knowledgeBase.ts");
const source = fs.readFileSync(filePath, "utf8");

const categoryMap = {
  Commands: "Opdrachten",
  Features: "Functies",
  Coaching: "Coaching",
  "Referentie (ESS 4e)": "Referentie (ESS 4e)",
  Programming: "Programmeren",
  Navigatie: "Navigatie",
  App: "App",
  Data: "Data",
};

const englishToDutch = [
  [/Programming:/g, "Programmeren:"],
  [/programming:/gi, "programmeren:"],
  [/Aandachtspunt:/g, "Aandachtspunt:"],
  [/Probleem:/g, "Probleem:"],
  [/Technische aanpassing:/g, "Technische aanpassing:"],
  [/Technische beperking:/g, "Technische beperking:"],
  [/Technische syntheses/g, "Technische synthese"],
  [/Praktische takeaways:/g, "Praktische conclusies:"],
  [/Praktische conclusies voor coaching/g, "Praktische conclusies voor coaching"],
  [/Waarom dit werkt biomechanisch:/g, "Waarom biomechanisch:"],
  [/Waarom dit werkt:/g, "Waarom dit werkt:"],
  [/Waarom dit relevant is:/g, "Waarom dit relevant is:"],
  [/hardware \(fysieke mogelijkheden\) en software \(hoe je die mogelijkheden gebruikt tijdens setup\)/g,
    "hardware (fysieke mogelijkheden) en software (hoe je die mogelijkheden in de setup gebruikt)"],
  [/often /g, "vaak "],
  [/seldom /g, "zeldzaam "],
  [/both valid/g, "beide geldig"],
  [/both /g, "beide "],
  [/not always /g, "niet altijd "],
  [/not only /g, "niet alleen "],
  [/not /g, "niet "],
  [/may /g, "kan "],
  [/might /g, "kan "],
  [/should /g, "moet "],
  [/can /g, "kan "],
  [/will /g, "zal "],
  [/when /g, "wanneer "],
  [/if /g, "als "],
  [/because /g, "omdat "],
  [/however /g, "echter "],
  [/therefore /g, "daarom "],
  [/also /g, "ook "],
  [/only /g, "alleen "],
  [/more /g, "meer "],
  [/less /g, "minder "],
  [/high /g, "hoge "],
  [/low /g, "lage "],
  [/heavy /g, "zware "],
  [/light /g, "lichte "],
  [/training /g, "training "],
  [/coach /g, "coach "],
  [/athlete /g, "atleet "],
  [/lifters? /g, "lifters "],
  [/volume /g, "volume "],
  [/intensity /g, "intensiteit "],
  [/failure /g, "failure "],
  [/strength /g, "kracht "],
  [/hypertrophy /g, "hypertrofie "],
  [/periodization /g, "periodisering "],
  [/program design /g, "programma-opbouw "],
  [/programming /g, "programmeren "],
  [/Programming /g, "Programmeren "],
  [/specificity /g, "specificiteit "],
  [/recovery /g, "herstel "],
  [/fatigue /g, "fatigue "],
  [/motor unit/g, "motor unit"],
  [/proximity to failure/g, "nabijheid van failure"],
  [/mechanical tension/g, "mechanische spanning"],
  [/joint stress/g, "gewrichtsbelasting"],
  [/diminishing returns/g, "afnemend rendement"],
  [/center of mass/g, "zwaartepunt"],
  [/moment arm/g, "hefboom"],
  [/forward lean/g, "voorover leunen"],
  [/leg drive/g, "beenkracht"],
  [/bench arch/g, "bench-arch"],
  [/top set/g, "topset"],
  [/back ?off/gi, "back-off"],
  [/deload/g, "deload"],
  [/peaking block/g, "peaking-block"],
  [/meet prep/g, "meetprep"],
  [/autoregulation/g, "autoregulatie"],
  [/straight sets/g, "straight sets"],
  [/junk volume/g, "junk volume"],
  [/task-specific/g, "taak-specifiek"],
  [/work capacity/g, "werkcapaciteit"],
  [/time under tension/g, "time under tension"],
  [/curated AI-kennis chunks/g, "samengestelde AI-kennisblokken"],
  [/curated chunks/g, "samengestelde kennisblokken"],
  [/WhatsApp-achtige/g, "WhatsApp-achtige"],
  [/slash commands/g, "slash-opdrachten"],
  [/direct chat/g, "direct gesprek"],
  [/side panel/g, "zijpaneel"],
  [/bodyweight/g, "lichaamsgewicht"],
  [/personal record/g, "persoonlijk record"],
  [/Statistics/g, "Statistieken"],
  [/Coach workflow/g, "Coach-workflow"],
  [/hardware vs software/g, "hardware versus software"],
  [/Build breakdown/g, "Lichaamsbouw-overzicht"],
  [/Program for the lifter in front of you/g, "Programmeer voor de lifter voor je"],
  [/Repetition continuum/g, "Repetitie-continuüm"],
  [/Evidence-based practice/g, "Evidence-based practice"],
  [/great athlete ≠ great coach/g, "goede atleet ≠ goede coach"],
  [/Newell's constraints/g, "Newells constraints-theorie"],
  [/three disciplines/g, "drie disciplines"],
  [/mind-muscle connection/g, "mind-muscle-verbinding"],
  [/muscle confusion/g, "spierverwarring"],
  [/anabolic window/g, "anabool venster"],
  [/lean body mass/g, "vetvrije massa"],
  [/effectiveness spectrum/g, "effectiviteitsspectrum"],
  [/training principles/g, "trainingsprincipes"],
  [/needs analysis/g, "behoefteanalyse"],
  [/non-periodized/g, "niet-geperiodiseerd"],
  [/undulating periodization/g, "undulerende periodisering"],
  [/linear periodization/g, "lineaire periodisering"],
  [/volume equated/g, "volume-gelijk"],
  [/systematic review/g, "systematische review"],
  [/meta-analysis/g, "meta-analyse"],
  [/meta-regressie/g, "meta-regressie"],
  [/narrative review/g, "narratieve review"],
  [/experienced lifters/g, "ervaren lifters"],
  [/velocity-based training/g, "velocity-based training"],
  [/weightlifting shoes/g, "weightlifting-schoenen"],
  [/extreme conditioning/g, "extreme conditioning"],
  [/Powerlifting Now/g, "Powerlifting Now"],
  [/fatigue stops/g, "fatigue stops"],
  [/hybrid programming/g, "hybride programmeren"],
  [/fitness-fatigue model/g, "fitness-fatigue-model"],
  [/re-sensitization/g, "re-sensitisatie"],
  [/variation multiplier/g, "variant-multiplier"],
];

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9*])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function expandSectionBody(body) {
  let text = body.trim();
  if (!text) return "";

  // Expand semicolon chains into separate sentences
  if (text.includes(";")) {
    const parts = text
      .split(";")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => (/[.!?]$/.test(p) ? p : `${p}.`));
    text = parts.join(" ");
  }

  // Expand arrow chains
  text = text.replace(/\s*→\s*/g, ". Vervolgens: ");
  text = text.replace(/\s*->\s*/g, ". Vervolgens: ");

  // Expand parenthetical lists like (1) foo (2) bar
  text = text.replace(/\(\d+\)\s*/g, (m) => `\n\n${m.trim()} `);

  for (const [pattern, replacement] of englishToDutch) {
    text = text.replace(pattern, replacement);
  }

  const sentences = splitSentences(text);
  if (sentences.length <= 1 && text.length > 180) {
    // Force paragraph break on long single blobs at commas before conjunctions
    return text
      .replace(/,\s+(?=(?:waardoor|zodat|maar|en|of|terwijl|omdat|doordat|zonder|met|bij|via|na|voor|tijdens|tussen|tegen|door|als|wanneer)\b)/gi, ". $1")
      .replace(/\.\s+\./g, ".");
  }

  if (sentences.length >= 2) {
    const mid = Math.ceil(sentences.length / 2);
    return `${sentences.slice(0, mid).join(" ")}\n\n${sentences.slice(mid).join(" ")}`;
  }

  return text;
}

function normalizeSectionName(name) {
  const n = name.trim().toLowerCase();
  if (n.startsWith("probleem")) return "Probleem";
  if (n.startsWith("technische aanpassing") || n.startsWith("technische syntheses") || n.startsWith("technische beperking"))
    return "Technische aanpassing";
  if (n.startsWith("waarom biomechanisch") || n.startsWith("waarom dit werkt biomechanisch"))
    return "Waarom biomechanisch";
  if (n.startsWith("waarom dit werkt") || n.startsWith("waarom dit relevant"))
    return "Waarom dit werkt";
  if (n.startsWith("programming") || n.startsWith("programmeren")) return "Programmeren";
  if (n.startsWith("praktische takeaways") || n.startsWith("praktische conclusies"))
    return "Praktische conclusies";
  if (n.startsWith("aandachtspunt")) return "Aandachtspunt";
  return name.trim();
}

function expandContent(rawContent, category) {
  let content = rawContent.trim();
  for (const [pattern, replacement] of englishToDutch) {
    content = content.replace(pattern, replacement);
  }

  const sectionRegex =
    /(Probleem:|Technische aanpassing:|Technische beperking:|Technische syntheses[^:]*:|Waarom biomechanisch:|Waarom dit werkt biomechanisch:|Waarom dit werkt:|Waarom dit relevant is:|Programming:|Programmeren:|Praktische takeaways:|Praktische conclusies[^:]*:|Aandachtspunt:)/g;

  const parts = content.split(sectionRegex).filter(Boolean);
  if (parts.length <= 1) {
    // App/navigation style paragraph chunks
    const expanded = expandSectionBody(content);
    const isCoaching = category === "Coaching" || category === "Programmeren";
    if (isCoaching) {
      return `**Probleem**\n\n${expanded}\n\n**Waarom dit werkt**\n\nDeze informatie helpt coaches en atleten om sneller de juiste keuzes te maken binnen de app en in de praktijk.\n\n**Programmeren**\n\nGebruik deze kennis als referentie bij vragen, programma-opbouw en communicatie met atleten.\n\n**Aandachtspunt**\n\nControleer altijd of de situatie van de individuele atleet overeenkomt met wat hier beschreven staat.`;
    }
    return `**Waarom dit werkt**\n\n${expanded}\n\n**Gebruik**\n\nZoek deze pagina of functie op wanneer je de beschreven taak wilt uitvoeren. De app slaat wijzigingen automatisch op waar dat van toepassing is.\n\n**Aandachtspunt**\n\nAlleen coaches hebben toegang tot beheerfuncties; atleten zien een beperkter overzicht van hun eigen gegevens.`;
  }

  const sections = [];
  for (let i = 0; i < parts.length; i += 2) {
    const headingRaw = parts[i];
    const bodyRaw = parts[i + 1] ?? "";
    const heading = normalizeSectionName(headingRaw.replace(/:$/, ""));
    const body = expandSectionBody(bodyRaw.replace(/^\s*:/, "").trim());
    if (!body) continue;
    sections.push({ heading, body });
  }

  // Ensure coaching chunks have Programmeren instead of Programming
  return sections
    .map(({ heading, body }) => `**${heading}**\n\n${body}`)
    .join("\n\n");
}

function dutchKeywords(keywords, title, category) {
  const banned = new Set([
    "knowledge base",
    "ai chunks",
    "curated",
    "command",
    "direct chat",
    "slash commands",
    "bodyweight",
    "personal record",
    "recovery",
    "training data",
    "workflow",
    "onboarding",
    "hardware",
    "software",
    "shoulder depression",
    "anterior pelvic tilt",
    "thread the needle",
    "shoulders down",
    "shoulder position",
    "neck pressure",
    "hand pressure",
    "center of mass",
    "moment arm",
    "spine",
    "proximity to failure",
    "mechanical tension",
    "high-threshold",
    "muscular endurance",
    "strength",
    "hypertrophy zone",
    "endurance",
    "effort",
    "programming",
    "needs analysis",
    "exercise selection",
    "rest periods",
    "frequency",
    "linear",
    "undulating",
    "non-periodized",
    "effect size",
    "muscle mass",
    "loading zones",
    "muscular failure",
    "non-failure",
    "multi-joint",
    "single-joint",
    "effectiveness spectrum",
    "training principles",
    "evidence-based practice",
    "survivorship bias",
    "availability heuristic",
    "egocentric bias",
    "constraints theory",
    "organism constraints",
    "task constraints",
    "environmental constraints",
    "mental models",
    "occams razor",
    "second order thinking",
    "communication failure",
    "in person coaching",
    "online coaching",
    "atrofie",
    "hyperplasie",
    "natural",
    "enhanced",
    "body composition",
    "near failure",
    "mind-muscle connection",
    "muscle confusion",
    "anabolic window",
    "shoulder injury",
    "muscular fatigue",
    "overexertion",
    "motion capture",
    "injury prevention",
    "athletic shoes",
    "motion capture",
    "self-preservation",
    "crossfit",
    "systematic review",
    "ground reaction forces",
    "research gaps",
    "block periodization",
    "sweet spot",
    "execution",
    "psychology",
    "percentages",
    "conjugate",
    "misconception",
    "percent drop",
    "pull ups",
    "spreadsheet",
    "excel",
    "RPE anxiety",
    "ten ways",
    "physiological adaptation",
    "neurological adaptation",
    "skill practice",
    "macro cycle",
    "competition specificity",
    "bodybuilding background",
    "bulgarian method",
    "natty",
    "steroids",
    "technique work",
    "case study",
    "more volume",
    "transition",
    "programming change",
    "workload",
    "wave loading",
    "de-load",
    "emerging strategies",
    "maximum sets",
    "minimum sets",
    "long term",
    "part two",
    "session programming",
    "fatigue debt",
    "self limiting variation",
    "one variable",
    "intensity accessories",
    "sandbagging",
    "rest pause",
    "myo reps",
    "drop set",
    "bodybuilding",
    "lifter psychology",
    "art of coaching",
    "mental",
    "amped up",
    "even keeled",
    "meet anxiety",
    "build up sets",
    "post activation potentiation",
    "lifter focus",
    "back off sandbagging",
    "one week at a time",
    "mental fatigue",
    "RPE autoregulation",
    "percentage based",
    "weekly programming",
    "fear of injury",
    "injury anxiety",
    "psychosomatic",
    "pain science",
    "hard work",
    "substitute exercise",
    "day order",
    "session order",
    "recovery between sessions",
    "week structure",
    "recovery percentage",
    "condensed training",
    "spread sessions",
    "fatigue accumulation",
    "CNS recovery",
    "block accumulation",
    "missed session",
    "fatigue curve",
    "performance readiness",
    "two day",
    "three day",
    "four day",
    "full body",
    "upper lower",
    "lift interference",
    "stagger sessions",
    "squat deadlift overlap",
    "bench squat interference",
    "accessory day",
    "athlete scheduling",
    "consistent training days",
    "weekly predictability",
    "resensitization",
    "CNS burnout",
    "block reset",
    "mental break",
    "scheduled break",
    "discovery block",
    "new lifter",
    "extend block",
    "deload timing",
    "six week block",
    "regression week",
    "volume drop",
    "intensity drop",
    "squat deload",
    "bench deload",
    "deadlift deload",
    "accessory deload",
    "rest pause",
    "post deload feedback",
    "over deloaded",
    "under deloaded",
    "taper strategy",
    "bench detraining",
    "recovery capacity",
    "week one feedback",
    "calibration",
    "competition 1RM",
    "variation multiplier",
    "grip definitie",
    "competition bench",
    "competition deadlift",
    "ROM",
    "percentages vs RPE",
    "comp max",
    "weight band",
    "rep capacity",
    "rep dependent",
    "percent per rep",
    "stacking formula",
    "relative intensity",
    "variation experience",
    "time under tension",
    "TUT",
  ]);

  const dutchExtras = {
    Navigatie: ["navigatie", "menu", "pagina", "overzicht"],
    App: ["platform", "coaching-app", "powerlifting"],
    Data: ["gegevens", "administratie", "financieel"],
    Opdrachten: ["chatopdracht", "coach", "zijpaneel"],
    Functies: ["functie", "registratie", "beheer"],
    Coaching: ["coaching", "trainingsleer", "powerlifting"],
    "Referentie (ESS 4e)": ["ESS", "NSCA", "leerboek", "referentie"],
    Programmeren: ["programmeren", "schema", "percentages", "varianten"],
  };

  const cleaned = keywords
    .map((k) => k.trim())
    .filter((k) => k && !banned.has(k.toLowerCase()))
    .map((k) => {
      for (const [pattern, replacement] of englishToDutch) {
        if (typeof replacement === "string" && pattern instanceof RegExp && pattern.test(k)) {
          k = k.replace(pattern, replacement);
        }
      }
      return k.replace(/\s+/g, " ").trim();
    });

  const extras = dutchExtras[category] ?? [];
  const merged = [...new Set([...cleaned, ...extras, ...title.toLowerCase().split(/\s+/).slice(0, 3)])]
    .filter(Boolean)
    .slice(0, 15);

  while (merged.length < 8) {
    merged.push(category.toLowerCase(), "coaching", "powerlifting", "kennisbank", "atleet", "programma", "training", "data"[merged.length % 4]);
  }

  return merged.slice(0, 15);
}

function parseChunks(source) {
  const arrayStart = source.indexOf("export const APP_KNOWLEDGE");
  const body = source.slice(arrayStart);
  const chunks = [];
  const chunkRegex = /\{\s*id:\s*"([^"]+)",[\s\S]*?title:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)",[\s\S]*?content:\s*"([\s\S]*?)",\s*keywords:\s*\[([\s\S]*?)\],\s*\}/g;
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
  const category = categoryMap[chunk.category] ?? chunk.category;
  const content = expandContent(chunk.content, category);
  const keywords = dutchKeywords(chunk.keywords, chunk.title, category);
  const keywordLines = keywords.map((k) => `      "${k.replace(/"/g, '\\"')}",`).join("\n");

  return `  {
    id: "${chunk.id}",
    title: "${chunk.title.replace(/"/g, '\\"')}",
    category: "${category.replace(/"/g, '\\"')}",
    content:
      "${escapeTsString(content)}",
    keywords: [
${keywordLines}
    ],
  }`;
}

const chunks = parseChunks(source);
if (chunks.length !== 100) {
  console.error(`Expected 100 chunks, found ${chunks.length}`);
  process.exit(1);
}

const header = `export type KnowledgeChunk = {
  id: string;
  title: string;
  category: string;
  content: string;
  keywords: string[];
};

export const APP_KNOWLEDGE: KnowledgeChunk[] = [
`;

const footer = `];
`;

const output = header + chunks.map(formatChunk).join(",\n") + footer;
fs.writeFileSync(filePath, output, "utf8");
console.log(`Rewrote ${chunks.length} chunks -> ${filePath}`);
