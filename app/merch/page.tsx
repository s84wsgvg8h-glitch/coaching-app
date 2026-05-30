"use client";

import { useEffect, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { supabase } from "@/lib/supabaseClient";
import { uploadMerchImage } from "@/lib/merchImages";
import {
  deleteMerchItem,
  formatMerchPrice,
  loadMerchItems,
  saveMerchItem,
  type MerchItem,
} from "@/lib/merch";

function emptyDraft(): Omit<MerchItem, "id" | "created_at" | "updated_at"> {
  return {
    title: "",
    description: "",
    price: null,
    image_url: "",
    buy_url: "",
    active: true,
    sort_order: 0,
  };
}

export default function MerchPage() {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("");
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());
  const [message, setMessage] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = "Merch";
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
      setItems(await loadMerchItems(profile?.role === "coach"));
      setLoading(false);
    }

    void load();
  }, []);

  async function refresh(includeInactive: boolean) {
    setItems(await loadMerchItems(includeInactive));
  }

  async function handleImageFile(file: File) {
    if (!userId || role !== "coach") return;

    setUploadingImage(true);
    setMessage("");

    const { url, error } = await uploadMerchImage(userId, file);

    setUploadingImage(false);

    if (error || !url) {
      setMessage(error?.message || "Afbeelding uploaden mislukt.");
      return;
    }

    setDraft((current) => ({ ...current, image_url: url }));
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (role !== "coach") return;

    setSaving(true);
    setMessage("");

    const { error } = await saveMerchItem({
      ...draft,
      price: draft.price === null ? null : Number(draft.price),
      sort_order: items.length,
    });

    setSaving(false);

    if (error) {
      setMessage("Opslaan mislukt. Controleer of de Supabase-migratie is uitgevoerd.");
      return;
    }

    setDraft(emptyDraft());
    await refresh(true);
    setMessage("Merch item toegevoegd.");
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Dit merch item verwijderen?")) return;

    const { error } = await deleteMerchItem(id);
    if (error) {
      alert(error.message);
      return;
    }

    await refresh(role === "coach");
  }

  return (
    <AppShell contentClassName="flex-1 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-400">
            Limitless Coaching
          </p>
          <h1 className="text-3xl font-bold text-black">Merch shop</h1>
          <p className="mt-2 text-gray-600">
            Bestel teamkleding en merchandise van Limitless Coaching.
          </p>
        </div>

        {role === "coach" && (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-3xl bg-white p-5 shadow-xl"
          >
            <h2 className="mb-4 text-lg font-bold">Merch toevoegen</h2>
            <div className="grid gap-3 md:grid-cols-2">
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, title: event.target.value }))
                }
                placeholder="Titel"
                className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black"
                required
              />
              <input
                value={draft.price ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    price: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                placeholder="Prijs in euro"
                inputMode="decimal"
                className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black"
              />

              <div className="md:col-span-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleImageFile(file);
                    event.target.value = "";
                  }}
                />

                <div
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragActive(false);
                    const file = event.dataTransfer.files?.[0];
                    if (file) void handleImageFile(file);
                  }}
                  className={`rounded-2xl border-2 border-dashed p-4 transition ${
                    dragActive
                      ? "border-black bg-gray-50"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {draft.image_url ? (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <img
                        src={draft.image_url}
                        alt="Preview"
                        className="h-28 w-28 rounded-xl object-cover"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                        >
                          Afbeelding wijzigen
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((current) => ({ ...current, image_url: "" }))
                          }
                          className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                        >
                          Verwijderen
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">
                        Sleep een afbeelding hierheen
                      </p>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        className="mt-3 rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {uploadingImage ? "Uploaden..." : "Afbeelding toevoegen"}
                      </button>
                    </div>
                  )}
                </div>

                <input
                  value={draft.image_url || ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      image_url: event.target.value,
                    }))
                  }
                  placeholder="Of plak een afbeelding URL"
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <input
                value={draft.buy_url || ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, buy_url: event.target.value }))
                }
                placeholder="Bestellink URL (optioneel)"
                className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black md:col-span-2"
              />
              <textarea
                value={draft.description || ""}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Beschrijving"
                rows={3}
                className="rounded-xl border border-gray-300 px-4 py-2 outline-none focus:ring-2 focus:ring-black md:col-span-2"
              />
            </div>

            {message && <p className="mt-3 text-sm text-gray-600">{message}</p>}

            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="mt-4 rounded-xl bg-black px-4 py-2 font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Opslaan..." : "Toevoegen"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="rounded-3xl bg-white p-6 shadow-xl">Laden...</div>
        ) : items.length === 0 ? (
          <div className="rounded-3xl bg-white p-6 text-gray-500 shadow-xl">
            Nog geen merch beschikbaar.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <article
                key={item.id}
                className="overflow-hidden rounded-3xl bg-white shadow-xl"
              >
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="aspect-[4/3] w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[4/3] items-center justify-center bg-gray-100 text-gray-400">
                    Geen afbeelding
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-black">{item.title}</h2>
                    {!item.active && role === "coach" && (
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                        Inactief
                      </span>
                    )}
                  </div>

                  <p className="mt-1 text-sm font-semibold text-gray-700">
                    {formatMerchPrice(item.price)}
                  </p>

                  {item.description && (
                    <p className="mt-2 text-sm text-gray-600">{item.description}</p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.buy_url && (
                      <a
                        href={item.buy_url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl bg-black px-4 py-2 text-sm font-semibold text-white"
                      >
                        Bestellen
                      </a>
                    )}

                    {role === "coach" && (
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                      >
                        Verwijderen
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
