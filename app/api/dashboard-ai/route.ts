import { NextResponse } from "next/server";
import {
  formatTrainingSnapshotForPrompt,
  isAdminDataQuestion,
  isTrainingDataQuestion,
  type TrainingSnapshot,
} from "@/lib/aiTrainingSnapshot";
import {
  formatCoachSnapshotForPrompt,
  formatKnowledgeForPrompt,
  searchKnowledge,
  type CoachSnapshot,
} from "@/lib/knowledgeSearch";

type DashboardAiRequest = {
  query?: string;
  role?: string;
  pages?: Array<{ title: string; href: string; description: string }>;
  athletes?: Array<{ name: string; href: string }>;
  commands?: Array<{ command: string; description: string; requiresChat?: boolean }>;
  coachSnapshot?: CoachSnapshot;
  trainingSnapshot?: TrainingSnapshot;
  trainingContext?: string;
};

type DashboardAiResponse = {
  answer: string;
  href?: string;
  command?: string;
  label?: string;
};

const UNKNOWN_ANSWER =
  "Dat staat niet in mijn kennisbank — daar kan ik geen antwoord op geven.\n\n- Herformuleer je vraag met termen uit de kennisbank, of voeg de info toe aan de kennisbank.";

function buildSystemPrompt(
  body: DashboardAiRequest,
  knowledgeContext: string,
  trainingContext: string,
) {
  const pages = (body.pages || [])
    .map((page) => `- ${page.title} (${page.href}): ${page.description}`)
    .join("\n");

  const athletes = (body.athletes || [])
    .map((athlete) => `- ${athlete.name} (${athlete.href})`)
    .join("\n");

  const commands = (body.commands || [])
    .map(
      (command) =>
        `- ${command.command}: ${command.description}${command.requiresChat ? " (alleen in chat)" : ""}`,
    )
    .join("\n");

  const coachContext = formatCoachSnapshotForPrompt(body.coachSnapshot);

  return `Je bent een kennisbank-assistent voor deze coaching-app. Schrijf in het Nederlands: direct, zonder fluff.

STRICT — GEEN EIGEN KENNIS:
- Gebruik NOOIT algemene modelkennis, internetkennis of aannames.
- Je enige toegestane bronnen staan hieronder in de secties.
- Staat het antwoord niet in een toegestane sectie: antwoord exact met "Dat staat niet in mijn kennisbank" en leg kort uit wat ontbreekt. Geen gokken, geen aanvullen.

Toegestane bronnen (en alleen deze):
1. KENNISBANK — coaching, techniek, app-uitleg, theorie
2. TRAININGSDATA — alleen cijfers/trends bij data-analysevragen
3. LIVE COACH-DATA — alleen inkomsten, betalingen, atleetadministratie
4. APP PAGINA'S / COMMANDS — alleen bij expliciete navigatie-vraag

=== KENNISBANK ===
${knowledgeContext}

=== LIVE COACH-DATA ===
${coachContext}

=== TRAININGSDATA ===
${trainingContext}

=== APP PAGINA'S (alleen navigatie) ===
${pages || "- geen"}

=== ATLEET LINKS (alleen navigatie) ===
${athletes || "- geen"}

=== CHAT COMMANDS (alleen navigatie) ===
${commands || "- geen"}

Regels:
- Formaat "answer": 1 korte alinea + bulletpoints (regels met "- ").
- Coaching/theorie/app: ALLEEN KENNISBANK. Geen enkel feit toevoegen dat niet in KENNISBANK staat.
- Data-analyse: cijfers ALLEEN uit TRAININGSDATA; interpretatie ALLEEN als die interpretatie expliciet in KENNISBANK staat — anders alleen de cijfers rapporteren.
- Admin/financiën: ALLEEN LIVE COACH-DATA.
- Navigatie: alleen bij expliciete vraag; href/command alleen uit bovenstaande lijsten.
- Bij twijfel of ontbrekende info: zeg dat je het niet weet. Liever "weer niet" dan verzinnen.
- JSON:
{
  "answer": "...",
  "href": null,
  "command": null,
  "label": null
}
Alleen JSON. Gebruik \\n in "answer".`;
}

function hasAllowedNonKnowledgeContext(body: DashboardAiRequest, query: string) {
  if (isTrainingDataQuestion(query)) {
    return Boolean(body.trainingSnapshot || body.trainingContext);
  }

  if (isAdminDataQuestion(query)) {
    return Boolean(body.coachSnapshot);
  }

  return false;
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY ontbreekt. Voeg deze toe in Vercel environment variables.",
      },
      { status: 503 },
    );
  }

  let body: DashboardAiRequest;

  try {
    body = (await request.json()) as DashboardAiRequest;
  } catch {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const query = body.query?.trim();

  if (!query) {
    return NextResponse.json({ error: "Vul een vraag in." }, { status: 400 });
  }

  const knowledgeChunks = searchKnowledge(query, 8);
  const knowledgeContext = formatKnowledgeForPrompt(knowledgeChunks);
  const trainingContext = body.trainingSnapshot
    ? formatTrainingSnapshotForPrompt(body.trainingSnapshot)
    : body.trainingContext || "Geen trainingsdata meegestuurd voor deze vraag.";

  if (knowledgeChunks.length === 0 && !hasAllowedNonKnowledgeContext(body, query)) {
    return NextResponse.json({
      answer: UNKNOWN_ANSWER,
      href: null,
      command: null,
      label: null,
      sources: [],
    });
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: buildSystemPrompt(body, knowledgeContext, trainingContext),
          },
          {
            role: "user",
            content: `Rol gebruiker: ${body.role || "onbekend"}\nVraag: ${query}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return NextResponse.json(
        { error: "AI-antwoord ophalen mislukt." },
        { status: 502 },
      );
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "Geen AI-antwoord ontvangen." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(content) as DashboardAiResponse;

    return NextResponse.json({
      answer: parsed.answer || UNKNOWN_ANSWER,
      href: parsed.href || null,
      command: parsed.command || null,
      label: parsed.label || null,
      sources: knowledgeChunks.map((chunk) => chunk.title),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "AI-verzoek mislukt." },
      { status: 500 },
    );
  }
}
