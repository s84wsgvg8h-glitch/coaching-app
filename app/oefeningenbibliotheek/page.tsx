"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import CollapsibleFilterSidebar from "@/components/ui/CollapsibleFilterSidebar";
import { supabase } from "@/lib/supabaseClient";
import { isAthleteRole, isCoachLikeRole } from "@/lib/authRoles";
import {
  deleteExerciseLibraryCategory,
  deleteExerciseLibraryItem,
  EXERCISE_LIBRARY_CATEGORIES,
  hideExerciseLibraryCategory,
  loadExerciseLibraryCategories,
  loadExerciseLibraryItemById,
  loadExerciseLibraryItems,
  loadHiddenExerciseLibraryCategories,
  saveExerciseLibraryCategory,
  saveExerciseLibraryItem,
  type ExerciseLibraryCategoryRow,
  type ExerciseLibraryItem,
} from "@/lib/exerciseLibrary";
import ExerciseLibraryCategoryNav, {
  categoryFilterLabel,
  emptyCategoryMessage,
  itemMatchesCategoryFilter,
  parseCategoryFilter,
} from "@/components/oefeningenbibliotheek/ExerciseLibraryCategoryNav";
import {
  removeExerciseLibraryStorage,
  uploadExerciseLibraryVideo,
} from "@/lib/exerciseLibraryVideos";
import { toStorageMetadata } from "@/lib/storage/types";
import ExerciseVideoRecorder from "@/components/ExerciseVideoRecorder";
import ExerciseLibraryVideoModal from "@/components/ExerciseLibraryVideoModal";

function emptyDraft(): Omit<
  ExerciseLibraryItem,
  "id" | "created_at" | "updated_at"
> {
  return {
    name: "",
    category: "Overig",
    subcategory: "",
    description: "",
    cues: "",
    video_url: "",
    video_path: "",
    thumbnail_url: "",
    storage_provider: "supabase",
    storage_bucket: null,
    storage_path: null,
    storage_content_type: null,
    storage_size_bytes: null,
    active: true,
    sort_order: 0,
  };
}

function setCompactDragImage(event: React.DragEvent, label: string) {
  const ghost = document.createElement("div");
  ghost.textContent = label;
  ghost.style.cssText =
    "position:fixed;top:-1000px;left:-1000px;padding:4px 8px;border-radius:8px;background:#4f8cff;color:#fff;font:600 11px/1.2 system-ui,sans-serif;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35);pointer-events:none;";
  document.body.appendChild(ghost);
  event.dataTransfer.setDragImage(ghost, 10, 10);
  window.setTimeout(() => ghost.remove(), 0);
}

