"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import AppShell from "@/components/AppShell";
import SearchInput from "@/components/ui/SearchInput";
import { PageContainer, PageHeader, Panel } from "@/components/ui/design-system";
import { PageLoading } from "@/components/ui/Skeleton";
import AiVragenPanel from "@/components/kennisbank/AiVragenPanel";
import type { KnowledgeChunk } from "@/lib/knowledgeBase";
import {
  filterKnowledgeChunks,
  getCuratedKnowledge,
  getKnowledgeCategories,
  groupKnowledgeByCategory,
  type KnowledgeBrowseStats,
} from "@/lib/knowledgeBrowse";
import { loadActiveAdminKnowledgeChunks } from "@/lib/adminKnowledge";
import { supabase } from "@/lib/supabaseClient";
import { isAthleteRole, isCoachLikeRole } from "@/lib/authRoles";

type KennisbankTab = "chunks" | "vragen";

function KennisbankPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: KennisbankTab =
    tabParam === "vragen" ? "vragen" : "chunks";

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Alle");
  const [chunks, setChunks] = useState<KnowledgeChunk[]>([]);
  const [stats, setStats] = useState<KnowledgeBrowseStats | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [scope, setScope] = useState<"coach" | "athlete">("coach");

  useEffect(() => {
    document.title = "Kennisbank";

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

      if (isAthleteRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      setRole(profile?.role || "");
      const knowledgeScope = profile?.role === "atleet" ? "athlete" : "coach";
      setScope(knowledgeScope);

      const baseChunks = getCuratedKnowledge(knowledgeScope);
      setChunks(baseChunks);
      setStats({
        curatedCount: baseChunks.length,
        localCount: 0,
        localReferenceCount: 0,
        localExcerptCount: 0,
        hasLocalPdf: false,
      });
      setLoading(false);

      void loadActiveAdminKnowledgeChunks(knowledgeScope).then((adminChunks) => {
        if (adminChunks.length === 0) return;
        const merged = [...baseChunks];
        const byId = new Map(merged.map((chunk) => [chunk.id, chunk]));
        for (const chunk of adminChunks) {
          byId.set(chunk.id, chunk);
        }
        setChunks([...byId.values()]);
        setStats((current) =>
          current
            ? { ...current, curatedCount: byId.size }
            : {
                curatedCount: byId.size,
                localCount: 0,
                localReferenceCount: 0,
                localExcerptCount: 0,
                hasLocalPdf: false,
              },
        );
      });
    }

    void load();
  }, []);

  function switchTab(tab: KennisbankTab) {
    router.replace(tab === "chunks" ? "/kennisbank" : "/kennisbank?tab=vragen", {
      scroll: false,
    });
  }

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

  const canViewAiVragen = isCoachLikeRole(role);

  return (
    <AppShell>
      <PageContainer size="full" className="space-y-4">
        <PageHeader
          eyebrow={
            scope === "athlete" ? "Atleten kennisbank" : "Coach kennisbank"
          }
          title="Kennisbank & AI-vragen"
          description="Coachingkennis en antwoorden voor atleten-AI op één plek."
          actions={
            canViewAiVragen ? (
              <div className="flex w-full gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => switchTab("chunks")}
                  className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold transition app-focus-ring sm:flex-none ${
                    activeTab === "chunks"
                      ? "bg-app-accent text-white"
                      : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover"
                  }`}
                >
                  Kennisbank
                </button>
                <button
                  type="button"
                  onClick={() => switchTab("vragen")}
                  className={`min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold transition app-focus-ring sm:flex-none ${
                    activeTab === "vragen"
                      ? "bg-app-accent text-white"
                      : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover"
                  }`}
                >
                  AI-vragen
                </button>
              </div>
            ) : null
          }
        />

        {activeTab === "vragen" && canViewAiVragen ? (
          <Panel>
            <AiVragenPanel />
          </Panel>
        ) : (
          <>
            <Panel>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Zoek titel, categorie, keywords of inhoud..."
                  variant="rounded"
                  className="w-full min-w-0 flex-1"
                />
                {stats ? (
                  <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-app-border bg-app-surface-muted px-3 py-1.5 text-xs font-semibold text-app-muted sm:self-auto">
                    <span className="h-1.5 w-1.5 rounded-full bg-app-accent"></span>
                    {stats.curatedCount} kennisblokken
                  </span>
                ) : null}
              </div>

              <div className="-mx-2 mt-4 flex gap-2 overflow-x-auto px-2 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0">
                {["Alle", ...categories].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCategory(option)}
                    className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold transition app-focus-ring ${
                      category === option
                        ? "bg-app-accent text-white"
                        : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </Panel>

            {loading ? (
              <Panel>
                <PageLoading label="Kennisbank laden…" />
              </Panel>
            ) : grouped.length === 0 ? (
              <Panel className="py-10 text-center">
                <p className="text-sm text-app-muted">
                  Geen resultaten voor deze zoekopdracht.
                </p>
              </Panel>
            ) : (
              grouped.map((group) => (
                <section key={group.category} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-[15px] font-semibold tracking-tight text-app-text">
                      {group.category}
                    </h2>
                    <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-xs font-semibold text-app-muted">{group.items.length}</span>
                  </div>

                  <div className="space-y-3">
                    {group.items.map((chunk) => {
                      const isExpanded = expandedId === chunk.id;

                      return (
                        <article
                          key={chunk.id}
                          className="ui-panel transition-colors hover:border-app-border-strong"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(isExpanded ? null : chunk.id)
                            }
                            className="app-focus-ring flex w-full items-start justify-between gap-4 rounded-lg text-left"
                          >
                            <div className="min-w-0">
                              <h3 className="font-semibold text-app-text">
                                {chunk.title}
                              </h3>
                              <p className="mt-1 text-xs text-app-subtle">
                                {chunk.category}
                              </p>
                            </div>
                            <span className="mt-0.5 shrink-0 text-app-muted">
                              {isExpanded
                                ? <ChevronUp className="h-4 w-4" />
                                : <ChevronDown className="h-4 w-4" />}
                            </span>
                          </button>

                          {isExpanded ? (
                            <div className="mt-4 space-y-4 border-t border-app-border pt-4">
                              <p className="whitespace-pre-line text-sm leading-relaxed text-app-muted">
                                {chunk.content}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {chunk.keywords.map((keyword) => (
                                  <span
                                    key={keyword}
                                    className="rounded-full border border-app-border bg-app-surface px-3 py-1 text-xs font-medium text-app-muted"
                                  >
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="mt-3 line-clamp-2 text-sm text-app-muted">
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
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}

export default function KennisbankPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer size="full">
            <PageLoading label="Kennisbank laden…" />
          </PageContainer>
        </AppShell>
      }
    >
      <KennisbankPageInner />
    </Suspense>
  );
}
