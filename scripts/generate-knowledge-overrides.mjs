/**
 * Generates scripts/knowledge-base-overrides.json from lib/knowledgeBase.ts
 * Run: node scripts/generate-knowledge-overrides.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const kbPath = path.join(root, "lib/knowledgeBase.ts");
const outPath = path.join(root, "scripts/knowledge-base-overrides.json");

function parseChunks(source) {
  const arrayStart = source.indexOf("export const APP_KNOWLEDGE");
  const body = source.slice(arrayStart);
  const chunks = [];
  const chunkRegex =
    /\{\s*id:\s*"([^"]+)",[\s\S]*?title:\s*"([^"]+)",[\s\S]*?category:\s*"([^"]+)",[\s\S]*?content:\s*"([\s\S]*?)",\s*keywords:\s*\[([\s\S]*?)\],\s*\}/g;
  let match;
  while ((match = chunkRegex.exec(body))) {
    const content = match[4].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    const keywords = [...match[5].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
    chunks.push({ id: match[1], title: match[2], category: match[3], content, keywords });
  }
  return chunks;
}

const CATEGORY_MAP = {
  Commands: "Opdrachten",
  Features: "Functies",
  Programming: "Programmeren",
};

const ID_CATEGORY = {
  "kennisbank-page": "Navigatie",
  "app-overzicht": "App",
  dashboard: "Navigatie",
  "atleten-beheren": "Navigatie",
  "atleten-profielen": "Navigatie",
  "betaling-atleet": "Data",
  programmas: "Navigatie",
  chat: "Navigatie",
  "blessures-profiel": "Functies",
  wedstrijdkalender: "Navigatie",
  statistics: "Navigatie",
  "raw-data-page": "Navigatie",
  "ess-overzicht": "Referentie (ESS 4e)",
  "ess-hoofdstukken-science": "Referentie (ESS 4e)",
  "ess-hoofdstukken-athlete": "Referentie (ESS 4e)",
  "ess-hoofdstukken-testing": "Referentie (ESS 4e)",
  "ess-hoofdstukken-programming": "Referentie (ESS 4e)",
  "bench-arch-overzicht": "Techniek",
  "bench-arch-hardware": "Techniek",
  "bench-arch-oefeningen-bekken": "Techniek",
  "bench-arch-schouders-nek": "Techniek",
  "bench-arch-software-volgorde": "Techniek",
  "bench-arch-techniek-details": "Techniek",
  "bench-arch-fouten": "Techniek",
  "squat-varianten-overzicht": "Techniek",
  "squat-com-en-knie": "Techniek",
  "squat-gewrichtsmomenten": "Techniek",
  "squat-coach-keuze": "Techniek",
  "bench-shoulder-injury-fatigue-review": "Blessures",
  "bench-shoulder-biomechanics-assessment": "Blessures",
  "squat-weightlifting-shoes-biomechanics": "Onderzoek",
  "squat-footwear-coach-decision": "Techniek",
  "extreme-conditioning-squat-fatigue-hooper": "Onderzoek",
  "extreme-conditioning-coach-programming": "Coaching",
  "squat-footwear-review-pangan-2021": "Onderzoek",
  "squat-footwear-review-coach-gaps": "Onderzoek",
  "variation-percentages-squat-referentie": "Programmeren",
  "variation-percentages-bench-referentie": "Programmeren",
  "variation-percentages-deadlift-referentie": "Programmeren",
  "variation-stacking-rpe-percentages": "Programmeren",
  "variation-tempo-tut-aanpassingen": "Programmeren",
};

const RESEARCH_IDS = new Set([
  "rt-dosage-definitions",
  "rt-dosage-dose-response",
  "rt-dosage-variable-importance",
  "rt-dosage-practical-examples",
  "rt-dosage-coach-application",
  "rt-dosage-limitations-trained",
  "rt-frequency-main-findings",
  "rt-frequency-moderators",
  "rt-frequency-coach-application",
  "rt-set-quantification-direct-indirect",
  "rt-volume-dose-response-hypertrophy-strength",
  "rt-frequency-dose-response-fractional",
  "rt-volume-frequency-coach-synthesis",
  "sbd-biomech-intensity-fatigue-overview",
  "sbd-intensity-kinetic-kinematic-changes",
  "sbd-fatigue-kinetic-kinematic-changes",
  "periodization-meta-overview",
  "periodization-np-vs-periodized",
  "periodization-lp-vs-up",
  "schoenfeld-2017-load-meta-overview",
  "schoenfeld-2017-strength-outcomes",
  "schoenfeld-2017-hypertrophy-outcomes",
  "failure-vs-nonfailure-meta-overview",
  "failure-vs-nonfailure-subgroups",
]);

function resolveCategory(id, category) {
  if (ID_CATEGORY[id]) return ID_CATEGORY[id];
  if (RESEARCH_IDS.has(id)) return "Onderzoek";
  if (id.startsWith("cmd-")) return "Opdrachten";
  if (CATEGORY_MAP[category]) return CATEGORY_MAP[category];
  return category;
}

const TITLE_IMPROVEMENTS = {
  statistics: "Statistieken",
  "cmd-tools": "/tools opdracht",
  "cmd-program": "/program opdracht",
  "cmd-bw": "/bw opdracht",
  "cmd-externals": "/externals opdracht",
  "cmd-volume": "/volume opdracht",
  "cmd-intensity": "/intensity opdracht",
  "cmd-max": "/max opdracht",
  "cmd-data": "/data opdracht",
  "cmd-injuries": "/injuries opdracht",
  "coaching-workflow": "Coach-workflow",
  "body-structure-coaching-model": "Programmeer voor de atleet voor je",
  "rt-dosage-definitions": "RT-dosis, dosering en dosage — definities",
  "rep-continuum-model": "Repetitie-continuüm (klassiek model)",
  "rep-failure-fibers": "Failure, vezeltypes en minimum load",
  "rep-programming": "Rep ranges in programmering",
  "junk-volume-enhanced-natural": "Junk volume, enhanced lifters en adaptatiebehoud",
  "volume-deload-block-length": "Deload-timing en workload — geplande volumeverlaging",
  "intensity-framework-relative-absolute": "Intensiteit — absoluut versus relatief (RPE en percentages)",
  "lifter-psychology-focus-stress-motivation": "Focus, stress en motivatie — RPE en weekprogrammering",
  "lifter-psychology-habits-enjoyment": "Gewoonten en perceptie — blessureangst en hard werken",
  "weekly-split-day-order-fatigue-debt": "Weekindeling — dagvolgorde en fatigue debt",
  "fitness-fatigue-rescheduling-intensity": "Fitness-fatigue model — blockopbouw en herschikken",
  "weekly-frequency-structures-2-3-4-days": "Weekfrequentie — optimale 2/3/4-dag structuren",
  "deload-rationale-fatigue-resensitization": "Deload-rationale — fatigue reset en re-sensitization",
  "deload-rationale-mental-life-proactive": "Deload-rationale — mentale pauze, leven en proactief plannen",
  "deload-block-timing-structure": "Deload-timing — blocklengte en time-to-peak",
  "deload-volume-intensity-template": "Deload-template — volume én intensiteit per lift",
  "deload-individualization-feedback": "Deload-individualisatie — week 1 feedback en taper",
};

function improveTitle(id, title) {
  return TITLE_IMPROVEMENTS[id] ?? title;
}

function capitalizeFirst(text) {
  const t = text.trim();
  if (!t) return t;
  return t[0].toUpperCase() + t.slice(1);
}

function sentenceExpand(text) {
  let t = text.trim();
  if (!t) return "";

  t = t.replace(/\bi\.p\.v\./gi, "__IPV__");
  // Split on semicolons that separate independent clauses
  t = t.replace(/;\s+/g, ". ");
  // Numbered lists: (1) ... (2) ...
  t = t.replace(/\(\s*(\d+)\s*\)\s*/g, "\n\n($1) ");
  // Arrow chains
  t = t.replace(/\s*→\s*/g, " leidt tot ");
  t = t.replace(/(\d),(\d)\.\s+(?=[A-Za-zÀ-ÿ])/g, "$1,$2; ");
  // Ensure space after periods
  t = t.replace(/\.(?=[A-Za-zÀ-ÿ(])/g, ". ");
  t = t.replace(/\.\s*\./g, ".");
  t = t.replace(/__IPV__/g, "i.p.v.");
  if (t.length && !/[.!?]$/.test(t.trim())) t += ".";
  return capitalizeFirst(t.trim());
}

