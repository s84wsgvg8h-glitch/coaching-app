"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import CollapsibleFilterSidebar from "@/components/ui/CollapsibleFilterSidebar";
import { supabase } from "@/lib/supabaseClient";
import {
  deleteExerciseLibraryItem,
  EXERCISE_LIBRARY_CATEGORIES,
  loadExerciseLibraryItems,
  saveExerciseLibraryItem,
  type ExerciseLibraryItem,
} from "@/lib/exerciseLibrary";
import {
  removeExerciseLibraryStorage,
  uploadExerciseLibraryVideo,
} from "@/lib/exerciseLibraryVideos";
import ExerciseVideoRecorder from "@/components/ExerciseVideoRecorder";
import ExerciseLibraryVideoModal from "@/components/ExerciseLibraryVideoModal";

function emptyDraft(): Omit<
  ExerciseLibraryItem,
  "id" | "created_at" | "updated_at"
> {
  return {
    name: "",
    category: "Overig",
    description: "",
    cues: "",
    video_url: "",
    video_path: "",
    thumbnail_url: "",
    active: true,
    sort_order: 0,
  };
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
  const [selectedItem, setSelectedItem] = useState<ExerciseLibraryItem | null>(
    null,
  );
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCoach = role === "coach";

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
      setItems(await loadExerciseLibraryItems(profile?.role === "coach"));
      setLoading(false);
    }

    void load();
  }, []);

  const filteredItems = useMemo(() => {
    if (categoryFilter === "Alle") return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [items, categoryFilter]);

  async function refresh(includeInactive: boolean) {
    setItems(await loadExerciseLibraryItems(includeInactive));
  }

  function resetForm() {
    setDraft(emptyDraft());
    setEditingId(null);
    setShowCreateForm(false);
  }

  function startEdit(item: ExerciseLibraryItem) {
    setShowCreateForm(true);
    setEditingId(item.id);
    setDraft({
      name: item.name,
      category: item.category,
      description: item.description || "",
      cues: item.cues || "",
      video_url: item.video_url || "",
      video_path: item.video_path || "",
      thumbnail_url: item.thumbnail_url || "",
      active: item.active,
      sort_order: item.sort_order,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleVideoFile(file: File) {
    if (!userId || !isCoach) return;

    setUploadingVideo(true);
    setMessage("");

    const { videoUrl, videoPath, thumbnailUrl, error } =
      await uploadExerciseLibraryVideo(userId, file);

    setUploadingVideo(false);

    if (error || !videoUrl || !videoPath) {
      setMessage(error?.message || "Video uploaden mislukt.");
      return;
    }

    if (draft.video_path && draft.video_path !== videoPath) {
      await removeExerciseLibraryStorage([draft.video_path]);
    }

    setDraft((current) => ({
      ...current,
      video_url: videoUrl,
      video_path: videoPath,
      thumbnail_url: thumbnailUrl || current.thumbnail_url,
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
      <div className="mx-auto flex max-w-6xl min-h-0 flex-1 gap-0 overflow-hidden rounded-3xl border border-app-border bg-app-surface shadow-xl">
        <CollapsibleFilterSidebar title="Categorie">
          {["Alle", ...EXERCISE_LIBRARY_CATEGORIES].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`mb-1 block w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold ${
                categoryFilter === category
                  ? "bg-brand-purple text-white"
                  : "text-app-text hover:bg-app-surface-muted"
              }`}
            >
              {category}
            </button>
          ))}
        </CollapsibleFilterSidebar>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 mobile-scroll md:p-6">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Limitless Coaching
          </p>
          <h1 className="text-3xl font-bold text-black">Oefeningenbibliotheek</h1>
          <p className="mt-2 text-gray-600">
            {isCoach
              ? "Maak uitlegvideo's voor oefeningen die atleten kunnen bekijken."
              : "Bekijk uitlegvideo's van je coach per oefening."}
          </p>
        </div>

        {isCoach && !showCreateForm && (
          <button
            type="button"
            onClick={() => setShowCreateForm(true)}
            className="mb-6 rounded-2xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-900"
          >
            Nieuwe oefening aanmaken
          </button>
        )}

        {isCoach && showCreateForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-6 rounded-3xl bg-white p-5 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-bold">
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
                className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black"
                required
              />

              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black"
              >
                {EXERCISE_LIBRARY_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

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
                className="md:col-span-2 rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black"
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
                className="md:col-span-2 rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black"
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
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {draft.thumbnail_url ? (
                        <img
                          src={draft.thumbnail_url}
                          alt=""
                          className="h-24 w-40 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-24 w-40 items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-500">
                          Video klaar
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-black">
                          Uitlegvideo geüpload
                        </p>
                        <p className="text-xs text-gray-500">
                          Vervang via filmrol of maak een nieuwe video.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-white"
                      >
                        Haal uit filmrol
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecorderOpen(true)}
                        className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
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
                      className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-5 text-center hover:border-black hover:bg-gray-50 disabled:opacity-60"
                    >
                      <span className="text-3xl">▣</span>
                      <p className="mt-2 text-sm font-semibold text-black">
                        Haal uit filmrol
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Kies een bestaande video
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRecorderOpen(true)}
                      disabled={uploadingVideo}
                      className="rounded-2xl border-2 border-dashed border-gray-300 bg-white p-5 text-center hover:border-black hover:bg-gray-50 disabled:opacity-60"
                    >
                      <span className="text-3xl">🎥</span>
                      <p className="mt-2 text-sm font-semibold text-black">
                        Maak video
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Zelfde camera als atleten
                      </p>
                    </button>
                  </div>
                )}

                {uploadingVideo && (
                  <p className="mt-2 text-sm text-gray-500">Video uploaden...</p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
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
                className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
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
                className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>

            {message && (
              <p className="mt-3 text-sm font-semibold text-gray-600">{message}</p>
            )}
          </form>
        )}

        <div className="mb-4 flex flex-wrap gap-2 lg:hidden">
          {["Alle", ...EXERCISE_LIBRARY_CATEGORIES].map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setCategoryFilter(category)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                categoryFilter === category
                  ? "bg-black text-white"
                  : "border border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Laden...</p>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center shadow-xl">
            <p className="text-gray-500">
              {isCoach
                ? "Nog geen oefeningen in de bibliotheek. Klik op \"Nieuwe oefening aanmaken\" om je eerste uitlegvideo toe te voegen."
                : "Er staan nog geen uitlegvideo's klaar."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl bg-white shadow-xl"
              >
                <button
                  type="button"
                  onClick={() => setSelectedItem(item)}
                  className="group relative block w-full text-left"
                >
                  {item.thumbnail_url ? (
                    <img
                      src={item.thumbnail_url}
                      alt={item.name}
                      className="aspect-video w-full object-cover"
                    />
                  ) : (
                    <div className="flex aspect-video items-center justify-center bg-gray-100 text-4xl">
                      🎥
                    </div>
                  )}
                  <span className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                    <span className="rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-black opacity-0 transition group-hover:opacity-100">
                      Bekijk uitleg
                    </span>
                  </span>
                  {!item.active && isCoach && (
                    <span className="absolute left-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                      Verborgen
                    </span>
                  )}
                </button>

                <div className="p-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">
                    {item.category}
                  </p>
                  <h3 className="mt-1 text-lg font-bold text-black">{item.name}</h3>
                  {item.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {item.description}
                    </p>
                  )}

                  {isCoach && (
                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-semibold hover:bg-gray-50"
                      >
                        Bewerken
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item)}
                        className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
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
