"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import type { KnowledgeChunk } from "@/lib/knowledgeBase";
import {
  filterKnowledgeChunks,
  getKnowledgeCategories,
  groupKnowledgeByCategory,
  type KnowledgeBrowseStats,
} from "@/lib/knowledgeBrowse";
import { supabase } from "@/lib/supabaseClient";

export default function KennisbankPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alle");
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [stats, setStats] = useState<KnowledgeBrowseStats | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scope, setScope] = useState<"coach" | "athlete">("coach");

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      const knowledgeScope = profile?.role === "atleet" ? "athlete" : "coach";
      setScope(knowledgeScope);

      try {
        const response = await fetch(
          `/api/knowledge-base?scope=${knowledgeScope}`,
        );
        const payload = (await response.json()) as {
          curated: KnowledgeChunk[];
          stats: KnowledgeBrowseStats;
        };

        if (response.ok) {
          setChunks(payload.curated);
          setStats(payload.stats);
        }
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const categories = useMemo(() => getKnowledgeCategories(chunks), [chunks]);

  const filteredChunks = useMemo(() => {
    const searched = filterKnowledgeChunks(chunks, query);
    if (category === "Alle") return searched;
    return searched.filter((chunk) => chunk.category === category);
  }, [chunks, query, category]);

  const grouped = useMemo(
    () => groupKnowledgeByCategory(filteredChunks),
    [filteredChunks],
  );

  return (
    <AppShell contentClassName="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-3xl bg-white p-6 shadow-xl md:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
            {scope === "athlete" ? "Atleten AI kennisbank" : "AI kennisbank"}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-black md:text-4xl">
            Kennisbank
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-gray-500 md:text-base">
            {scope === "athlete"
              ? "Alle onderwerpen waar de AI-assistent in je chat antwoorden op baseert. Zonder match zegt de AI dat het antwoord niet in de kennisbank staat."
              : "Alle curated chunks waar de dashboard-AI antwoorden op baseert. Zonder match in deze lijst zegt de AI dat het antwoord niet in de kennisbank staat."}
          </p>

          {stats ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-gray-100 px-4 py-2 text-sm font-semibold text-gray-700">
                {stats.curatedCount} curated chunks
              </span>
              {stats.hasLocalPdf ? (
                <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                  +{stats.localExcerptCount} lokale ESS PDF excerpts (alleen dev)
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-xl md:p-6">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Zoek titel, categorie, keywords of inhoud..."
            className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
          />

          <div className="mt-4 flex flex-wrap gap-2">
            {["Alle", ...categories].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setCategory(option)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  category === option
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-xl">
            Kennisbank laden...
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center text-gray-500 shadow-xl">
            Geen chunks gevonden voor deze zoekopdracht.
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.category} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-lg font-bold text-black">{group.category}</h2>
                <span className="text-sm text-gray-400">{group.items.length}</span>
              </div>

              <div className="space-y-3">
                {group.items.map((chunk) => {
                  const isExpanded = expandedId === chunk.id;

                  return (
                    <article
                      key={chunk.id}
                      className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : chunk.id)
                        }
                        className="flex w-full items-start justify-between gap-4 text-left"
                      >
                        <div>
                          <h3 className="font-semibold text-black">{chunk.title}</h3>
                          <p className="mt-1 text-xs text-gray-400">{chunk.id}</p>
                        </div>
                        <span className="shrink-0 text-sm text-gray-400">
                          {isExpanded ? "−" : "+"}
                        </span>
                      </button>

                      {isExpanded ? (
                        <div className="mt-4 space-y-4 border-t border-gray-100 pt-4">
                          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">
                            {chunk.content}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {chunk.keywords.map((keyword) => (
                              <span
                                key={keyword}
                                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="mt-3 line-clamp-2 text-sm text-gray-500">
                          {chunk.content}
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}
