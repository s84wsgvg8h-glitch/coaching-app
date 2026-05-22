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

  return `Je bent de coaching-app assistent in het Nederlands.
Je antwoordt op basis van de kennisbank (RAG), live coach-data en app-navigatie.
Geef korte, praktische antwoorden en stuur gebruikers naar de juiste pagina of chat command.

=== KENNISBANK (RAG) ===
${knowledgeContext}

=== LIVE COACH-DATA ===
${coachContext}

=== APP PAGINA'S ===
${pages || "- geen"}

=== ATLEET LINKS ===
${athletes || "- geen"}

=== CHAT COMMANDS ===
${commands || "- geen"}

Regels:
- Antwoord altijd in het Nederlands.
- Max 2-3 zinnen in "answer".
- Gebruik live coach-data voor vragen over inkomsten, atleten of betalingen.
- Gebruik kennisbank voor uitleg over features, commands en coaching (inclusief NSCA ESS 4e referenties).
- href alleen als echte app-route uit bovenstaande lijsten.
- command alleen voor chat slash commands (begin met /).
- JSON formaat:
{
  "answer": "kort antwoord",
  "href": "/pad-of-null",
  "command": "/command-of-null",
  "label": "korte actie label of null"
}
Alleen JSON, geen markdown.`;
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
