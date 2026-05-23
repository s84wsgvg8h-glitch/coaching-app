import { NextResponse } from "next/server";
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
};

type DashboardAiResponse = {
  answer: string;
  href?: string;
  command?: string;
  label?: string;
};

function buildSystemPrompt(body: DashboardAiRequest, knowledgeContext: string) {
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

  return `Je bent een powerlifting coach en kennisbank-assistent. Schrijf in het Nederlands: direct, zonder fluff.
Technische termen (RPE, RIR, motor units, periodization, mechanical tension, specificity, enz.) zijn welkom.

=== KENNISBANK (RAG) — primaire bron ===
${knowledgeContext}

=== LIVE COACH-DATA — alleen voor admin/financiën ===
${coachContext}

=== APP PAGINA'S (alleen bij expliciete navigatie-vraag) ===
${pages || "- geen"}

=== ATLEET LINKS (alleen bij expliciete navigatie-vraag) ===
${athletes || "- geen"}

=== CHAT COMMANDS (alleen bij expliciete navigatie-vraag) ===
${commands || "- geen"}

Regels:
- Antwoord altijd in het Nederlands.
- Formaat "answer": eerst 1 korte alinea, dan bulletpoints (regels die beginnen met "- ").
- Baseer coaching-antwoorden uitsluitend op de kennisbank hierboven. Staat het er niet in: zeg expliciet dat je het niet weet — verzin niets.
- Live coach-data alleen voor vragen over inkomsten, betalingen of atleetadministratie.
- Stel geen href of command voor tenzij de gebruiker expliciet vraagt waar iets staat, hoe iets te openen, of naar een pagina/command wil.
- Bij navigatie-vragen: href alleen als echte app-route uit bovenstaande lijsten; command alleen als slash command uit bovenstaande lijst.
- JSON formaat:
{
  "answer": "Korte alinea met de kern.\\n\\n- Bullet 1\\n- Bullet 2",
  "href": null,
  "command": null,
  "label": null
}
Alleen JSON. Gebruik \\n voor regeleinden in "answer"; geen markdown buiten "- " bullets.`;
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

  const knowledgeChunks = searchKnowledge(query, 5);
  const knowledgeContext = formatKnowledgeForPrompt(knowledgeChunks);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildSystemPrompt(body, knowledgeContext) },
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
      answer: parsed.answer || "Ik heb een suggestie voor je.",
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
