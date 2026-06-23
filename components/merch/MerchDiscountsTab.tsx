"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Tag } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import {
  createMerchDiscountId,
  loadMerchDiscountsAsync,
  saveMerchDiscountAsync,
  type MerchDiscount,
  type MerchDiscountType,
} from "@/lib/merchShopConfig";

type MerchDiscountsTabProps = {
  userId: string;
  onToast: (message: string) => void;
};

export default function MerchDiscountsTab({
  userId,
  onToast,
}: MerchDiscountsTabProps) {
  const [discounts, setDiscounts] = useState<MerchDiscount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft());

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows = await loadMerchDiscountsAsync(userId);
    setDiscounts(rows);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleCreate() {
    const code = draft.code.trim().toUpperCase();
    if (!code) {
      onToast("Vul een kortingscode in.");
      return;
    }

    const entry: MerchDiscount = {
      id: createMerchDiscountId(),
      code,
      type: draft.type,
      value: Number(draft.value) || 0,
      validFrom: draft.validFrom || null,
      validUntil: draft.validUntil || null,
      usageLimit: draft.usageLimit.trim() ? Number(draft.usageLimit) : null,
      usageCount: 0,
      collection: draft.collection || null,
      productId: null,
      athleteIds: [],
      active: true,
      createdAt: new Date().toISOString(),
    };

    const { error } = await saveMerchDiscountAsync(userId, entry);
    if (error) {
      onToast(error.message || "Opslaan mislukt.");
      return;
    }

    setModalOpen(false);
    setDraft(emptyDraft());
    onToast("Kortingscode aangemaakt.");
    void refresh();
  }

  async function toggleActive(discount: MerchDiscount) {
    const updated = { ...discount, active: !discount.active };
    const { error } = await saveMerchDiscountAsync(userId, updated);
    if (error) {
      onToast(error.message || "Opslaan mislukt.");
      return;
    }
    setDiscounts((current) =>
      current.map((entry) => (entry.id === discount.id ? updated : entry)),
    );
    onToast(updated.active ? "Korting geactiveerd." : "Korting gedeactiveerd.");
  }

  return (
    <>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-app-text">
            Kortingen
          </h1>
          <p className="mt-1 text-[14px] text-app-muted">
            Beheer kortingscodes voor je merch shop. Codes worden gevalideerd bij checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-[13px] font-semibold text-white hover:bg-[#2563EB]"
        >
          <Plus className="h-4 w-4" />
          Korting maken
        </button>
      </header>

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map((key) => (
            <div
              key={key}
              className="h-20 animate-pulse rounded-2xl border border-app-border/50 bg-[#161B22]/50"
            />
          ))}
        </div>
      ) : discounts.length === 0 ? (
        <EmptyState
          title="Geen kortingen"
          description="Maak je eerste kortingscode om atleten te belonen."
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="app-btn-primary"
            >
              + Korting maken
            </button>
          }
        />
      ) : (
        <div className="space-y-2">
          {discounts.map((discount) => (
            <article
              key={discount.id}
              className="flex flex-wrap items-center gap-3 rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <Tag className="h-4 w-4 text-sky-400" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[15px] font-semibold text-app-text">
                  {discount.code}
                </p>
                <p className="text-[12px] text-app-muted">
                  {discount.type === "percent"
                    ? `${discount.value}% korting`
                    : `€${discount.value.toFixed(2)} korting`}
                  {discount.usageLimit
                    ? ` · max ${discount.usageLimit}×`
                    : " · onbeperkt"}
                  {discount.usageCount > 0
                    ? ` · ${discount.usageCount}× gebruikt`
                    : ""}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                  discount.active
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-app-surface-muted text-app-muted"
                }`}
              >
                {discount.active ? "Actief" : "Inactief"}
              </span>
              <button
                type="button"
                onClick={() => void toggleActive(discount)}
                className="app-btn-secondary py-2 text-[12px]"
              >
                {discount.active ? "Deactiveren" : "Activeren"}
              </button>
            </article>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-app-border bg-[#11161D] p-5 shadow-2xl">
            <h2 className="text-lg font-semibold text-app-text">
              Korting maken
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={draft.code}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, code: e.target.value }))
                }
                placeholder="Code"
                className="ui-auth-input"
              />
              <select
                value={draft.type}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    type: e.target.value as MerchDiscountType,
                  }))
                }
                className="ui-auth-input"
              >
                <option value="percent">Percentage</option>
                <option value="fixed">Vast bedrag</option>
              </select>
              <input
                value={draft.value}
                onChange={(e) =>
                  setDraft((current) => ({ ...current, value: e.target.value }))
                }
                placeholder="Waarde"
                inputMode="decimal"
                className="ui-auth-input"
              />
              <input
                value={draft.usageLimit}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    usageLimit: e.target.value,
                  }))
                }
                placeholder="Max aantal keer gebruiken"
                className="ui-auth-input"
              />
              <input
                type="date"
                value={draft.validFrom}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    validFrom: e.target.value,
                  }))
                }
                className="ui-auth-input"
              />
              <input
                type="date"
                value={draft.validUntil}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    validUntil: e.target.value,
                  }))
                }
                className="ui-auth-input"
              />
              <input
                value={draft.collection}
                onChange={(e) =>
                  setDraft((current) => ({
                    ...current,
                    collection: e.target.value,
                  }))
                }
                placeholder="Alleen collectie (optioneel)"
                className="ui-auth-input sm:col-span-2"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="app-btn-secondary"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                className="app-btn-primary"
              >
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
    code: "",
    type: "percent" as MerchDiscountType,
    value: "10",
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    collection: "",
  };
}
