"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BookPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { AthleteAiChatLogRow } from "@/lib/athleteAiChatLog";

const KNOWLEDGE_PREFILL_KEY = "admin-knowledge-prefill";

type FilterMode = "all" | "unknown" | "errors";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function AiVragenPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<AthleteAiChatLogRow[]>([]);
  const [filter, setFilter] = useState<FilterMode>("unknown");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("athlete_ai_chat_logs")
        .select(
          "id, athlete_id, coach_id, question, answer, knowledge_scope, sources, is_unknown, had_error, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const rows = (data || []) as AthleteAiChatLogRow[];
      const athleteIds = [...new Set(rows.map((row) => row.athlete_id))];
      const nameById = new Map<string, string | null>();

      if (athleteIds.length > 0) {
        const { data: athletes } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", athleteIds);

        for (const athlete of athletes || []) {
          nameById.set(athlete.id, athlete.full_name);
        }
      }

      setLogs(
        rows.map((row) => ({
          ...row,
          athlete: { full_name: nameById.get(row.athlete_id) ?? null },
        })),
      );
      setLoading(false);
    }

    void load();
  }, []);

  const filteredLogs = useMemo(() => {
    if (filter === "unknown") {
      return logs.filter((log) => log.is_unknown && !log.had_error);
    }
    if (filter === "errors") {
      return logs.filter((log) => log.had_error);
    }
    return logs;
  }, [filter, logs]);

  const unknownCount = logs.filter((log) => log.is_unknown && !log.had_error).length;
  const errorCount = logs.filter((log) => log.had_error).length;

  function addToKnowledge(log: AthleteAiChatLogRow) {
    const prefill = {
      title: log.question.slice(0, 120),
      content: `Vraag: ${log.question}\n\nAntwoord (huidig): ${log.answer || "—"}`,
      category: "ai-vragen",
      keywords: "ai,atleet",
      scope: "athlete" as const,
    };
    sessionStorage.setItem(KNOWLEDGE_PREFILL_KEY, JSON.stringify(prefill));
    router.push("/admin?tab=kennisbank");
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        Bekijk vragen die atleten aan de chat-AI stellen. Filter op onbekende
        antwoorden om ontbrekende kennis te vinden.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter("unknown")}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
            filter === "unknown"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-800"
          }`}
        >
          Onbekend ({unknownCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("errors")}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
            filter === "errors"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-800"
          }`}
        >
          Fouten ({errorCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`rounded-xl px-3 py-1.5 text-sm font-semibold ${
            filter === "all"
              ? "bg-black text-white"
              : "border border-gray-300 bg-white text-gray-800"
          }`}
        >
          Alles ({logs.length})
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Laden...</p>
      ) : filteredLogs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-600">
          Geen AI-vragen gevonden voor dit filter.
        </div>
      ) : (
        <ul className="space-y-4">
          {filteredLogs.map((log) => (
            <li
              key={log.id}
              className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className="font-semibold text-gray-800">
                  {log.athlete?.full_name || "Onbekende atleet"}
                </span>
                <span>·</span>
                <span>{formatDate(log.created_at)}</span>
                {log.is_unknown ? (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-900">
                    Onbekend
                  </span>
                ) : null}
                {log.had_error ? (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-800">
                    Fout
                  </span>
                ) : null}
              </div>

              <p className="text-sm font-semibold text-black">Vraag</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                {log.question}
              </p>

              <p className="mt-3 text-sm font-semibold text-black">Antwoord</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                {log.answer || "—"}
              </p>

              {Array.isArray(log.sources) && log.sources.length > 0 ? (
                <p className="mt-3 text-xs text-gray-500">
                  Bronnen: {log.sources.join(", ")}
                </p>
              ) : null}

              <button
                type="button"
                onClick={() => addToKnowledge(log)}
                className="mt-3 inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
              >
                <BookPlus className="h-3.5 w-3.5" />
                Maak concept-chunk
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
