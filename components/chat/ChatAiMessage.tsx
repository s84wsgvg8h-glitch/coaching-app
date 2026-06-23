"use client";

type ChatAiMessageProps = {
  question: string;
  answer: string;
};

export default function ChatAiMessage({
  question,
  answer,
}: ChatAiMessageProps) {
  return (
    <div className="mx-auto w-full max-w-[92%] space-y-2">
      {question.trim() ? (
        <p className="text-center text-[11px] font-semibold text-app-muted">
          Vraag: {question}
        </p>
      ) : null}

      <div className="rounded-2xl border border-app-accent/25 bg-app-accent-muted px-4 py-3 text-purple-950 shadow-sm">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-app-accent">
          AI-assistent
        </p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6">
          {answer}
        </p>
      </div>
    </div>
  );
}
