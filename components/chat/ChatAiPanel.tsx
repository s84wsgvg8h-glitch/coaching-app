"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizontal, Share2, Sparkles, X } from "lucide-react";
import {
  buildTrainingSnapshot,
  isTrainingDataQuestion,
  type TrainingSnapshot,
} from "@/lib/aiTrainingSnapshot";
import { logAthleteAiChatTurn } from "@/lib/athleteAiChatLog";
import { buildDashboardSearchItems } from "@/lib/dashboardSearch";
import { CHAT_SIDE_PANEL_CLASS } from "@/lib/chatSidePanel";
import { getApiAuthHeaders } from "@/lib/apiClient";
import { isDemoMode } from "@/lib/demo/demoMode";

type ChatAiTurn = {
  id: string;
  question: string;
  answer: string;
  loading?: boolean;
  error?: string;
};

type ChatAiPanelProps = {
  userRole: string;
  athleteId: string;
  athleteName: string;
  initialQuery?: string;
  onClose: () => void;
  onShareToChat?: (question: string, answer: string) => void | Promise<void>;
};

export default function ChatAiPanel({
  userRole,
  athleteId,
  athleteName,
  initialQuery = "",
  onClose,
  onShareToChat,
}: ChatAiPanelProps) {
  const [input, setInput] = useState(initialQuery);
  const [turns, setTurns] = useState<ChatAiTurn[]>([]);
  const [asking, setAsking] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!initialQuery.trim()) return;
    void askQuestion(initialQuery);
    setInput("");
  }, [initialQuery]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, asking]);

  async function askQuestion(questionText: string) {
    const question = questionText.trim();
    if (!question || asking) return;

    const turnId = crypto.randomUUID();
    setTurns((current) => [
      ...current,
      { id: turnId, question, answer: "", loading: true },
    ]);
    setAsking(true);

    if (isDemoMode()) {
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                loading: false,
                error: "AI is niet beschikbaar in demo-modus.",
              }
            : turn,
        ),
      );
      setAsking(false);
      return;
    }

    try {
      let trainingSnapshot: TrainingSnapshot | undefined;

      if (isTrainingDataQuestion(question)) {
        trainingSnapshot = await buildTrainingSnapshot(
          { id: athleteId, name: athleteName },
          question,
        );
      }

      const searchItems = buildDashboardSearchItems(userRole, 0, [
        { id: athleteId, full_name: athleteName },
      ]);

      const response = await fetch("/api/dashboard-ai", {
        method: "POST",
        headers: await getApiAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          query: question,
          role: userRole,
          knowledgeScope: userRole === "atleet" ? "athlete" : "coach",
          trainingSnapshot,
          pages: searchItems
            .filter((item) => item.kind === "page" && item.href)
            .map((item) => ({
              title: item.title,
              href: item.href!,
              description: item.description,
            })),
          athletes: [{ name: athleteName, href: `/profile/${athleteId}` }],
          commands: searchItems
            .filter((item) => item.kind === "command" && item.command)
            .map((item) => ({
              command: item.command!,
              description: item.description,
              requiresChat: item.requiresChat,
            })),
        }),
      });

      const payload = (await response.json()) as {
        answer?: string;
        error?: string;
        sources?: string[];
      };

      if (!response.ok) {
        throw new Error(payload.error || "AI-antwoord ophalen mislukt.");
      }

      const answer = payload.answer || "Geen antwoord ontvangen.";

      if (userRole === "atleet") {
        void logAthleteAiChatTurn({
          athleteId,
          question,
          answer,
          knowledgeScope: "athlete",
          sources: payload.sources ?? [],
        });
      }

      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                loading: false,
                answer,
              }
            : turn,
        ),
      );
    } catch (error) {
      if (userRole === "atleet") {
        void logAthleteAiChatTurn({
          athleteId,
          question,
          answer: error instanceof Error ? error.message : null,
          knowledgeScope: "athlete",
          hadError: true,
        });
      }
      setTurns((current) =>
        current.map((turn) =>
          turn.id === turnId
            ? {
                ...turn,
                loading: false,
                error:
                  error instanceof Error
                    ? error.message
                    : "Kon geen verbinding maken met de AI.",
              }
            : turn,
        ),
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <aside
      className={`${CHAT_SIDE_PANEL_CLASS} max-md:fixed max-md:inset-0 max-md:z-[70] max-md:w-full max-md:max-w-none max-md:border-r-0`}
    >
      <div className="chat-panel-header">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-app-accent" />
            <h2 className="truncate chat-panel-title truncate">
              AI-assistent
            </h2>
          </div>
          <p className="truncate chat-panel-subtitle truncate">
            {userRole === "atleet"
              ? "Atleten-kennisbank"
              : `Context: ${athleteName}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ui-icon-btn app-focus-ring"
          aria-label="AI sluiten"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 mobile-scroll"
      >
        {turns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-app-accent/25 bg-app-accent-muted p-4 text-sm text-purple-900">
            <p className="font-semibold">Stel een vraag over training of de app</p>
            <p className="mt-2 text-app-accent">
              {userRole === "atleet" ? (
                <>
                  Bijvoorbeeld: &quot;Hoe log ik mijn sets?&quot;, &quot;Wat
                  betekent RPE 8?&quot; of &quot;Waar vind ik de wedstrijd
                  checklist?&quot;
                </>
              ) : (
                <>
                  Bijvoorbeeld: &quot;Hoe log ik mijn sets?&quot; of &quot;Wat
                  betekent RPE 8?&quot; Of over data: &quot;Hoeveel squat volume
                  deed {athleteName} de afgelopen weken?&quot;
                </>
              )}
            </p>
          </div>
        ) : null}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-3">
            <div className="chat-bubble-own ml-auto max-w-[92%] px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {turn.question}
              </p>
            </div>

            <div className="chat-bubble-other max-w-[92%] px-4 py-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-app-accent">
                AI-assistent
              </p>
              {turn.loading ? (
                <p className="text-sm text-app-muted">Antwoord laden...</p>
              ) : turn.error ? (
                <p className="text-sm text-app-destructive">{turn.error}</p>
              ) : (
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-app-text">
                  {turn.answer}
                </p>
              )}

              {!turn.loading && !turn.error && turn.answer && onShareToChat ? (
                <button
                  type="button"
                  onClick={() => void onShareToChat(turn.question, turn.answer)}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl border border-app-accent/25 bg-app-surface px-3 py-1.5 text-xs font-semibold text-app-accent hover:bg-app-accent-muted"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  Deel in chat
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t border-app-border bg-app-surface p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void askQuestion(input);
                setInput("");
              }
            }}
            rows={2}
            placeholder="Stel je vraag..."
            className="min-h-[44px] flex-1 resize-none rounded-2xl border border-app-border-strong px-3 py-2 text-base outline-none focus:border-app-accent focus:shadow-[0_0_0_3px_var(--app-accent-muted)] md:text-sm"
          />
          <button
            type="button"
            disabled={asking || !input.trim()}
            onClick={() => {
              void askQuestion(input);
              setInput("");
            }}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-app-accent text-white disabled:opacity-40"
            aria-label="Vraag stellen"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
