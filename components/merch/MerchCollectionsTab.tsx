"use client";

import { useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Plus } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/design-system";
import { formatMerchPrice, type MerchItem } from "@/lib/merch";
import {
  createMerchCollectionId,
  loadMerchCollectionsAsync,
  saveMerchCollectionAsync,
  type MerchCollectionMeta,
} from "@/lib/merchShopConfig";
import type { MerchShopStats } from "@/lib/merchShopStats";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type MerchCollectionsTabProps = {
  userId: string;
  items: MerchItem[];
  stats: MerchShopStats;
  onToast: (message: string) => void;
};

export default function MerchCollectionsTab({
  userId,
  items,
  stats,
  onToast,
}: MerchCollectionsTabProps) {
  const [collections, setCollections] = useState<MerchCollectionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MerchCollectionMeta | null>(null);
  const [draft, setDraft] = useState(emptyDraft());

  useEffect(() => {
    deferEffectUpdate(() => {
      setLoading(true);
    });
    void loadMerchCollectionsAsync(userId).then((rows) => {
      setCollections(rows);
      setLoading(false);
    });
  }, [userId]);

  const collectionStats = useMemo(() => {
    const byName: Record<
      string,
      { productCount: number; revenueCents: number }
    > = {};
    for (const item of items) {
      const name = item.collection?.trim();
      if (!name) continue;
      if (!byName[name]) {
        byName[name] = { productCount: 0, revenueCents: 0 };
      }
      byName[name].productCount += 1;
      byName[name].revenueCents += stats.revenueByItemId[item.id] || 0;
    }
    return byName;
  }, [items, stats]);

  async function persist(next: MerchCollectionMeta[]) {
    setCollections(next);
    for (const collection of next) {
      await saveMerchCollectionAsync(userId, collection);
    }
  }

  function openCreate() {
    setEditing(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(collection: MerchCollectionMeta) {
    setEditing(collection);
    setDraft({
      name: collection.name,
      description: collection.description,
      coverUrl: collection.coverUrl || "",
      sortOrder: String(collection.sortOrder),
      visible: collection.visible,
    });
    setModalOpen(true);
  }

  async function handleSave() {
    const name = draft.name.trim();
    if (!name) {
      onToast("Vul een collectienaam in.");
      return;
    }
    if (editing) {
      const updated: MerchCollectionMeta = {
        ...editing,
        name,
        description: draft.description.trim(),
        coverUrl: draft.coverUrl.trim() || null,
        sortOrder: Number(draft.sortOrder) || 0,
        visible: draft.visible,
      };
      const { error } = await saveMerchCollectionAsync(userId, updated);
      if (error) {
        onToast(error.message || "Opslaan mislukt.");
        return;
      }
      setCollections((current) =>
        current.map((entry) => (entry.id === editing.id ? updated : entry)),
      );
      onToast("Collectie bijgewerkt.");
    } else {
      const created: MerchCollectionMeta = {
        id: createMerchCollectionId(),
        name,
        description: draft.description.trim(),
        coverUrl: draft.coverUrl.trim() || null,
        sortOrder: Number(draft.sortOrder) || collections.length,
        visible: draft.visible,
      };
      const { id, error } = await saveMerchCollectionAsync(userId, created);
      if (error) {
        onToast(error.message || "Opslaan mislukt.");
        return;
      }
      setCollections((current) => [...current, { ...created, id }]);
      onToast("Collectie aangemaakt.");
    }
    setModalOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Collecties"
        description="Organiseer producten in thematische collecties."
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="app-btn-primary app-focus-ring min-h-[44px] w-full sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Collectie maken
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((key) => (
            <div
              key={key}
              className="h-48 animate-pulse rounded-2xl border border-app-border bg-app-surface"
            />
          ))}
        </div>
      ) : collections.length === 0 ? (
        <EmptyState
          title="Geen collecties"
          description="Maak collecties om je merch shop overzichtelijk te houden."
          action={
            <button type="button" onClick={openCreate} className="app-btn-primary">
              + Collectie maken
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection) => {
            const metrics = collectionStats[collection.name] || {
              productCount: 0,
              revenueCents: 0,
            };
            return (
              <article
                key={collection.id}
                className="overflow-hidden rounded-2xl border border-app-border bg-app-surface"
              >
                <div className="flex aspect-[16/7] items-center justify-center bg-app-surface-muted">
                  {collection.coverUrl ? (
                    <img
                      src={collection.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Archive className="h-8 w-8 text-app-muted" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-[15px] font-semibold text-app-text">
                        {collection.name}
                      </h2>
                      <p className="mt-1 line-clamp-2 text-[12px] text-app-muted">
                        {collection.description || "Geen beschrijving"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        collection.visible
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-app-surface-muted text-app-muted"
                      }`}
                    >
                      {collection.visible ? "Zichtbaar" : "Verborgen"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[12px] text-app-muted">
                    <span>{metrics.productCount} producten</span>
                    <span>
                      {formatMerchPrice(metrics.revenueCents / 100)} omzet
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(collection)}
                    className="app-btn-secondary app-focus-ring mt-3 min-h-[44px] text-[12px]"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Bewerken
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-app-border bg-app-surface-elevated p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-app-text">
              {editing ? "Collectie bewerken" : "Collectie maken"}
            </h2>
            <div className="mt-4 space-y-3">
              <input
                value={draft.name}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, name: e.target.value }))
                }
                placeholder="Naam"
                className="ui-auth-input w-full"
              />
              <textarea
                value={draft.description}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    description: e.target.value,
                  }))
                }
                placeholder="Beschrijving"
                rows={3}
                className="ui-auth-input w-full"
              />
              <input
                value={draft.coverUrl}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    coverUrl: e.target.value,
                  }))
                }
                placeholder="Cover afbeelding URL"
                className="ui-auth-input w-full"
              />
              <input
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    sortOrder: e.target.value,
                  }))
                }
                placeholder="Sortering"
                className="ui-auth-input w-full"
              />
              <label className="flex items-center gap-2 text-[13px] text-app-text">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-app-accent"
                  checked={draft.visible}
                  onChange={(e) =>
                    setDraft((current) => ({
                      ...current,
                      visible: e.target.checked,
                    }))
                  }
                />
                Zichtbaar voor atleten
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="app-btn-secondary app-focus-ring min-h-[44px]"
              >
                Annuleren
              </button>
              <button type="button" onClick={handleSave} className="app-btn-primary app-focus-ring min-h-[44px]">
                Opslaan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function emptyDraft() {
  return {
    name: "",
    description: "",
    coverUrl: "",
    sortOrder: "0",
    visible: true,
  };
}