function expandParagraph(text, minSentences = 2) {
  const expanded = sentenceExpand(text);
  const parts = expanded.split(/\n\n+/).map((p) => capitalizeFirst(p.trim())).filter(Boolean);
  if (parts.length >= minSentences) return parts.join("\n\n");
  const sentences = expanded.split(/(?<=[.!?])\s+/).filter(Boolean).map(capitalizeFirst);
  if (sentences.length <= 1) return expanded;
  const mid = Math.ceil(sentences.length / 2);
  return `${sentences.slice(0, mid).join(" ")}\n\n${sentences.slice(mid).join(" ")}`;
}

const SECTION_PATTERNS = [];

function stripSectionPrefix(text) {
  return text
    .replace(/^Probleem:\s*/i, "")
    .replace(/^Technische (?:aanpassing|beperking):\s*/i, "")
    .replace(/^Waarom (?:dit werkt(?: biomechanisch)?|biomechanisch|dit relevant is):\s*/i, "")
    .replace(/^Programming:\s*/i, "")
    .replace(/^Aandachtspunt:\s*/i, "")
    .trim();
}

function enrichSection(key, text, id) {
  let t = stripSectionPrefix(text);
  if (key === "technisch" && !t.includes("\n\n")) {
    const sentences = t.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length >= 4) {
      const mid = Math.ceil(sentences.length / 2);
      t = `${sentences.slice(0, mid).join(" ")}\n\n${sentences.slice(mid).join(" ")}`;
    }
  }
  return t;
}

const INLINE_LABELS = [
  { key: "probleem", pattern: /Probleem:\s*/i },
  { key: "technisch", pattern: /Technische (?:aanpassing|beperking):\s*/i },
  {
    key: "waarom",
    pattern: /Waarom (?:dit werkt(?: biomechanisch)?|biomechanisch|dit relevant is):\s*/i,
  },
  { key: "programmeren", pattern: /Programming:\s*/i },
  { key: "aandacht", pattern: /Aandachtspunt:\s*/i },
];

function parseLegacySections(content) {
  if (content.includes("**Probleem**") && content.includes("**Technische aanpassing**")) {
    return parseMarkdownSections(content);
  }

  const text = content
    .replace(/\*\*Probleem\*\*/gi, "Probleem: ")
    .replace(/\*\*Technische aanpassing\*\*/gi, "Technische aanpassing: ")
    .replace(/\*\*Waarom biomechanisch\*\*/gi, "Waarom biomechanisch: ")
    .replace(/\*\*Waarom dit werkt\*\*/gi, "Waarom dit werkt: ")
    .replace(/\*\*Programmeren\*\*/gi, "Programming: ")
    .replace(/\*\*Aandachtspunt\*\*/gi, "Aandachtspunt: ");

  const markers = [];
  for (const label of INLINE_LABELS) {
    const re = new RegExp(label.pattern.source, "gi");
    let m;
    while ((m = re.exec(text))) {
      markers.push({ key: label.key, index: m.index, len: m[0].length });
    }
  }
  if (markers.length < 2) return null;

  markers.sort((a, b) => a.index - b.index);
  const unique = [];
  for (const m of markers) {
    if (!unique.some((u) => u.key === m.key)) unique.push(m);
  }
  if (unique.length < 2) return null;

  const sections = {};
  for (let i = 0; i < unique.length; i++) {
    const start = unique[i].index + unique[i].len;
    const end = i + 1 < unique.length ? unique[i + 1].index : text.length;
    sections[unique[i].key] = text.slice(start, end).trim();
  }
  return sections;
}

