"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildDashboardSearchItems,
  filterDashboardSearchItems,
  resolveDashboardSearchSelection,
  type DashboardSearchItem,
} from "@/lib/dashboardSearch";
import type { CoachSnapshot } from "@/lib/knowledgeSearch";
import {
  buildTrainingSnapshot,
  formatMissingAthletePrompt,
  isTrainingDataQuestion,
  resolveAthleteFromQuery,
  type TrainingSnapshot,
} from "@/lib/aiTrainingSnapshot";
import { isCoachLikeRole } from "@/lib/authRoles";
import { getApiAuthHeaders } from "@/lib/apiClient";
import { isDemoMode } from "@/lib/demo/demoMode";

type DashboardSearchProps = {
  role: string;
  pendingCount?: number;
  athletes?: Array<{ id: string; full_name: string | null }>;
  coachSnapshot?: CoachSnapshot;
  selfAthlete?: { id: string; name: string };
  variant?: "default" | "athlete";
};

type AiResult = {
  answer: string;
  href?: string | null;
  command?: string | null;
  label?: string | null;
  sources?: string[];
};

export default function DashboardSearch({
  role,
  pendingCount = 0,
  athletes = [],
  coachSnapshot,
  selfAthlete,
  variant = "default",
}: DashboardSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(
    () => buildDashboardSearchItems(role, pendingCount, athletes),
    [role, pendingCount, athletes],
  );

  const results = useMemo(
    () => filterDashboardSearchItems(items, query),
    [items, query],
  );

  const aiContext = useMemo(
    () => ({
      pages: items
        .filter((item) => item.kind === "page" && item.href)
        .map((item) => ({
          title: item.title,
          href: item.href!,
          description: item.description,
        })),
      athletes: items
        .filter((item) => item.kind === "athlete" && item.href)
        .map((item) => ({
          name: item.title,
          href: item.href!,
        })),
      commands: items
        .filter((item) => item.kind === "command" && item.command)
        .map((item) => ({
          command: item.command!,
          description: item.description,
          requiresChat: item.requiresChat,
        })),
    }),
    [items],
  );

  useEffect(() => {
    setActiveIndex(0);
    setAiResult(null);
    setAiError("");
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectItem(item: DashboardSearchItem) {
    const href = resolveDashboardSearchSelection(item);
    if (!href) return;

    setOpen(false);
    setQuery("");
    router.push(href);
  }

  async function askAi(fallbackQuery?: string) {
    const question = (fallbackQuery ?? query).trim();
    if (!question || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    setOpen(true);

    if (isDemoMode()) {
      setAiError("AI is niet beschikbaar in demo-modus.");
      setAiLoading(false);
      return;
    }

    let trainingSnapshot: TrainingSnapshot | undefined;
    let trainingContext: string | undefined;

    try {
      if (isTrainingDataQuestion(question)) {
        const athlete = resolveAthleteFromQuery(question, coachSnapshot, selfAthlete);
        if (athlete) {
          trainingSnapshot = await buildTrainingSnapshot(athlete, question);
        } else if (isCoachLikeRole(role)) {
          trainingContext = formatMissingAthletePrompt(coachSnapshot);
        }
      }

      const response = await fetch("/api/dashboard-ai", {
        method: "POST",
        headers: await getApiAuthHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          query: question,
          role,
          coachSnapshot,
          trainingSnapshot,
          trainingContext,
          ...aiContext,
        }),
      });

      const payload = (await response.json()) as AiResult & { error?: string };

      if (!response.ok) {
        setAiError(payload.error || "AI-antwoord ophalen mislukt.");
        return;
      }

      setAiResult(payload);
    } catch {
      setAiError("Kon geen verbinding maken met de AI.");
    } finally {
      setAiLoading(false);
    }
  }

  function openAiSuggestion() {
    if (aiResult?.href) {
      setOpen(false);
      setQuery("");
      router.push(aiResult.href);
      return;
    }

    if (aiResult?.command) {
      setOpen(false);
      setQuery("");
      router.push(`/chat?command=${encodeURIComponent(aiResult.command)}`);
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "/")) {
      setOpen(true);
      return;
    }

    if (event.key === "ArrowDown" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, results.length - 1));
      return;
    }

    if (event.key === "ArrowUp" && results.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (results[activeIndex]) {
        selectItem(results[activeIndex]);
        return;
      }

      void askAi();
      return;
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showAiSection =
    aiLoading || aiError || aiResult || (query.trim().length > 0 && results.length === 0);

  const isAthleteVariant = variant === "athlete";

  return (
    <div ref={containerRef} className="relative">
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={
          isAthleteVariant
            ? "Zoek modules, oefeningen of programmadagen..."
            : "Zoek pagina's, atleten, typ / voor commands, of stel een vraag..."
        }
        className={
          isAthleteVariant
            ? "athlete-dashboard-search-input w-full"
            : "w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
        }
      />

      {open && (
        <div
          className={
            isAthleteVariant
              ? "athlete-dashboard-search-dropdown absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden"
              : "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-20 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl"
          }
        >
          {results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectItem(item)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                      isAthleteVariant
                        ? index === activeIndex
                          ? "bg-white/8"
                          : "hover:bg-white/5"
                        : index === activeIndex
                          ? "bg-gray-100"
                          : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block font-semibold ${
                          isAthleteVariant ? "text-app-text" : "text-black"
                        }`}
                      >
                        {item.command || item.title}
                      </span>
                      <span
                        className={`block truncate text-xs ${
                          isAthleteVariant ? "text-app-muted" : "text-gray-500"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                    {item.kind === "command" && item.requiresChat && (
                      <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        Chat
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showAiSection && (
            <div
              className={`px-4 py-3 ${
                results.length > 0
                  ? isAthleteVariant
                    ? "border-t border-white/8"
                    : "border-t border-gray-100"
                  : ""
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
                  AI assistent
                </p>
                {!aiLoading && query.trim() && results.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => void askAi()}
                    className="text-xs font-semibold text-black hover:underline"
                  >
                    Vraag AI
                  </button>
                ) : null}
              </div>

              {aiLoading ? (
                <p className="text-sm text-gray-500">
                  {isTrainingDataQuestion(query.trim())
                    ? "Trainingsdata laden en analyseren..."
                    : "AI denkt na..."}
                </p>
              ) : aiError ? (
                <p className="text-sm text-red-600">{aiError}</p>
              ) : aiResult ? (
                <div className="space-y-3">
                  <p className="whitespace-pre-line text-sm text-gray-700">
                    {aiResult.answer}
                  </p>
                  {aiResult.sources && aiResult.sources.length > 0 ? (
                    <p className="text-[11px] text-gray-400">
                      Bronnen: {aiResult.sources.join(" · ")}
                    </p>
                  ) : null}
                  {(aiResult.href || aiResult.command) && (
                    <button
                      type="button"
                      onClick={openAiSuggestion}
                      className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                    >
                      {aiResult.label ||
                        (aiResult.command ? `Open ${aiResult.command}` : "Ga naar pagina")}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Druk Enter om AI te vragen, bijv. &quot;open het programma van Lisa&quot; of
                  &quot;waar zie ik BW grafieken?&quot;
                </p>
              )}
            </div>
          )}

          <div
            className={`border-t px-4 py-2 text-[11px] ${
              isAthleteVariant
                ? "border-white/8 text-app-muted"
                : "border-gray-100 text-gray-400"
            }`}
          >
            Pijltjes + Enter voor resultaten. Enter zonder match = AI. Typ{" "}
            <code
              className={`rounded px-1 ${
                isAthleteVariant ? "bg-white/8" : "bg-gray-100"
              }`}
            >
              /
            </code>{" "}
            voor commands.
          </div>
        </div>
      )}
    </div>
  );
}
