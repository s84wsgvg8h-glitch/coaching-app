"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/adminFetch";
import type { AdminKnowledgeChunkRow } from "@/lib/adminKnowledge";

const emptyForm = {
  scope: "coach" as "coach" | "athlete",
  chunk_key: "",
  title: "",
  category: "",
  content: "",
  keywords: "",
  active: true,
};

export default function AdminKnowledgeTab() {
  const [chunks, setChunks] = useState<AdminKnowledgeChunkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const result = await adminFetch<{ chunks: AdminKnowledgeChunkRow[] }>(
      "/api/admin/knowledge",
    );
    if (result.data) setChunks(result.data.chunks);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    const keywords = form.keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const payload = {
      scope: form.scope,
      chunk_key: form.chunk_key,
      title: form.title,
      category: form.category,
      content: form.content,
      keywords,
      active: form.active,
    };

    const result = editingId
      ? await adminFetch("/api/admin/knowledge", {
          method: "PATCH",
          body: JSON.stringify({ id: editingId, ...payload }),
        })
      : await adminFetch("/api/admin/knowledge", {
          method: "POST",
          body: JSON.stringify(payload),
        });

    if (result.error) {
      alert(result.error);
      return;
    }

    setForm(emptyForm);
    setEditingId(null);
    void load();
  }

  function startEdit(chunk: AdminKnowledgeChunkRow) {
    setEditingId(chunk.id);
    setForm({
      scope: chunk.scope,
      chunk_key: chunk.chunk_key,
      title: chunk.title,
      category: chunk.category,
      content: chunk.content,
      keywords: (chunk.keywords || []).join(", "),
      active: chunk.active,
    });
  }

  async function remove(id: string) {
    const result = await adminFetch(`/api/admin/knowledge?id=${id}`, {
      method: "DELETE",
    });
    if (result.error) alert(result.error);
    else void load();
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Kennisbank laden...</p>;
  }

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">
          {editingId ? "Chunk bewerken" : "Nieuwe kennis-chunk"}
        </h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            value={form.scope}
            onChange={(event) =>
              setForm((f) => ({
                ...f,
                scope: event.target.value as "coach" | "athlete",
              }))
            }
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="coach">Coach</option>
            <option value="athlete">Atleet</option>
          </select>
          <input
            value={form.chunk_key}
            onChange={(event) =>
              setForm((f) => ({ ...f, chunk_key: event.target.value }))
            }
            placeholder="Unieke key (bijv. admin-tip-1)"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={form.title}
            onChange={(event) =>
              setForm((f) => ({ ...f, title: event.target.value }))
            }
            placeholder="Titel"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
          <input
            value={form.category}
            onChange={(event) =>
              setForm((f) => ({ ...f, category: event.target.value }))
            }
            placeholder="Categorie"
            className="rounded-xl border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={form.content}
          onChange={(event) =>
            setForm((f) => ({ ...f, content: event.target.value }))
          }
          rows={5}
          placeholder="Inhoud (markdown)"
          className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          value={form.keywords}
          onChange={(event) =>
            setForm((f) => ({ ...f, keywords: event.target.value }))
          }
          placeholder="Keywords, komma-gescheiden"
          className="mt-3 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm"
        />
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) =>
              setForm((f) => ({ ...f, active: event.target.checked }))
            }
          />
          Actief (zichtbaar in kennisbank)
        </label>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => void save()}
            className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
          >
            Opslaan
          </button>
          {editingId ? (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
              }}
              className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold"
            >
              Annuleren
            </button>
          ) : null}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-xl">
        <h2 className="text-lg font-bold text-black">
          Database-chunks ({chunks.length})
        </h2>
        <div className="mt-4 space-y-3">
          {chunks.map((chunk) => (
            <div
              key={chunk.id}
              className="rounded-xl border border-gray-200 p-3 text-sm"
            >
              <p className="font-semibold text-black">
                {chunk.title}{" "}
                <span className="text-gray-400">
                  ({chunk.scope} · {chunk.chunk_key})
                </span>
              </p>
              <p className="text-gray-500">
                {chunk.category} · {chunk.active ? "actief" : "inactief"}
              </p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(chunk)}
                  className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold"
                >
                  Bewerken
                </button>
                <button
                  type="button"
                  onClick={() => void remove(chunk.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                >
                  Verwijderen
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