function normalizeInlineSectionHeaders(content) {
  return content
    .replace(
      /(\*\*Probleem\*\*[\s\S]*?)\.\s*Technische aanpassing\s*[—–-]?\s*/gi,
      "$1.\n\n**Technische aanpassing**\n\n",
    )
    .replace(
      /(\*\*Probleem\*\*[\s\S]*?)\.\s*Technische aanpassing\s*\(/gi,
      "$1.\n\n**Technische aanpassing**\n\n(",
    )
    .replace(/(\*\*Probleem\*\*[\s\S]*?)\n\nTechnische aanpassing\s*[—–-]\s*/gi, "$1\n\n**Technische aanpassing**\n\n")
    .replace(/\nTechnische aanpassing\s*[—–-]\s*/gi, "\n\n**Technische aanpassing**\n\n");
}

function parseMarkdownSections(content) {
  content = normalizeInlineSectionHeaders(content);
  if (!content.includes("**Probleem**")) return null;
  const headerDefs = [
    ["probleem", ["**Probleem**"]],
    ["technisch", ["**Technische aanpassing**"]],
    ["waarom", ["**Waarom biomechanisch**", "**Waarom dit werkt**"]],
    ["programmeren", ["**Programmeren**"]],
    ["aandacht", ["**Aandachtspunt**"]],
  ];
  const allLabels = headerDefs.flatMap(([, labels]) => labels);
  const found = [];
  for (const [key, labels] of headerDefs) {
    for (const label of labels) {
      const idx = content.indexOf(label);
      if (idx !== -1) {
        found.push({ key, index: idx, len: label.length });
        break;
      }
    }
  }
  if (found.length < 2) return null;
  found.sort((a, b) => a.index - b.index);

  const sections = {};
  for (let i = 0; i < found.length; i++) {
    const start = found[i].index + found[i].len;
    let end = content.length;
    for (const label of allLabels) {
      const oidx = content.indexOf(label, start);
      if (oidx !== -1 && oidx < end) end = oidx;
    }
    sections[found[i].key] = content.slice(start, end).trim();
  }
  return sections;
}

function isNavOrApp(id) {
  return (
    [
      "kennisbank-page",
      "app-overzicht",
      "dashboard",
      "atleten-beheren",
      "atleten-profielen",
      "betaling-atleet",
      "programmas",
      "chat",
      "statistics",
      "raw-data-page",
      "wedstrijdkalender",
      "coaching-workflow",
    ].includes(id) || id.startsWith("cmd-")
  );
}

function navProblem(id, title) {
  const problems = {
    "kennisbank-page":
      "Coaches willen weten welke kennis de dashboard-AI heeft en of antwoorden op betrouwbare, gecureerde bronnen steunen. Zonder overzicht is het moeilijk te controleren of een coaching-antwoord uit de kennisbank komt of uit algemene modelkennis.",
    "app-overzicht":
      "Nieuwe gebruikers begrijpen niet direct hoe programma's, chat, data en profielbeheer samenhangen in één platform.",
    dashboard:
      "Coaches missen een centraal startpunt voor praktijkoverzicht, omzet en snelle toegang tot de AI-assistent.",
    "atleten-beheren":
      "Nieuwe atleten blijven hangen in pending status totdat een coach actief hun account accepteert.",
    "atleten-profielen":
      "Administratieve, medische en financiële atleetgegevens zijn verspreid over meerdere pagina's als je niet weet waar profielbeheer staat.",
    "betaling-atleet":
      "Maandelijkse omzet is moeilijk te overzien zonder per atleet ingestelde prijs en betaaldag.",
    programmas:
      "De kern van trainingsdata — blocks, gelogde sets en check-ins — moet vindbaar zijn voor zowel coach als atleet.",
    chat:
      "Coaching en data-analyse moeten naadloos samengaan zonder tussen pagina's te wisselen.",
    statistics:
      "Trends over meerdere atleten of variabelen zijn niet zichtbaar vanuit één individuele chat.",
    "raw-data-page":
      "Diepgaande analyse van individuele logs vereist soms meer ruimte dan het chat-zijpaneel biedt.",
    "coaching-workflow":
      "Beginnende coaches weten niet in welke volgorde onboarding, profiel, programma en monitoring horen.",
    "wedstrijdkalender":
      "Meetdatums moeten zichtbaar zijn voor macrocyclus-planning en profielkoppeling.",
    rpe:
      "Intensiteit plannen via RPE of RIR vereist een betrouwbare omrekening naar load-percentages.",
  };
  if (problems[id]) return problems[id];
  if (id.startsWith("cmd-")) {
    return `Tijdens een coach-atleet gesprek moet je snel ${title.replace(" opdracht", "")}-data kunnen openen zonder de chat te verlaten.`;
  }
  return `Je moet snel kunnen werken met ${title.toLowerCase()} binnen de app, zonder trial-and-error.`;
}

function buildStructuredContent(id, content) {
  content = normalizeInlineSectionHeaders(content);
  const legacy = parseLegacySections(content);

  if (legacy) {
    const waaromHeader = legacy.waarom?.toLowerCase().includes("biomech")
      ? "**Waarom biomechanisch**"
      : isNavOrApp(id)
        ? null
        : legacy.waarom?.toLowerCase().includes("relevant")
          ? "**Waarom dit werkt**"
          : "**Waarom biomechanisch**";

    const parts = [];
    if (legacy.probleem)
      parts.push(`**Probleem**\n\n${expandParagraph(enrichSection("probleem", legacy.probleem, id))}`);
    if (legacy.technisch)
      parts.push(
        `**Technische aanpassing**\n\n${expandParagraph(enrichSection("technisch", legacy.technisch, id), 3)}`,
      );
    if (legacy.waarom && waaromHeader)
      parts.push(
        `${waaromHeader}\n\n${expandParagraph(enrichSection("waarom", legacy.waarom, id))}`,
      );
    if (legacy.programmeren)
      parts.push(
        `**Programmeren**\n\n${expandParagraph(enrichSection("programmeren", legacy.programmeren, id))}`,
      );
    if (legacy.aandacht)
      parts.push(`**Aandachtspunt**\n\n${expandParagraph(stripSectionPrefix(legacy.aandacht))}`);
    return parts.join("\n\n");
  }

  // Plain prose (nav/app/reference) — wrap in appropriate sections
  if (isNavOrApp(id)) {
    const title = improveTitle(id, id);
    let programmeren =
      "Gebruik deze functie structureel in je coach-workflow wanneer het past bij onboarding, monitoring of programma-aanpassingen.";
    let aandacht =
      "Alleen coaches hebben toegang tot de meeste opdrachten en beheerfuncties. Atleten zien een beperktere interface gericht op hun eigen programma en check-ins.";

    if (id === "coaching-workflow") {
      programmeren =
        "Volg de volgorde: accepteer op /athletes, vul profiel en betaling in op /athlete-profiles, wijs een programma toe op /programs, monitor via chat-opdrachten (/bw, /volume, /externals, /intensity), en registreer blessures via /injuries of het profiel.";
    }
    if (id.startsWith("cmd-")) {
      programmeren =
        "Typ de opdracht in een direct coach-atleet chat. Het zijpaneel opent automatisch met de relevante grafiek of data. Combineer meerdere opdrachten in één gesprek voor complete monitoring.";
      aandacht = "Slash-opdrachten werken alleen voor coaches in directe chat met een atleet, niet in groepschats.";
    }
    if (id === "kennisbank-page") {
      programmeren =
        "Raadpleeg de kennisbank vóór je grote programma-wijzigingen doorvoert, om te controleren welke coaching-principes de AI kent. In development voegt npm run ingest:ess optioneel ESS PDF-context toe.";
    }

    return (
      `**Probleem**\n\n${expandParagraph(navProblem(id, title))}` +
      `\n\n**Technische aanpassing**\n\n${expandParagraph(content, 3)}` +
      `\n\n**Programmeren**\n\n${expandParagraph(programmeren)}` +
      `\n\n**Aandachtspunt**\n\n${expandParagraph(aandacht)}`
    );
  }

  if (id.startsWith("ess-hoofdstukken") || id === "ess-overzicht") {
    return `**Probleem**\n\n${expandParagraph("Coaching-vragen vereisen soms diepere wetenschappelijke context dan de curated chunks alleen bieden.")}` +
      `\n\n**Technische aanpassing**\n\n${expandParagraph(content, 4)}` +
      `\n\n**Waarom dit werkt**\n\n${expandParagraph("ESS 4e is het standaard NSCA-leerboek voor strength & conditioning. De hoofdstukindex helpt gericht te zoeken; volledige boektekst is lokaal beschikbaar via npm run ingest:ess in development.")}` +
      `\n\n**Programmeren**\n\n${expandParagraph("Verwijs atleten niet naar ruwe hoofdstuknummers, maar vertaal ESS-principes naar concrete SBD-programmering in de app.")}` +
      `\n\n**Aandachtspunt**\n\n${expandParagraph("Committed chunks zijn samenvattingen. De volledige ESS PDF staat niet in git en voegt in development optioneel extra AI-context toe.")}`;
  }

  // Fallback: wrap entire content
  return `**Probleem**\n\n${expandParagraph(content.split(".")[0] || content)}` +
    `\n\n**Technische aanpassing**\n\n${expandParagraph(content, 4)}` +
    `\n\n**Waarom biomechanisch**\n\n${expandParagraph("Training variabelen werken via mechanische spanning, neurale adaptatie en recovery. Individuele respons verschilt per atleet, blockdoel en trainingsstatus.")}` +
    `\n\n**Programmeren**\n\n${expandParagraph("Pas dit principe toe binnen blocks met stabiele set-aantallen en bewuste intensiteitsmanipulatie. Monitor via /volume, /intensity en /externals.")}` +
    `\n\n**Aandachtspunt**\n\n${expandParagraph("Geen enkel principe is universeel optimaal. Individualiseer op basis van atleetdata, blessurehistorie en meetdatum.")}`;
}

const KEYWORD_NL = {
  dashboard: "dashboard",
  chat: "chat",
  program: "programma",
  programs: "programma's",
  athlete: "atleet",
  athletes: "atleten",
  coach: "coach",
  coaching: "coaching",
  powerlifting: "powerlifting",
  squat: "squat",
  bench: "bench",
  deadlift: "deadlift",
  volume: "volume",
  intensity: "intensiteit",
  fatigue: "fatigue",
  recovery: "herstel",
  injury: "blessure",
  injuries: "blessures",
  navigation: "navigatie",
  statistics: "statistieken",
  workflow: "workflow",
  onboarding: "onboarding",
  monitoring: "monitoring",
  periodization: "periodisering",
  hypertrophy: "hypertrofie",
  strength: "kracht",
  beginner: "beginner",
  advanced: "gevorderd",
  trained: "getraind",
  untrained: "ongetraind",
  deload: "deload",
  peaking: "peaking",
  meet: "wedstrijd",
  "meet prep": "meetprep",
  autoregulation: "autoregulatie",
  programming: "programmeren",
  biomechanics: "biomechanica",
  technique: "techniek",
  accessories: "accessories",
  variation: "variant",
  variations: "varianten",
  spreadsheet: "spreadsheet",
  excel: "Excel",
};

function dutchifyKeyword(kw) {
  const lower = kw.toLowerCase().trim();
  if (KEYWORD_NL[lower]) return KEYWORD_NL[lower];
  // Keep acronyms
  if (/^(rpe|rir|amrap|sbd|1rm|tm|vbt|apre|ess|nsca|doms|lbm|ws|as|dup|lp|up|np|au|grf|rom|com|ssb|rdl|jscr)$/i.test(kw)) {
    if (/^1rm$/i.test(kw)) return "1RM";
    if (/^tm$/i.test(kw)) return "TM";
    return kw.toUpperCase() === kw ? kw : kw;
  }
  // Remove pure English paths/commands but keep Dutch context
  if (kw.startsWith("/")) return kw;
  // Simple word replacements
  let out = lower
    .replace(/\bthe\b/g, "")
    .replace(/\band\b/g, "en")
    .replace(/\bvs\b/g, "versus")
    .replace(/\bwith\b/g, "met")
    .replace(/\bfor\b/g, "voor")
    .replace(/\bper\b/g, "per")
    .replace(/\bweek\b/g, "week")
    .replace(/\bday\b/g, "dag")
    .replace(/\bsets\b/g, "sets")
    .replace(/\breps\b/g, "reps")
    .replace(/\bload\b/g, "load")
    .replace(/\bfailure\b/g, "failure")
    .replace(/\bmeta-analysis\b/g, "meta-analyse")
    .replace(/\bmeta analysis\b/g, "meta-analyse")
    .replace(/\bsystematic review\b/g, "systematische review")
    .replace(/\boverview\b/g, "overzicht")
    .replace(/\bframework\b/g, "framework")
    .replace(/\bguide\b/g, "gids")
    .replace(/\btips\b/g, "tips")
    .replace(/\berrors\b/g, "fouten")
    .replace(/\bmistakes\b/g, "fouten")
    .replace(/\bcommand\b/g, "opdracht")
    .replace(/\bpage\b/g, "pagina")
    .replace(/\bprofile\b/g, "profiel")
    .replace(/\bpayment\b/g, "betaling")
    .replace(/\bdata\b/g, "data")
    .replace(/\bgraph\b/g, "grafiek")
    .replace(/\bchart\b/g, "grafiek")
    .replace(/\bsearch\b/g, "zoeken")
    .replace(/\bfilter\b/g, "filter")
    .replace(/\bknowledge base\b/g, "kennisbank")
    .replace(/\bslash commands\b/g, "slash-opdrachten")
    .replace(/\bdirect chat\b/g, "directe chat")
    .replace(/\bside panel\b/g, "zijpaneel")
    .replace(/\bbodyweight\b/g, "lichaamsgewicht")
    .replace(/\bcheck-in\b/g, "check-in")
    .replace(/\btonnage\b/g, "tonnage")
    .replace(/\bpersonal record\b/g, "persoonlijk record")
    .replace(/\brep max\b/g, "rep max")
    .replace(/\bestimated max\b/g, "geschat max")
    .replace(/\brep capacity\b/g, "rep capacity")
    .replace(/\bmotor unit\b/g, "motor unit")
    .replace(/\bmotor units\b/g, "motor units")
    .replace(/\bmechanical tension\b/g, "mechanische spanning")
    .replace(/\bproximity to failure\b/g, "nabij failure")
    .replace(/\bsticking point\b/g, "sticking point")
    .replace(/\bsticking region\b/g, "sticking region")
    .replace(/\bbar path\b/g, "bar path")
    .replace(/\bbar velocity\b/g, "bar velocity")
    .replace(/\bbar speed\b/g, "bar snelheid")
    .replace(/\bjoint stress\b/g, "gewrichtsbelasting")
    .replace(/\bovertraining\b/g, "overtraining")
    .replace(/\boverreaching\b/g, "overreaching")
    .replace(/\bdetraining\b/g, "detraining")
    .replace(/\bmacrocycle\b/g, "macrocyclus")
    .replace(/\bmesocycle\b/g, "mesocyclus")
    .replace(/\bmicrocycle\b/g, "microcyclus")
    .replace(/\bneeds analysis\b/g, "needs analysis")
    .replace(/\bevidence-based practice\b/g, "evidence-based practice")
    .replace(/\bweak point\b/g, "zwakke plek")
    .replace(/\bweak points\b/g, "zwakke plekken")
    .replace(/\bplateau\b/g, "plateau")
    .replace(/\bstall\b/g, "stagnatie")
    .replace(/\bcompliance\b/g, "compliance")
    .replace(/\badherence\b/g, "adherence")
    .replace(/\bself-limiting\b/g, "zelflimiterend")
    .replace(/\btop set\b/g, "topset")
    .replace(/\btop sets\b/g, "topsets")
    .replace(/\bback off\b/g, "back-off")
    .replace(/\bbackoff\b/g, "back-off")
    .replace(/\bstraight sets\b/g, "straight sets")
    .replace(/\bfatigue stops\b/g, "fatigue stops")
    .replace(/\bprimary day\b/g, "primary day")
    .replace(/\bsecondary day\b/g, "secondary day")
    .replace(/\btertiary day\b/g, "tertiary day")
    .replace(/\bweightlifting shoes\b/g, "weightlifting schoenen")
    .replace(/\braised heel\b/g, "verhoogde hak")
    .replace(/\bforward lean\b/g, "forward lean")
    .replace(/\bdepth\b/g, "diepte")
    .replace(/\bstance\b/g, "stance")
    .replace(/\bgrip width\b/g, "gripbreedte")
    .replace(/\blockout\b/g, "lockout")
    .replace(/\bsetup\b/g, "setup")
    .replace(/\bleg drive\b/g, "leg drive")
    .replace(/\barch\b/g, "arch")
    .replace(/\bmobility\b/g, "mobiliteit")
    .replace(/\bfoam roller\b/g, "foamroller")
    .replace(/\bhip thrust\b/g, "hip thrust")
    .replace(/\bhip thrusts\b/g, "hip thrusts")
    .replace(/\bdeficit deadlift\b/g, "deficit deadlift")
    .replace(/\brack pull\b/g, "rack pull")
    .replace(/\bblock pull\b/g, "block pull")
    .replace(/\bpause bench\b/g, "pause bench")
    .replace(/\bbox squat\b/g, "box squat")
    .replace(/\bhigh bar\b/g, "high bar")
    .replace(/\blow bar\b/g, "low bar")
    .replace(/\bsumo\b/g, "sumo")
    .replace(/\bconventional\b/g, "conventional")
    .replace(/\btime under tension\b/g, "time under tension")
    .replace(/\bcomp max\b/g, "comp max")
    .replace(/\bcompetition lifts\b/g, "wedstrijdlifts")
    .replace(/\bcompetition lift\b/g, "wedstrijdlift")
    .replace(/\bvariation experience\b/g, "variant-ervaring")
    .replace(/\bstacking formula\b/g, "stack-formule")
    .replace(/\bpercent drop\b/g, "percentage drop")
    .replace(/\bpercentages vs rpe\b/g, "percentages versus RPE")
    .replace(/\bpowerlifting now\b/g, "Powerlifting Now")
    .replace(/\bmuscle camp\b/g, "Muscle Camp")
    .replace(/\bnorman chung\b/g, "Norman Chung")
    .replace(/\bstronger by science\b/g, "Stronger by Science")
    .replace(/\bmenno henselmans\b/g, "Menno Henselmans")
    .replace(/\bhuman matrix\b/g, "Human Matrix")
    .replace(/\bnewell\b/g, "Newell")
    .replace(/\bconstraints theory\b/g, "constraint-theorie")
    .replace(/\bsurvivorship bias\b/g, "survivorship bias")
    .replace(/\bavailability heuristic\b/g, "availability heuristic")
    .replace(/\begocentric bias\b/g, "egocentric bias")
    .replace(/\boccams razor\b/g, "Occam's razor")
    .replace(/\bsecond order thinking\b/g, "second-order thinking")
    .replace(/\bsignal vs noise\b/g, "signaal versus ruis")
    .replace(/\bmental models\b/g, "mental models")
    .replace(/\bperception\b/g, "perceptie")
    .replace(/\bjudgment\b/g, "oordeel")
    .replace(/\bdelivery\b/g, "delivery")
    .replace(/\bcommunication\b/g, "communicatie")
    .replace(/\bonline coaching\b/g, "online coaching")
    .replace(/\bin person coaching\b/g, "coaching op locatie")
    .replace(/\bmyofibrillar\b/g, "myofibrillair")
    .replace(/\bsarcoplasmic\b/g, "sarcoplasmatisch")
    .replace(/\bcontractile protein\b/g, "contractiel eiwit")
    .replace(/\blean body mass\b/g, "lean body mass")
    .replace(/\bnatural lifter\b/g, "natural lifter")
    .replace(/\benhanced lifter\b/g, "enhanced lifter")
    .replace(/\bjunk volume\b/g, "junk volume")
    .replace(/\btraining age\b/g, "trainingsleeftijd")
    .replace(/\bspecificity\b/g, "specificiteit")
    .replace(/\bdiminishings returns\b/g, "diminishing returns")
    .replace(/\bdiminishing returns\b/g, "diminishing returns")
    .replace(/\bfractional sets\b/g, "fractionele sets")
    .replace(/\bdirect sets\b/g, "directe sets")
    .replace(/\bindirect sets\b/g, "indirecte sets")
    .replace(/\bweekly sets\b/g, "wekelijkse sets")
    .replace(/\bsets per week\b/g, "sets per week")
    .replace(/\bsets per day\b/g, "sets per dag")
    .replace(/\bworkload\b/g, "workload")
    .replace(/\bwave loading\b/g, "wave loading")
    .replace(/\bfatigue debt\b/g, "fatigue debt")
    .replace(/\bfatigue model\b/g, "fatigue model")
    .replace(/\bfitness-fatigue model\b/g, "fitness-fatigue model")
    .replace(/\blift interference\b/g, "lift interference")
    .replace(/\bstagger\b/g, "stagger")
    .replace(/\bresensitization\b/g, "re-sensitization")
    .replace(/\btaper\b/g, "taper")
    .replace(/\btime-to-peak\b/g, "time-to-peak")
    .replace(/\babsolute intensity\b/g, "absolute intensiteit")
    .replace(/\brelative intensity\b/g, "relatieve intensiteit")
    .replace(/\baverage intensity\b/g, "gemiddelde intensiteit")
    .replace(/\bprogression rate\b/g, "progressiesnelheid")
    .replace(/\bautoregulate\b/g, "autoreguleren")
    .replace(/\bprojected max\b/g, "projected max")
    .replace(/\bestimated max\b/g, "geschat max")
    .replace(/\bhybrid programming\b/g, "hybride programmering")
    .replace(/\bstatic load\b/g, "statische load")
    .replace(/\bamrap\b/g, "AMRAP")
    .replace(/\bbodyweight\b/g, "lichaamsgewicht")
    .replace(/\bpull ups\b/g, "pull-ups")
    .replace(/\bclose grip\b/g, "close grip")
    .replace(/\bjm press\b/g, "JM press")
    .replace(/\bboard press\b/g, "board press")
    .replace(/\bpin press\b/g, "pin press")
    .replace(/\bpaused squat\b/g, "paused squat")
    .replace(/\bgoblet squat\b/g, "goblet squat")
    .replace(/\btempo squat\b/g, "tempo squat")
    .replace(/\btempo bench\b/g, "tempo bench")
    .replace(/\btempo deadlift\b/g, "tempo deadlift")
    .replace(/\bsafety bar\b/g, "safety bar")
    .replace(/\bbelt squat\b/g, "belt squat")
    .replace(/\bleg press\b/g, "leg press")
    .replace(/\bshoulder depression\b/g, "schouderdepressie")
    .replace(/\bshoulder retraction\b/g, "schouderretractie")
    .replace(/\bthoracic extensie\b/g, "thoracale extensie")
    .replace(/\bthoracic\b/g, "thoracaal")
    .replace(/\brib cage\b/g, "rib cage")
    .replace(/\bneck pressure\b/g, "nekdruk")
    .replace(/\bhand pressure\b/g, "handdruk")
    .replace(/\bcenter of mass\b/g, "zwaartepunt")
    .replace(/\bmoment arm\b/g, "hefboom")
    .replace(/\bmoment arms\b/g, "hefbomen")
    .replace(/\blong femurs\b/g, "lange femurs")
    .replace(/\bshort torso\b/g, "korte torso")
    .replace(/\blong arms\b/g, "lange armen")
    .replace(/\bshort arms\b/g, "korte armen")
    .replace(/\blong torso\b/g, "lange torso")
    .replace(/\bflat back\b/g, "platte rug")
    .replace(/\bbody structure\b/g, "lichaamsbouw")
    .replace(/\bbuild breakdown\b/g, "build breakdown")
    .replace(/\bdose response\b/g, "dose-response")
    .replace(/\bvariable importance\b/g, "variabele importance")
    .replace(/\bhedges g\b/g, "Hedges g")
    .replace(/\beffect size\b/g, "effect size")
    .replace(/\bnon-linear\b/g, "non-lineair")
    .replace(/\blinear periodization\b/g, "linear periodization")
    .replace(/\bundulating periodization\b/g, "undulating periodization")
    .replace(/\bnon-periodized\b/g, "non-periodized")
    .replace(/\bvolume equated\b/g, "volume geëquated")
    .replace(/\blow load\b/g, "lichte load")
    .replace(/\bhigh load\b/g, "zware load")
    .replace(/\bmomentary failure\b/g, "momentary failure")
    .replace(/\btraining to failure\b/g, "trainen tot failure")
    .replace(/\bnon-failure\b/g, "non-failure")
    .replace(/\brep range\b/g, "rep range")
    .replace(/\brep ranges\b/g, "rep ranges")
    .replace(/\brepetition continuum\b/g, "repetitie-continuüm")
    .replace(/\bfiber type\b/g, "vezeltype")
    .replace(/\btype 1\b/g, "type I")
    .replace(/\btype 2\b/g, "type II")
    .replace(/\bmind-muscle connection\b/g, "mind-muscle connection")
    .replace(/\bmuscle confusion\b/g, "muscle confusion")
    .replace(/\banabolic window\b/g, "anabolic window")
    .replace(/\bvelocity based training\b/g, "velocity based training")
    .replace(/\bnarrative review\b/g, "narratieve review")
    .replace(/\bmotion capture\b/g, "motion capture")
    .replace(/\bground reaction forces\b/g, "ground reaction forces")
    .replace(/\bplantarflexion\b/g, "plantarflexie")
    .replace(/\bdorsiflexie\b/g, "dorsiflexie")
    .replace(/\bankle flexion\b/g, "enkelflexie")
    .replace(/\bknee flexion\b/g, "knieflexie")
    .replace(/\bhip flexion\b/g, "heupflexie")
    .replace(/\btrunk lean\b/g, "romphelling")
    .replace(/\bextreme conditioning\b/g, "extreme conditioning")
    .replace(/\bhigh repetition\b/g, "hoge reps")
    .replace(/\bproprioception\b/g, "proprioceptie")
    .replace(/\bself-preservation\b/g, "zelfbehoud")
    .replace(/\bform collapse\b/g, "techniek breakdown")
    .replace(/\bquality sets\b/g, "kwaliteitssets")
    .replace(/\bmetcon\b/g, "metcon")
    .replace(/\bexhaustion\b/g, "exhaustion")
    .replace(/\bsecondary day\b/g, "secondary day")
    .replace(/\bprimary day\b/g, "primary day")
    .replace(/\bsweet spot\b/g, "sweet spot")
    .replace(/\brep work\b/g, "rep work")
    .replace(/\bfatigue singles\b/g, "fatigue singles")
    .replace(/\bmax out\b/g, "maxen")
    .replace(/\bpercent based\b/g, "percentage-based")
    .replace(/\bpercentage based\b/g, "percentage-based")
    .replace(/\brpe anxiety\b/g, "RPE-angst")
    .replace(/\bovershoot\b/g, "overshoot")
    .replace(/\blast set rpe\b/g, "last-set RPE")
    .replace(/\bten ways\b/g, "tien methoden")
    .replace(/\bphysiological adaptation\b/g, "fysiologische adaptatie")
    .replace(/\bneurological adaptation\b/g, "neurale adaptatie")
    .replace(/\bmacro cycle\b/g, "macrocyclus")
    .replace(/\bvolume block\b/g, "volumeblock")
    .replace(/\bstrength block\b/g, "strengthblock")
    .replace(/\badaptation retention\b/g, "adaptatiebehoud")
    .replace(/\btotal sets\b/g, "totaal sets")
    .replace(/\bvolume metric\b/g, "volume-metriek")
    .replace(/\bwork capacity\b/g, "werkcapaciteit")
    .replace(/\boffseason\b/g, "offseason")
    .replace(/\bpyramid sets\b/g, "piramidesets")
    .replace(/\bstepladder\b/g, "stepladder")
    .replace(/\bincremental progression\b/g, "incrementele progressie")
    .replace(/\bblock progression\b/g, "blockprogressie")
    .replace(/\badrenaline\b/g, "adrenaline")
    .replace(/\bconfidence\b/g, "confidence")
    .replace(/\bmotivation\b/g, "motivatie")
    .replace(/\bhabits\b/g, "gewoonten")
    .replace(/\benjoyment\b/g, "plezier")
    .replace(/\binjury fear\b/g, "blessureangst")
    .replace(/\bcondensed\b/g, "gecondenseerd")
    .replace(/\bspread\b/g, "gespreid")
    .replace(/\brecovery percentage\b/g, "herstelpercentage")
    .replace(/\brescheduling\b/g, "herschikken")
    .replace(/\binterference\b/g, "interferentie")
    .replace(/\bvariation percentages\b/g, "variantpercentages")
    .replace(/\bcomp 1rm\b/g, "comp 1RM")
    .replace(/\bweight band\b/g, "gewichtsband")
    .replace(/\brep dependent\b/g, "rep-afhankelijk")
    .replace(/\bpercent per rep\b/g, "procent per rep")
    .replace(/\brelative intensity\b/g, "relatieve intensiteit")
    .replace(/\bexternals\b/g, "externals")
    .replace(/\braw data\b/g, "ruwe data")
    .replace(/\bprogression view\b/g, "progression view")
    .replace(/\bside panel\b/g, "zijpaneel")
    .replace(/\bcurated\b/g, "gecurateerd")
    .replace(/\bai chunks\b/g, "AI-chunks")
    .replace(/\bai assistent\b/g, "AI-assistent")
    .replace(/\bspierkaart\b/g, "spierkaart")
    .replace(/\burgentie\b/g, "urgentie")
    .replace(/\bmacrocyclus\b/g, "macrocyclus")
    .replace(/\bmeetprep\b/g, "meetprep")
    .replace(/\bload percentage\b/g, "load-percentage")
    .replace(/\bestimated max\b/g, "geschat max")
    .replace(/\breps in reserve\b/g, "reps in reserve")
    .replace(/\bautoregulatie\b/g, "autoregulatie")
    .replace(/\bmechanical tension\b/g, "mechanische spanning")
    .replace(/\bhigh-threshold\b/g, "high-threshold")
    .replace(/\bsoftware\b/g, "software")
    .replace(/\bhardware\b/g, "hardware")
    .replace(/\brom\b/g, "ROM")
    .replace(/\bpowerlifting squat\b/g, "powerlifting squat")
    .replace(/\btraditioneel\b/g, "traditioneel")
    .replace(/\bhypertrophy zone\b/g, "hypertrofiezone")
    .replace(/\bminimum load\b/g, "minimum load")
    .replace(/\bmuscular endurance\b/g, "muscular endurance")
    .replace(/\bprogram design\b/g, "program design")
    .replace(/\b7 stappen\b/g, "7 stappen")
    .replace(/\banaerobic\b/g, "anaerobic")
    .replace(/\baerobic\b/g, "aerobic")
    .replace(/\bconnective tissue\b/g, "bindweefsel")
    .replace(/\bendocrine\b/g, "endocrien")
    .replace(/\bspotting\b/g, "spotting")
    .replace(/\bfree weight\b/g, "free weight")
    .replace(/\bexercise technique\b/g, "oefentechniek")
    .replace(/\bmechanical disadvantage\b/g, "mechanisch nadeel")
    .replace(/\barm length\b/g, "armlengte")
    .replace(/\bfemur\b/g, "femur")
    .replace(/\btorso\b/g, "torso")
    .replace(/\bdosage\b/g, "dosage")
    .replace(/\bdose\b/g, "dose")
    .replace(/\bdosing\b/g, "dosing")
    .replace(/\barbitrary units\b/g, "arbitrary units")
    .replace(/\bholistic\b/g, "holistisch")
    .replace(/\bpredictors\b/g, "voorspellers")
    .replace(/\bquantification\b/g, "kwantificering")
    .replace(/\bsynthesis\b/g, "synthese")
    .replace(/\bkinetics\b/g, "kinetiek")
    .replace(/\bkinematics\b/g, "kinematica")
    .replace(/\bwithin-individual variability\b/g, "within-individual variabiliteit")
    .replace(/\bindividual variability\b/g, "individuele variabiliteit")
    .replace(/\bultrastructural\b/g, "ultrastructureel")
    .replace(/\bstructural hypertrophy\b/g, "structurele hypertrofie")
    .replace(/\btask-specific hypertrophy\b/g, "task-specific hypertrofie")
    .replace(/\boptimal hypertrophy\b/g, "optimale hypertrofie")
    .replace(/\bmaximal hypertrophy\b/g, "maximale hypertrofie")
    .replace(/\bloading zones\b/g, "loadzones")
    .replace(/\bloading spectrum\b/g, "loadspectrum")
    .replace(/\beffectiveness spectrum\b/g, "effectiviteitsspectrum")
    .replace(/\btraining principles\b/g, "trainingsprincipes")
    .replace(/\bphase potentiation\b/g, "phase potentiation")
    .replace(/\b10 things\b/g, "10 dingen")
    .replace(/\blearn programming\b/g, "programmeren leren")
    .replace(/\bathlete to coach\b/g, "atleet naar coach")
    .replace(/\bgreat athlete great coach\b/g, "goede atleet goede coach")
    .replace(/\bthree disciplines\b/g, "drie disciplines")
    .replace(/\bcoaching skills\b/g, "coachingvaardigheden")
    .replace(/\bcoaching cues\b/g, "coaching cues")
    .replace(/\bbracing cue\b/g, "bracing cue")
    .replace(/\bvalsalva\b/g, "Valsalva")
    .replace(/\bhyperplasie\b/g, "hyperplasie")
    .replace(/\batrofie\b/g, "atrofie")
    .replace(/\bmyofibrillen\b/g, "myofibrillen")
    .replace(/\bmtor\b/g, "mTOR")
    .replace(/\bcontractiel eiwit\b/g, "contractiel eiwit")
    .replace(/\brealistische groei\b/g, "realistische groei")
    .replace(/\bbeginner gains\b/g, "beginner gains")
    .replace(/\bbody composition\b/g, "lichaamssamenstelling")
    .replace(/\bsmart scale\b/g, "smart scale")
    .replace(/\bprogressiefoto\b/g, "progressiefoto")
    .replace(/\btrainingsintensiteit\b/g, "trainingsintensiteit")
    .replace(/\bnear failure\b/g, "nabij failure")
    .replace(/\bprogressive overload\b/g, "progressive overload")
    .replace(/\bvezeloriëntatie\b/g, "vezeloriëntatie")
    .replace(/\btoning\b/g, "toning")
    .replace(/\bbulky\b/g, "bulky")
    .replace(/\bcreatine\b/g, "creatine")
    .replace(/\bkuur\b/g, "kuur")
    .replace(/\bstretch\b/g, "stretch")
    .replace(/\bcortisol\b/g, "cortisol")
    .replace(/\bshoulder injury\b/g, "schouderblessure")
    .replace(/\bshoulder biomechanics\b/g, "schouderbiomechanica")
    .replace(/\boverexertion\b/g, "overexertion")
    .replace(/\binjury prevention\b/g, "blessurepreventie")
    .replace(/\binjury risk\b/g, "blessurerisico")
    .replace(/\breturn to squat\b/g, "return-to-squat")
    .replace(/\bheel wedge\b/g, "hakwedge")
    .replace(/\bheel elevation\b/g, "hakverhoging")
    .replace(/\bsole stiffness\b/g, "zoolstijfheid")
    .replace(/\bresearch gaps\b/g, "onderzoeksgaten")
    .replace(/\bpeaking block\b/g, "peakingblock")
    .replace(/\bpriming\b/g, "priming")
    .replace(/\bprogressiesnelheid\b/g, "progressiesnelheid")
    .replace(/\bexecution\b/g, "uitvoering")
    .replace(/\bpsychology\b/g, "psychologie")
    .replace(/\bnot a program\b/g, "geen programma")
    .replace(/\bprogramming principle\b/g, "programmeringsprincipe")
    .replace(/\bpercent drop\b/g, "percentage drop")
    .replace(/\btop set rpe\b/g, "topset RPE")
    .replace(/\bmixed backoff\b/g, "mixed back-off")
    .replace(/\bfixed percentage\b/g, "vast percentage")
    .replace(/\bvolume autoregulation\b/g, "volume-autoregulatie")
    .replace(/\bvolume vs intensity\b/g, "volume versus intensiteit")
    .replace(/\bcoach framework\b/g, "coach-framework")
    .replace(/\bcompetition specificity\b/g, "wedstrijdspecificiteit")
    .replace(/\bbulgarian method\b/g, "Bulgarian method")
    .replace(/\bwestside\b/g, "Westside")
    .replace(/\bintensificatie\b/g, "intensificatie")
    .replace(/\bstraight sets\b/g, "straight sets")
    .replace(/\bbenchfrequentie\b/g, "benchfrequentie")
    .replace(/\bkrachtwinst\b/g, "krachtwinst")
    .replace(/\breduce variables\b/g, "variabelen beperken")
    .replace(/\bd-load\b/g, "deload")
    .replace(/\bde-load\b/g, "deload")
    .replace(/\bfive week block\b/g, "vijfweeksblock")
    .replace(/\bpeak week\b/g, "peak week")
    .replace(/\bemerging strategies\b/g, "Emerging Strategies")
    .replace(/\bdeadlift frequency\b/g, "deadliftfrequentie")
    .replace(/\bself limiting variation\b/g, "zelflimiterende variant")
    .replace(/\bpart two\b/g, "deel 2")
    .replace(/\bthree percent\b/g, "drie procent")
    .replace(/\b1\.5 percent\b/g, "1,5 procent")
    .replace(/\bsession programming\b/g, "sessieprogrammering")
    .replace(/\bweekly structure\b/g, "weekstructuur")
    .replace(/\baccessory intensiteit\b/g, "accessory-intensiteit")
    .replace(/\bsix variables\b/g, "zes variabelen")
    .replace(/\bindividualisatie\b/g, "individualisatie")
    .replace(/\bday order\b/g, "dagvolgorde")
    .replace(/\brecovery model\b/g, "herstelmodel")
    .replace(/\b2x\b/g, "2×")
    .replace(/\b3x\b/g, "3×")
    .replace(/\b4x\b/g, "4×")
    .replace(/\bproactive\b/g, "proactief")
    .replace(/\bfeedback loop\b/g, "feedbackloop")
    .replace(/\bstacking\b/g, "stacken")
    .replace(/\bstack formula\b/g, "stack-formule")
    .replace(/\brep-afhankelijk\b/g, "rep-afhankelijk")
    .replace(/\btut\b/g, "TUT")
    .replace(/\bpause\b/g, "pause")
    .replace(/\btempo\b/g, "tempo")
    .trim();
  // Capitalize first letter if needed
  if (out && out[0] === out[0].toLowerCase() && !out.startsWith("/")) {
    out = out[0].toUpperCase() + out.slice(1);
  }
  return out || kw;
}

function buildKeywords(id, originalKeywords, content) {
  const seen = new Set();
  const result = [];

  const add = (kw) => {
    const v = dutchifyKeyword(kw);
    const key = v.toLowerCase();
    if (!v || seen.has(key)) return;
    seen.add(key);
    result.push(v);
  };

  for (const kw of originalKeywords) add(kw);

  // Enrich from id
  if (id.includes("squat")) add("squat");
  if (id.includes("bench")) add("bench");
  if (id.includes("deadlift")) add("deadlift");
  if (id.includes("rpe")) add("RPE");
  if (id.includes("volume")) add("volume");
  if (id.includes("intensity")) add("intensiteit");
  if (id.includes("deload")) add("deload");
  if (id.includes("peaking")) add("peaking");
  if (id.includes("hypertrofie") || id.includes("hypertrophy")) add("hypertrofie");
  if (id.startsWith("cmd-")) add(id.replace("cmd-", "/"));
  if (id.includes("ess")) add("ESS 4e");

  // Ensure minimum 8
  const contentLower = content.toLowerCase();
  const extras = [
    "coaching",
    "powerlifting",
    "programmeren",
    "SBD",
    "1RM",
    "RIR",
    "autoregulatie",
    "fatigue",
    "herstel",
    "techniek",
    "monitoring",
    "atleet",
    "block",
    "wedstrijd",
    "specifiteit",
    "biomechanica",
    "oefening",
    "sets",
    "reps",
    "kracht",
    "spiermassa",
    "blessure",
    "onderzoek",
    "meta-analyse",
    "evidence-based",
    "individualisatie",
    "macrocyclus",
    "mesocyclus",
    "accessories",
    "variant",
    "topset",
    "back-off",
    "meetprep",
    "wekelijkse sets",
    "trainingsleeftijd",
    "neurale adaptatie",
    "mechanische spanning",
    "progressive overload",
    "check-in",
    "kennisbank",
    "navigatie",
    "data",
    "grafiek",
    "chat",
    "programma",
  ];
  for (const e of extras) {
    if (result.length >= 15) break;
    if (contentLower.includes(e.toLowerCase()) || id.includes(e.toLowerCase().replace(/\s/g, "-"))) add(e);
  }

  while (result.length < 8) {
    add(extras[result.length % extras.length]);
  }

  return result.slice(0, 15);
}

function dutchifyContent(text) {
  let out = text;
  const contentReplacements = [
    [/curated AI-kennis chunks/gi, "samengestelde AI-kennisblokken"],
    [/curated chunks/gi, "samengestelde kennisblokken"],
    [/curated/gi, "gecurateerd"],
    [/slash commands/gi, "slash-opdrachten"],
    [/direct chat/gi, "direct gesprek"],
    [/strength work/gi, "krachttraining"],
    [/strength blocks?/gi, "krachtblocks"],
    [/strength block/gi, "krachtblock"],
    [/peaking blocks?/gi, "peaking-blocks"],
    [/peaking block/gi, "peaking-block"],
    [/hypertrophy blocks?/gi, "hypertrofie-blocks"],
    [/hypertrophy block/gi, "hypertrofie-block"],
    [/blockfase/gi, "blockfase"],
    [/\bload\b/gi, "belasting"],
    [/\bloads\b/gi, "belastingen"],
    [/joint stress/gi, "gewrichtsbelasting"],
    [/systemische fatigue/gi, "systemische vermoeidheid"],
    [/motor unit recruitment/gi, "motor unit-recruitment"],
    [/neural specificity/gi, "neurale specificiteit"],
    [/mechanical tension/gi, "mechanische spanning"],
    [/proximity to failure/gi, "nabijheid van failure"],
    [/high-threshold/gi, "high-threshold"],
    [/competition lifts?/gi, "wedstrijdlifts"],
    [/competition lift/gi, "wedstrijdlift"],
    [/competition SBD/gi, "wedstrijd-SBD"],
    [/straight sets/gi, "straight sets"],
    [/top sets?/gi, "topsets"],
    [/back ?off sets?/gi, "back-off sets"],
    [/accessory work/gi, "accessory-werk"],
    [/accessory volume/gi, "accessory-volume"],
    [/accessories/gi, "accessories"],
    [/periodization/gi, "periodisering"],
    [/\bNP\b/g, "NGP"],
    [/non-periodized/gi, "niet-geperiodiseerd"],
    [/periodized/gi, "geperiodiseerd"],
    [/trained status/gi, "getrainde status"],
    [/resistance trained/gi, "krachtgetraind"],
    [/volume equated/gi, "volume-gelijk"],
    [/effect size/gi, "effectgrootte"],
    [/muscle mass/gi, "spiermassa"],
    [/max strength/gi, "maximale kracht"],
    [/varied loads/gi, "gevarieerde belastingen"],
    [/skill adaptatie/gi, "vaardigheidsadaptatie"],
    [/needs analysis/gi, "behoefteanalyse"],
    [/data-driven/gi, "datagedreven"],
    [/guesswork/gi, "gokwerk"],
    [/cookie-cutter/gi, "standaardtemplate"],
    [/first steps forward/gi, "eerste stappen vooruit"],
    [/training history/gi, "trainingshistorie"],
    [/weaknesses/gi, "zwakke punten"],
    [/injury risk/gi, "blessurerisico"],
    [/fatigue management/gi, "fatigue-management"],
    [/evidence-based practice/gi, "evidence-based practice"],
    [/meta-analyses/gi, "meta-analyses"],
    [/meta-analysis/gi, "meta-analyse"],
    [/systematic review/gi, "systematische review"],
    [/narrative review/gi, "narratieve review"],
    [/experienced lifters/gi, "ervaren lifters"],
    [/experienced powerlifters/gi, "ervaren powerlifters"],
    [/velocity-based training/gi, "velocity-based training"],
    [/autoregulatory progressive resistance training/gi, "autoregulatoire progressieve weerstandstraining"],
    [/repetitions-until-failure/gi, "herhalingen tot failure"],
    [/overexertion/gi, "overbelasting"],
    [/shoulder injury/gi, "schouderblessure"],
    [/muscular fatigue/gi, "spiervermoeidheid"],
    [/weightlifting shoes/gi, "weightlifting-schoenen"],
    [/athletic shoes/gi, "sportschoenen"],
    [/forward lean/gi, "voorover leunen"],
    [/center of mass/gi, "zwaartepunt"],
    [/moment arm/gi, "hefboom"],
    [/moment arms/gi, "hefbomen"],
    [/piekmoment/gi, "piekmoment"],
    [/sticking point/gi, "sticking point"],
    [/sticking region/gi, "sticking region"],
    [/bar path/gi, "bar path"],
    [/bar velocity/gi, "stangsnelheid"],
    [/bar speed/gi, "stangsnelheid"],
    [/leg drive/gi, "beenkracht"],
    [/bench arch/gi, "bench-arch"],
    [/shoulder depression/gi, "schouderdepressie"],
    [/shoulder retraction/gi, "schouderretractie"],
    [/rib cage/gi, "borstkas"],
    [/neck pressure/gi, "nekdruk"],
    [/hand pressure/gi, "handdruk"],
    [/long femurs/gi, "lange femurs"],
    [/short torso/gi, "korte torso"],
    [/long arms/gi, "lange armen"],
    [/short arms/gi, "korte armen"],
    [/long torso/gi, "lange torso"],
    [/flat back/gi, "platte rug"],
    [/body structure/gi, "lichaamsbouw"],
    [/build breakdown/gi, "lichaamsbouw-overzicht"],
    [/program design/gi, "programma-opbouw"],
    [/rest periods/gi, "rustperiodes"],
    [/exercise selection/gi, "oefeningselectie"],
    [/exercise order/gi, "oefeningvolgorde"],
    [/training frequency/gi, "trainingsfrequentie"],
    [/overtraining/gi, "overtraining"],
    [/detraining/gi, "detraining"],
    [/connective tissue/gi, "bindweefsel"],
    [/free weight/gi, "free weight"],
    [/spotting/gi, "spotting"],
    [/dose response/gi, "dose-response"],
    [/diminishing returns/gi, "afnemend rendement"],
    [/variable importance/gi, "variabele importance"],
    [/fractional sets/gi, "fractionele sets"],
    [/direct sets/gi, "directe sets"],
    [/indirect sets/gi, "indirecte sets"],
    [/weekly sets/gi, "wekelijkse sets"],
    [/linear periodization/gi, "lineaire periodisering"],
    [/undulating periodization/gi, "undulerende periodisering"],
    [/low load/gi, "lichte belasting"],
    [/high load/gi, "zware belasting"],
    [/momentary failure/gi, "momentary failure"],
    [/training to failure/gi, "trainen tot failure"],
    [/non-failure/gi, "non-failure"],
    [/rep range/gi, "rep range"],
    [/repetition continuum/gi, "repetitie-continuüm"],
    [/fiber type/gi, "vezeltype"],
    [/muscular endurance/gi, "muscular endurance"],
    [/task-specific hypertrophy/gi, "taak-specifieke hypertrofie"],
    [/optimal hypertrophy/gi, "optimale hypertrofie"],
    [/maximal hypertrophy/gi, "maximale hypertrofie"],
    [/loading zones/gi, "belastingszones"],
    [/loading spectrum/gi, "belastingsspectrum"],
    [/effectiveness spectrum/gi, "effectiviteitsspectrum"],
    [/training principles/gi, "trainingsprincipes"],
    [/phase potentiation/gi, "fasepotentiatie"],
    [/survivorship bias/gi, "survivorship bias"],
    [/availability heuristic/gi, "availability heuristic"],
    [/egocentric bias/gi, "egocentric bias"],
    [/constraints theory/gi, "constraint-theorie"],
    [/mental models/gi, "mental models"],
    [/signal vs noise/gi, "signaal versus ruis"],
    [/lean body mass/gi, "vetvrije massa"],
    [/contractile protein/gi, "contractiel eiwit"],
    [/mind-muscle connection/gi, "mind-muscle-verbinding"],
    [/muscle confusion/gi, "spierverwarring"],
    [/anabolic window/gi, "anabool venster"],
    [/extreme conditioning/gi, "extreme conditioning"],
    [/self-preservation/gi, "zelfbehoud"],
    [/form collapse/gi, "techniek-breakdown"],
    [/quality sets/gi, "kwaliteitssets"],
    [/sweet spot/gi, "sweet spot"],
    [/rep work/gi, "rep-werk"],
    [/fatigue singles/gi, "fatigue singles"],
    [/max out/gi, "maxen"],
    [/percent based/gi, "percentage-based"],
    [/projected max/gi, "projected max"],
    [/estimated max/gi, "geschat max"],
    [/hybrid programming/gi, "hybride programmeren"],
    [/static load/gi, "statische belasting"],
    [/junk volume/gi, "junk volume"],
    [/work capacity/gi, "werkcapaciteit"],
    [/wave loading/gi, "wave loading"],
    [/fatigue debt/gi, "fatigue debt"],
    [/fatigue model/gi, "fatigue model"],
    [/fitness-fatigue model/gi, "fitness-fatigue-model"],
    [/lift interference/gi, "lift-interferentie"],
    [/re-sensitization/gi, "re-sensitisatie"],
    [/time-to-peak/gi, "time-to-peak"],
    [/absolute intensity/gi, "absolute intensiteit"],
    [/relative intensity/gi, "relatieve intensiteit"],
    [/average intensity/gi, "gemiddelde intensiteit"],
    [/progression rate/gi, "progressiesnelheid"],
    [/fatigue stops/gi, "fatigue stops"],
    [/primary day/gi, "primary day"],
    [/secondary day/gi, "secondary day"],
    [/tertiary day/gi, "tertiary day"],
    [/self-limiting variation/gi, "zelflimiterende variant"],
    [/lifter psychology/gi, "lifterpsychologie"],
    [/meet prep/gi, "meetprep"],
    [/meet anxiety/gi, "wedstrijdangst"],
    [/post activation potentiation/gi, "post-activation potentiation"],
    [/sandbagging/gi, "sandbagging"],
    [/home gym/gi, "home gym"],
    [/fear of injury/gi, "blessureangst"],
    [/pain science/gi, "pijnwetenschap"],
    [/variation multiplier/gi, "variant-multiplier"],
    [/time under tension/gi, "time under tension"],
    [/Deze mechanismen verklaren waarom de technische aanpassing onder load het gewenste effect geeft\./g,
      "Deze mechanismen verklaren waarom de technische aanpassing onder belasting het gewenste effect geeft."],
    [/Gebruik deze functie structureel in je coach-workflow wanneer het past bij onboarding, monitoring of programma-aanpassingen\./g,
      "Neem deze functie op in je vaste coach-workflow: bij onboarding, monitoring of programma-aanpassingen."],
    [/Alleen coaches hebben toegang tot de meeste opdrachten en beheerfuncties\.\n\nAtleten zien een beperktere interface gericht op hun eigen programma en check-ins\./g,
      "Alleen coaches hebben toegang tot beheerfuncties en chatopdrachten. Atleten zien een beperkter overzicht van hun eigen programma, logs en check-ins."],
    [/pending status/gi, "wachtstatus"],
    [/pending aanmeldingen/gi, "openstaande aanmeldingen"],
    [/pending/gi, "openstaand"],
  ];
  for (const [pattern, replacement] of contentReplacements) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// Load existing partial override for quality preservation
const partialPath = path.join(root, "scripts/knowledge-base-overrides.partial.json");
const partial = fs.existsSync(partialPath) ? JSON.parse(fs.readFileSync(partialPath, "utf8")) : {};

const source = fs.readFileSync(kbPath, "utf8");
const chunks = parseChunks(source);
const overrides = {};

for (const chunk of chunks) {
  if (partial[chunk.id]) {
    overrides[chunk.id] = partial[chunk.id];
    continue;
  }

  const built = {
    title: improveTitle(chunk.id, chunk.title),
    category: resolveCategory(chunk.id, chunk.category),
    content: dutchifyContent(buildStructuredContent(chunk.id, chunk.content)),
    keywords: buildKeywords(chunk.id, chunk.keywords, chunk.content),
  };
  overrides[chunk.id] = built;
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(overrides, null, 2) + "\n", "utf8");

const ids = chunks.map((c) => c.id);
const overrideIds = Object.keys(overrides);
const missing = ids.filter((id) => !overrideIds.includes(id));
const extra = overrideIds.filter((id) => !ids.includes(id));

console.log(JSON.stringify({ written: outPath, chunkCount: overrideIds.length, missing, extra }, null, 2));
