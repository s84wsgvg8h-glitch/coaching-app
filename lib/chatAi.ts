export type AiAssistantMessagePayload = {
  type: "ai_assistant";
  question: string;
  answer: string;
};

export function parseAiAssistantMessage(body: string | null) {
  if (!body) return null;

  try {
    const parsed = JSON.parse(body) as AiAssistantMessagePayload;
    if (parsed?.type === "ai_assistant" && parsed.answer?.trim()) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildAiAssistantMessageBody(
  question: string,
  answer: string,
) {
  const payload: AiAssistantMessagePayload = {
    type: "ai_assistant",
    question: question.trim(),
    answer: answer.trim(),
  };

  return JSON.stringify(payload);
}

export function getAiAssistantPreviewText(body: string | null) {
  const parsed = parseAiAssistantMessage(body);
  if (!parsed) return "AI-assistent";

  const snippet = parsed.answer.replace(/\s+/g, " ").trim();
  if (snippet.length <= 80) return `🤖 ${snippet}`;
  return `🤖 ${snippet.slice(0, 77)}...`;
}
