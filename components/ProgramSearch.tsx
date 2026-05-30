"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildProgramSearchItems,
  filterProgramSearchItems,
  formatProgramContextForAi,
  type ProgramSearchContext,
  type ProgramSearchItem,
} from "@/lib/programSearch";

type ProgramSearchProps = {
  context: ProgramSearchContext;
  className?: string;
};

type AiResult = {
  answer: string;
  href?: string | null;
  command?: string | null;
  label?: string | null;
  sources?: string[];
};

export default function ProgramSearch({
  context,
  className = "",
}: ProgramSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const items = useMemo(() => buildProgramSearchItems(context), [context]);
  const results = useMemo(
    () => filterProgramSearchItems(items, query),
    [items, query],
  );

  const programContextText = useMemo(
    () => formatProgramContextForAi(context),
    [context],
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

  function selectItem(item: ProgramSearchItem) {
    setOpen(false);
    setQuery("");

    if (item.href) {
      router.push(item.href);
      return;
    }

    if (item.anchorId) {
      const element = document.getElementById(item.anchorId);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }

  async function askAi(fallbackQuery?: string) {
    const question = (fallbackQuery ?? query).trim();
    if (!question || aiLoading) return;

    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    setOpen(true);

    try {
      const response = await fetch("/api/dashboard-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: question,
          role: "coach",
          knowledgeScope: "coach",
          trainingContext: programContextText
            ? `PROGRAMMA CONTEXT:\n${programContextText}`
            : undefined,
          pages: [
            {
              title: "Programma's",
              href: "/programs",
              description: "Trainingsschema's beheren",
            },
            {
              title: "Data",
              href: "/data",
              description: "Statistieken en ruwe data",
            },
          ],
          athletes: context.athleteId
            ? [
                {
                  name: context.athleteName || "Atleet",
                  href: `/profile/${context.athleteId}`,
                },
              ]
            : [],
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

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && event.key === "ArrowDown") {
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

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        type="search"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Zoek oefeningen in dit programma of stel een AI-vraag..."
        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
      />

      {open && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          {results.length > 0 && (
            <ul className="max-h-64 overflow-y-auto py-1">
              {results.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectItem(item)}
                    className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition ${
                      index === activeIndex ? "bg-gray-100" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className="text-base">
                      {item.kind === "exercise"
                        ? "🏋️"
                        : item.kind === "week"
                          ? "📅"
                          : item.kind === "athlete"
                            ? "👤"
                            : "📄"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-black">
                        {item.title}
                      </span>
                      <span className="block truncate text-xs text-gray-500">
                        {item.description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {showAiSection && (
            <div
              className={`border-gray-100 px-4 py-3 ${results.length > 0 ? "border-t" : ""}`}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                AI binnen programmacontext
              </p>

              {aiLoading ? (
                <p className="text-sm text-gray-500">AI denkt na...</p>
              ) : aiError ? (
                <p className="text-sm text-red-600">{aiError}</p>
              ) : aiResult ? (
                <p className="whitespace-pre-line text-sm text-gray-700">
                  {aiResult.answer}
                </p>
              ) : (
                <p className="text-sm text-gray-500">
                  Druk Enter om AI te vragen over dit block, deze week of
                  oefeningen.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
