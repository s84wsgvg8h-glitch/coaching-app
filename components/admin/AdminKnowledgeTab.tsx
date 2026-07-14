"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Eye,
  MessageSquare,
  Plus,
  Trash2,
} from "lucide-react";
import SearchInput from "@/components/ui/SearchInput";
import { adminFetch } from "@/lib/adminFetch";
import type { AdminKnowledgeChunkRow } from "@/lib/adminKnowledge";
import {
  AdminFilterBar,
  AdminPageHeader,
  AdminPagination,
} from "@/components/admin/AdminPageParts";
import { AdminLoading, AdminPanel, AdminPanelHeader } from "@/components/admin/AdminUi";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

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
  const formRef = useRef<HTMLDivElement>(null);
  const [chunks, setChunks] = useState<AdminKnowledgeChunkRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedChunk, setSelectedChunk] =
    useState<AdminKnowledgeChunkRow | null>(null);

  const [search, setSearch] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | "coach" | "athlete">(
    "all",
  );
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  async function load() {
    setLoading(true);
    const result = await adminFetch<{ chunks: AdminKnowledgeChunkRow[] }>(
      "/api/admin/knowledge",
    );
    if (result.data) setChunks(result.data.chunks);
    setLoading(false);
  }

  useEffect(() => {
    deferEffectUpdate(() => {
      void load();
    });
  }, []);

  useEffect(() => {
    const raw =
      typeof window !== "undefined"
        ? sessionStorage.getItem("admin-knowledge-prefill")
        : null;
    if (!raw) return;

    try {
      const prefill = JSON.parse(raw) as Partial<typeof emptyForm>;
      deferEffectUpdate(() => {
        setForm((current) => ({
          ...current,
          title: prefill.title || current.title,
          content: prefill.content || current.content,
          category: prefill.category || current.category,
          keywords: prefill.keywords || current.keywords,
          scope: prefill.scope || current.scope,
        }));
      });
      sessionStorage.removeItem("admin-knowledge-prefill");
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      sessionStorage.removeItem("admin-knowledge-prefill");
    }
  }, []);

  const categories = useMemo(() => {
    const set = new Set(chunks.map((c) => c.category).filter(Boolean));
    return Array.from(set).sort();
  }, [chunks]);

  const filteredChunks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return chunks.filter((chunk) => {
      if (scopeFilter !== "all" && chunk.scope !== scopeFilter) return false;
      if (categoryFilter !== "all" && chunk.category !== categoryFilter)
        return false;
      if (statusFilter === "active" && !chunk.active) return false;
      if (statusFilter === "inactive" && chunk.active) return false;
      if (!q) return true;
      return (
        chunk.title.toLowerCase().includes(q) ||
        chunk.chunk_key.toLowerCase().includes(q) ||
        chunk.category.toLowerCase().includes(q) ||
        (chunk.keywords || []).some((k) => k.toLowerCase().includes(q))
      );
    });
  }, [chunks, search, scopeFilter, categoryFilter, statusFilter]);

  const paginatedChunks = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredChunks.slice(start, start + pageSize);
  }, [filteredChunks, page, pageSize]);

  useEffect(() => {
    deferEffectUpdate(() => {
      setPage(1);
    });
  }, [search, scopeFilter, categoryFilter, statusFilter, pageSize]);

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

    resetForm();
    void load();
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setSelectedChunk(null);
  }

  function startEdit(chunk: AdminKnowledgeChunkRow) {
    setEditingId(chunk.id);
    setSelectedChunk(chunk);
    setForm({
      scope: chunk.scope,
      chunk_key: chunk.chunk_key,
      title: chunk.title,
      category: chunk.category,
      content: chunk.content,
      keywords: (chunk.keywords || []).join(", "),
      active: chunk.active,
    });
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function selectRow(chunk: AdminKnowledgeChunkRow) {
    setSelectedChunk(chunk);
  }

  async function remove(id: string) {
    if (!window.confirm("Chunk permanent verwijderen?")) return;

    const result = await adminFetch(`/api/admin/knowledge?id=${id}`, {
      method: "DELETE",
    });
    if (result.error) {
      alert(result.error);
      return;
    }
    if (editingId === id) resetForm();
    else if (selectedChunk?.id === id) setSelectedChunk(null);
    void load();
  }

  function exportChunks() {
    const blob = new Blob([JSON.stringify(chunks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `kennisbank-chunks-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function scrollToNewChunk() {
    resetForm();
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const previewFromForm = Boolean(editingId) || !selectedChunk;
  const previewTitle = previewFromForm
    ? form.title || (editingId ? "Chunk bewerken…" : "Nieuwe chunk")
    : selectedChunk!.title;
  const previewContent = previewFromForm
    ? form.content || "Begin met typen om een preview te zien."
    : selectedChunk!.content;
  const previewMeta = previewFromForm
    ? {
        scope: form.scope,
        category: form.category,
        keywords: form.keywords,
      }
    : {
        scope: selectedChunk!.scope,
        category: selectedChunk!.category,
        keywords: (selectedChunk!.keywords || []).join(", "),
      };

  if (loading) {
    return <AdminLoading label="Kennisbank laden…" />;
  }

  return (
    <div className="admin-tab-page">
      <AdminPageHeader
        title="Kennisbank"
        subtitle="Beheer AI-kennischunks voor coaches en atleten. Chunks voeden de AI-assistent in chat en kennisbank."
        icon={MessageSquare}
        actions={
          <>
            <button
              type="button"
              onClick={exportChunks}
              className="admin-btn admin-btn--ghost w-full sm:w-auto"
            >
              <Download className="h-4 w-4" />
              Exporteer
            </button>
            <button
              type="button"
              onClick={scrollToNewChunk}
              className="admin-btn admin-btn--primary w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Nieuwe chunk
            </button>
          </>
        }
      />

      <div className="admin-knowledge-layout">
        <div ref={formRef} className="min-w-0 space-y-4">
          <AdminPanel>
            <AdminPanelHeader
              title={editingId ? "Chunk bewerken" : "Nieuwe chunk"}
              description="Vul scope, identiteit en inhoud in. Markdown wordt ondersteund."
            />

            <div className="mt-4 space-y-5">
              <section>
                <h3 className="admin-label mb-2 font-semibold text-app-text">
                  Scope & identiteit
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="admin-field !mt-0 block">
                    <span className="admin-label">Scope</span>
                    <select
                      value={form.scope}
                      onChange={(event) =>
                        setForm((f) => ({
                          ...f,
                          scope: event.target.value as "coach" | "athlete",
                        }))
                      }
                      className="admin-select mt-1"
                    >
                      <option value="coach">Coach</option>
                      <option value="athlete">Atleet</option>
                    </select>
                  </label>
                  <label className="admin-field !mt-0 block">
                    <span className="admin-label">Chunk key</span>
                    <input
                      value={form.chunk_key}
                      onChange={(event) =>
                        setForm((f) => ({
                          ...f,
                          chunk_key: event.target.value,
                        }))
                      }
                      placeholder="bijv. admin-tip-1"
                      className="admin-input mt-1"
                    />
                  </label>
                  <label className="admin-field !mt-0 block">
                    <span className="admin-label">Titel</span>
                    <input
                      value={form.title}
                      onChange={(event) =>
                        setForm((f) => ({ ...f, title: event.target.value }))
                      }
                      placeholder="Titel van de chunk"
                      className="admin-input mt-1"
                    />
                  </label>
                  <label className="admin-field !mt-0 block">
                    <span className="admin-label">Categorie</span>
                    <input
                      value={form.category}
                      onChange={(event) =>
                        setForm((f) => ({
                          ...f,
                          category: event.target.value,
                        }))
                      }
                      placeholder="bijv. training, voeding"
                      className="admin-input mt-1"
                    />
                  </label>
                </div>
              </section>

              <section>
                <h3 className="admin-label mb-2 font-semibold text-app-text">
                  Inhoud
                </h3>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-black/25">
                  <div className="flex flex-wrap gap-1 border-b border-white/8 px-2 py-2">
                    {["**vet**", "*cursief*", "`code`", "## Kop", "- Lijst"].map(
                      (label) => (
                        <span
                          key={label}
                          className="rounded-md bg-app-surface-hover px-2 py-1 text-[11px] font-semibold text-app-muted"
                        >
                          {label}
                        </span>
                      ),
                    )}
                  </div>
                  <textarea
                    value={form.content}
                    onChange={(event) =>
                      setForm((f) => ({ ...f, content: event.target.value }))
                    }
                    rows={8}
                    placeholder="Markdown-inhoud…"
                    className="min-h-[180px] w-full resize-y border-0 bg-transparent px-3 py-2.5 text-[13px] text-app-text outline-none"
                  />
                </div>
              </section>

              <section>
                <h3 className="admin-label mb-2 font-semibold text-app-text">
                  Metadata
                </h3>
                <label className="admin-field !mt-0 block">
                  <span className="admin-label">Keywords</span>
                  <input
                    value={form.keywords}
                    onChange={(event) =>
                      setForm((f) => ({
                        ...f,
                        keywords: event.target.value,
                      }))
                    }
                    placeholder="komma-gescheiden, bijv. squat, techniek"
                    className="admin-input mt-1"
                  />
                </label>
              </section>

              <div className="flex flex-col gap-4 border-t border-white/8 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="admin-toggle-row">
                  <div>
                    <p className="admin-strong text-[13px]">
                      Actief in kennisbank
                    </p>
                    <p className="admin-muted text-[12px]">
                      Inactieve chunks worden niet aan AI getoond.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.active}
                    className={`admin-toggle ${form.active ? "is-on" : ""}`}
                    onClick={() =>
                      setForm((f) => ({ ...f, active: !f.active }))
                    }
                  >
                    <span className="admin-toggle-knob" />
                  </button>
                </div>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  {editingId ? (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="admin-btn admin-btn--ghost w-full sm:w-auto"
                    >
                      Annuleren
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => void save()}
                    className="admin-btn admin-btn--primary w-full sm:w-auto"
                  >
                    Opslaan
                  </button>
                </div>
              </div>
            </div>
          </AdminPanel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <AdminPanel flush className="!p-0">
            <AdminFilterBar>
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Zoek op titel, key of keyword…"
                variant="rounded"
                className="min-w-0 flex-1"
              />
              <select
                value={scopeFilter}
                onChange={(event) =>
                  setScopeFilter(
                    event.target.value as "all" | "coach" | "athlete",
                  )
                }
                className="admin-select admin-toolbar-select !min-h-[44px] !w-full sm:!w-auto"
              >
                <option value="all">Alle scopes</option>
                <option value="coach">Coach</option>
                <option value="athlete">Atleet</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="admin-select admin-toolbar-select !min-h-[44px] !w-full sm:!w-auto"
              >
                <option value="all">Alle categorieën</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | "active" | "inactive",
                  )
                }
                className="admin-select admin-toolbar-select !min-h-[44px] !w-full sm:!w-auto"
              >
                <option value="all">Alle statussen</option>
                <option value="active">Actief</option>
                <option value="inactive">Inactief</option>
              </select>
            </AdminFilterBar>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Titel</th>
                    <th className="admin-col-hide-sm">Scope</th>
                    <th className="admin-col-hide-sm">Categorie</th>
                    <th>Status</th>
                    <th className="w-10" aria-label="Acties" />
                  </tr>
                </thead>
                <tbody>
                  {paginatedChunks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="admin-empty">
                        Geen chunks gevonden.
                      </td>
                    </tr>
                  ) : (
                    paginatedChunks.map((chunk) => {
                      const isSelected =
                        selectedChunk?.id === chunk.id ||
                        editingId === chunk.id;
                      return (
                        <tr
                          key={chunk.id}
                          className={`cursor-pointer ${isSelected ? "bg-blue-500/10" : ""}`}
                          onClick={() => selectRow(chunk)}
                          onDoubleClick={() => startEdit(chunk)}
                        >
                          <td>
                            <p className="admin-strong">{chunk.title}</p>
                            <p className="admin-subtle text-[11px]">
                              {chunk.chunk_key}
                            </p>
                          </td>
                          <td className="admin-col-hide-sm capitalize">
                            {chunk.scope}
                          </td>
                          <td className="admin-col-hide-sm">
                            {chunk.category || "—"}
                          </td>
                          <td>
                            <span
                              className={
                                chunk.active
                                  ? "admin-badge admin-badge--success"
                                  : "admin-badge"
                              }
                            >
                              {chunk.active ? "Actief" : "Inactief"}
                            </span>
                          </td>
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                title="Bewerken"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  startEdit(chunk);
                                }}
                                className="admin-btn admin-btn--ghost admin-btn--sm !min-h-[36px] !min-w-[36px] !px-0"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Verwijderen"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  void remove(chunk.id);
                                }}
                                className="admin-btn admin-btn--danger admin-btn--sm !min-h-[36px] !min-w-[36px] !px-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <AdminPagination
              page={page}
              pageSize={pageSize}
              total={filteredChunks.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          </AdminPanel>

          <AdminPanel>
            <AdminPanelHeader
              title="Preview"
              description="Voorbeeld van geselecteerde of bewerkte chunk."
            />
            <div className="mt-3">
              <p className="admin-strong">{previewTitle}</p>
              {previewFromForm && !form.content && !editingId ? null : (
                <p className="admin-muted mt-1 text-[12px]">
                  {previewMeta.scope} · {previewMeta.category || "—"}
                  {previewMeta.keywords ? ` · ${previewMeta.keywords}` : ""}
                </p>
              )}
              <div className="admin-knowledge-preview mt-3 max-h-[280px] overflow-y-auto">
                {previewContent}
              </div>
            </div>
          </AdminPanel>
        </div>
      </div>
    </div>
  );
}