export default function ExerciseLibraryPage() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [items, setItems] = useState<ExerciseLibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Alle");
  const [customCategories, setCustomCategories] = useState<
    ExerciseLibraryCategoryRow[]
  >([]);
  const [selectedItem, setSelectedItem] = useState<ExerciseLibraryItem | null>(
    null,
  );
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState("");
  const [hiddenBuiltinCategories, setHiddenBuiltinCategories] = useState<string[]>(
    [],
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCoach = isCoachLikeRole(role);

  useEffect(() => {
    document.title = "Oefeningenbibliotheek";
  }, []);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      setRole(profile?.role || "");

      if (isAthleteRole(profile?.role)) {
        window.location.href = "/programs";
        return;
      }

      setHiddenBuiltinCategories(loadHiddenExerciseLibraryCategories());

      const coachView = isCoachLikeRole(profile?.role);
      const [loadedItems, loadedCategories] = await Promise.all([
        loadExerciseLibraryItems(coachView),
        loadExerciseLibraryCategories(),
      ]);
      setItems(loadedItems);
      setCustomCategories(loadedCategories);
      setLoading(false);
    }

    void load();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter((item) => itemMatchesCategoryFilter(item, categoryFilter));
  }, [items, categoryFilter]);

  const categoryOptions = useMemo(() => {
    const names = new Set<string>([...EXERCISE_LIBRARY_CATEGORIES]);
    for (const row of customCategories) {
      if (!row.parent_id) names.add(row.name);
    }
    for (const item of items) {
      names.add(item.category);
    }
    return [...names];
  }, [customCategories, items]);

  const subcategoryOptions = useMemo(() => {
    const subs = new Set<string>();
    for (const row of customCategories) {
      if (row.parent_id) {
        const parent = customCategories.find((entry) => entry.id === row.parent_id);
        if (parent?.name === draft.category) subs.add(row.name);
      }
    }
    for (const item of items) {
      if (item.category === draft.category && item.subcategory) {
        subs.add(item.subcategory);
      }
    }
    return [...subs];
  }, [customCategories, draft.category, items]);

  async function refresh(includeInactive: boolean) {
    setItems(await loadExerciseLibraryItems(includeInactive));
    setCustomCategories(await loadExerciseLibraryCategories());
  }

  async function handleAddCategory(
    name: string,
    parentId: string | null,
    parentName?: string,
  ): Promise<boolean> {
    setCategoryError("");
    let resolvedParentId = parentId;

    if (!resolvedParentId && parentName) {
      const existing = customCategories.find(
        (row) => !row.parent_id && row.name === parentName,
      );
      if (existing) {
        resolvedParentId = existing.id;
      } else {
        const { data: rootRow, error: rootError } =
          await saveExerciseLibraryCategory(parentName, null);
        if (rootError || !rootRow) {
          const msg = rootError?.message || "Categorie aanmaken mislukt.";
          setCategoryError(msg);
          setMessage(msg);
          return false;
        }
        resolvedParentId = rootRow.id;
      }
    }

    const { data, error } = await saveExerciseLibraryCategory(name, resolvedParentId);
    if (error || !data) {
      const msg = error?.message || "Categorie opslaan mislukt.";
      setCategoryError(msg);
      setMessage(msg);
      return false;
    }

    await refresh(isCoach);
    setMessage(resolvedParentId ? "Subcategorie toegevoegd." : "Categorie toegevoegd.");
    return true;
  }

  async function handleMoveItemToCategory(filterKey: string) {
    if (!draggingItemId || !isCoach) return;

    const item = items.find((entry) => entry.id === draggingItemId);
    if (!item) return;

    const { category, subcategory } = parseCategoryFilter(filterKey);
    if (filterKey === "Alle") return;

    const { error } = await saveExerciseLibraryItem({
      ...item,
      category,
      subcategory,
    });

    setDraggingItemId(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCategoryFilter(filterKey);
    await refresh(isCoach);
    setMessage(`"${item.name}" verplaatst naar ${categoryFilterLabel(filterKey)}.`);
  }

  async function handleDeleteCategory(id: string | null, name: string) {
    if (!window.confirm(`"${name}" verwijderen?`)) return;

    if (!id) {
      hideExerciseLibraryCategory(name);
      setHiddenBuiltinCategories(loadHiddenExerciseLibraryCategories());
      if (categoryFilter.includes(name)) {
        setCategoryFilter("Alle");
      }
      setMessage("Categorie verborgen.");
      return;
    }

    const { error } = await deleteExerciseLibraryCategory(id);
    if (error) {
      setMessage(error.message);
      return;
    }

    if (categoryFilter.includes(name)) {
      setCategoryFilter("Alle");
    }

    await refresh(isCoach);
    setMessage("Categorie verwijderd.");
  }

  function resetForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setShowCreateForm(false);
  }

  async function startEdit(item: ExerciseLibraryItem) {
    const fullItem = (await loadExerciseLibraryItemById(item.id)) || item;
    setShowCreateForm(true);
    setEditingId(fullItem.id);
    setDraft({
      name: fullItem.name,
      category: fullItem.category,
      subcategory: fullItem.subcategory || "",
      description: fullItem.description || "",
      cues: fullItem.cues || "",
      video_url: fullItem.video_url || "",
      video_path: fullItem.video_path || "",
      thumbnail_url: fullItem.thumbnail_url || "",
      active: fullItem.active,
      sort_order: fullItem.sort_order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleVideoFile(file: File) {
    if (!userId || !isCoach) return;

    setUploadingVideo(true);
    setMessage("");

    const { videoUrl, videoPath, thumbnailUrl, storage, error } =
      await uploadExerciseLibraryVideo(userId, file);

    setUploadingVideo(false);

    if (error || !videoUrl || !videoPath) {
      setMessage(error?.message || "Video uploaden mislukt.");
      return;
    }

    if (draft.video_path && draft.video_path !== videoPath) {
      await removeExerciseLibraryStorage([draft.video_path], {
        provider: draft.storage_provider,
        bucket: draft.storage_bucket || undefined,
      });
    }

    const storageMeta = storage ? toStorageMetadata(storage) : null;

    setDraft((current) => ({
      ...current,
      video_url: videoUrl,
      video_path: videoPath,
      thumbnail_url: thumbnailUrl || current.thumbnail_url,
      ...(storageMeta || {}),
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!isCoach) return;

    if (!draft.name.trim()) {
      setMessage("Vul een oefeningnaam in.");
      return;
    }

    if (!draft.video_url?.trim()) {
      setMessage("Upload eerst een uitlegvideo.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await saveExerciseLibraryItem({
      ...draft,
      id: editingId || undefined,
      sort_order: editingId
        ? draft.sort_order
        : items.length,
    });

    setSaving(false);

    if (error) {
      setMessage(
        "Opslaan mislukt. Controleer of de Supabase-migratie is uitgevoerd.",
      );
      return;
    }

    resetForm();
    await refresh(true);
    setMessage(editingId ? "Oefening bijgewerkt." : "Oefening toegevoegd.");
  }

  async function handleDelete(item: ExerciseLibraryItem) {
    if (!window.confirm(`"${item.name}" verwijderen?`)) return;

    const paths = [item.video_path].filter(Boolean) as string[];
    const { error } = await deleteExerciseLibraryItem(item.id);

    if (error) {
      alert(error.message);
      return;
    }

    if (paths.length > 0) {
      await removeExerciseLibraryStorage(paths);
    }

    if (selectedItem?.id === item.id) {
      setSelectedItem(null);
    }

    if (editingId === item.id) {
      resetForm();
    }

    await refresh(isCoach);
  }

  return (
    <AppShell>
      <div className="mx-auto flex w-full max-w-none min-h-0 flex-1 gap-0 overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-xl">
        <CollapsibleFilterSidebar title="Categorie" collapsible={false}>
          <ExerciseLibraryCategoryNav
            customCategories={customCategories}
            hiddenBuiltinNames={hiddenBuiltinCategories}
            categoryFilter={categoryFilter}
            isCoach={isCoach}
            draggingItemId={draggingItemId}
            onFilterChange={setCategoryFilter}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onMoveItemToCategory={handleMoveItemToCategory}
            categoryError={categoryError}
          />
        </CollapsibleFilterSidebar>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 mobile-scroll md:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-app-muted">
            Oefeningenbibliotheek
          </p>
          <h1 className="text-3xl font-bold text-app-text">
            {categoryFilterLabel(categoryFilter)}
          </h1>
        </div>

        {isCoach && !showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="app-btn-primary app-focus-ring mb-6"
          >
            Nieuwe oefening aanmaken
          </button>
        )}

        {isCoach && showCreateForm && (
          <form
            onSubmit={handleSubmit}
            className="app-card mb-6 p-5"
          >
            <h2 className="mb-4 text-lg font-bold text-app-text">
              {editingId ? "Oefening bewerken" : "Nieuwe oefening"}
            </h2>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Oefeningnaam"
                className="app-focus-ring rounded-xl border border-app-border bg-app-surface-muted px-4 py-2 text-app-text outline-none placeholder:text-app-muted/50"
                required
              />

              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value,
                    subcategory: "",
                  }))
                }
                className="app-focus-ring rounded-xl border border-app-border bg-app-surface-muted px-4 py-2 text-app-text outline-none"
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

              <input
                list="exercise-subcategories"
                value={draft.subcategory || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    subcategory: event.target.value,
                  }))
                }
                placeholder="Subcategorie (optioneel), bijv. arch"
                className="app-focus-ring rounded-xl border border-app-border bg-app-surface-muted px-4 py-2 text-app-text outline-none placeholder:text-app-muted/50"
              />
              <datalist id="exercise-subcategories">
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory} value={subcategory} />
                ))}
              </datalist>

              <textarea
                value={draft.description || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Uitleg over de oefening"
                rows={3}
                className="app-focus-ring md:col-span-2 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2 text-app-text outline-none placeholder:text-app-muted/50"
              />

              <textarea
                value={draft.cues || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    cues: event.target.value,
                  }))
                }
                placeholder="Coaching cues (bijv. brace, knieën uit, etc.)"
                rows={3}
                className="app-focus-ring md:col-span-2 rounded-xl border border-app-border bg-app-surface-muted px-4 py-2 text-app-text outline-none placeholder:text-app-muted/50"
              />

              <div className="md:col-span-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleVideoFile(file);
                    event.target.value = "";
                  }}
                />

                {draft.video_url ? (
                  <div className="rounded-2xl border border-app-border bg-app-surface-muted p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {draft.thumbnail_url ? (
                        <img
                          src={draft.thumbnail_url}
                          alt=""
                          className="h-24 w-40 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-40 items-center justify-center rounded-xl bg-app-surface text-sm text-app-muted">
                          Video klaar
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-app-text">
                          Uitlegvideo geüpload
                        </p>
                        <p className="text-xs text-app-muted">
                          Vervang via filmrol of maak een nieuwe video.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="app-btn-secondary text-sm"
                      >
                        Haal uit filmrol
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecorderOpen(true)}
                        className="app-btn-primary text-sm"
                      >
                        Maak video
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="app-focus-ring rounded-2xl border-2 border-dashed border-app-border bg-app-surface-muted p-5 text-center transition hover:border-app-accent/40 hover:bg-app-surface-hover disabled:opacity-60"
                    >
                      <span className="text-3xl">▣</span>
                      <p className="mt-2 text-sm font-semibold text-app-text">
                        Haal uit filmrol
                      </p>
                      <p className="mt-1 text-xs text-app-muted">
                        Kies een bestaande video
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecorderOpen(true)}
                      disabled={uploadingVideo}
                      className="app-focus-ring rounded-2xl border-2 border-dashed border-app-border bg-app-surface-muted p-5 text-center transition hover:border-app-accent/40 hover:bg-app-surface-hover disabled:opacity-60"
                    >
                      <span className="text-3xl">🎥</span>
                      <p className="mt-2 text-sm font-semibold text-app-text">
                        Maak video
                      </p>
                      <p className="mt-1 text-xs text-app-muted">
                        Zelfde camera als atleten
                      </p>
                    </button>
                  </div>
                )}

                {uploadingVideo && (
                  <p className="mt-2 text-sm text-app-muted">Video uploaden...</p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-app-text">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      active: event.target.checked,
                    }))
                  }
                />
                Zichtbaar voor atleten
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={saving || uploadingVideo}
                className="app-btn-primary disabled:opacity-60"
              >
                {saving
                  ? "Opslaan..."
                  : editingId
                    ? "Wijzigingen opslaan"
                    : "Oefening toevoegen"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="app-btn-secondary"
              >
                Annuleren
              </button>
            </div>

            {message && (
              <p className="mt-3 text-sm font-semibold text-app-muted">{message}</p>
            )}
          </form>
        )}

        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {["Alle", ...EXERCISE_LIBRARY_CATEGORIES].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`app-focus-ring rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                categoryFilter === category
                  ? "bg-app-accent text-white"
                  : "border border-app-border text-app-muted hover:bg-app-surface-hover"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-app-muted">Laden...</p>
        ) : filteredItems.length === 0 ? (
          <div className="app-card p-8 text-center">
            <p className="text-app-muted">
              {isCoach
                ? emptyCategoryMessage(categoryFilter)
                : categoryFilter === "Alle"
                  ? "Er staan nog geen uitlegvideo's klaar."
                  : emptyCategoryMessage(categoryFilter).replace(
                      "Nog geen oefeningen",
                      "Geen oefeningen",
                    )}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                draggable={isCoach}
                onDragStart={(event) => {
                  setDraggingItemId(item.id);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                  setCompactDragImage(event, item.name);
                }}
                onDragEnd={() => setDraggingItemId(null)}
                className={`group relative overflow-hidden rounded-2xl border border-app-border bg-app-surface transition ${
                  draggingItemId === item.id ? "opacity-40" : "hover:border-app-accent/30 hover:shadow-lg"
                } ${isCoach ? "cursor-grab active:cursor-grabbing" : ""}`}
              >
                <button
                  type="button"
                  draggable={false}
                  onClick={() => setSelectedItem(item)}
                  className="relative block w-full text-left"
                >
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-app-surface-muted text-4xl">
                      🎥
                    </div>
                  )}
                  {!item.active && isCoach && (
                    <span className="absolute left-3 top-3 z-20 rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Verborgen
                    </span>
                  )}
                </button>

                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/60 group-hover:opacity-100">
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                    Bekijk uitleg
                  </span>
                </div>

                <div className="relative z-0 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-app-muted">
                    {item.category}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-app-text">{item.name}</h3>
                  {item.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm text-app-muted">
                      {item.description}
                    </p>
                  )}

                  {isCoach && (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="app-focus-ring rounded-lg border border-app-border px-3 py-1.5 text-xs font-semibold text-app-text transition hover:bg-app-surface-hover"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="app-focus-ring rounded-lg border border-app-destructive/30 px-3 py-1.5 text-xs font-semibold text-app-destructive transition hover:bg-app-destructive/10"
                      >
                        Verwijderen
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
        </div>
      </div>

      <ExerciseLibraryVideoModal
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
      />

      <ExerciseVideoRecorder
        open={recorderOpen}
        title={draft.name.trim() || "Uitlegvideo opnemen"}
        saving={uploadingVideo}
        onClose={() => setRecorderOpen(false)}
        onSave={async (file) => {
          setRecorderOpen(false);
          await handleVideoFile(file);
        }}
      />
    </AppShell>
  );
}
