"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  formatMerchPrice,
  formatMerchSizes,
  getMerchItemAvailableSizes,
  getMerchItemGallery,
  getMerchLowStockLabel,
  getMerchStockForSize,
  isMerchItemOrderable,
  type MerchItem,
} from "@/lib/merch";
import { openExternalUrl } from "@/lib/openExternalUrl";

type MerchProductDetailModalProps = {
  item: MerchItem;
  coachId?: string | null;
  onClose: () => void;
};

export default function MerchProductDetailModal({
  item,
  coachId,
  onClose,
}: MerchProductDetailModalProps) {
  const gallery = getMerchItemGallery(item);
  const allSizes = item.sizes?.length > 0 ? item.sizes : ["One size"];
  const availableSizes = getMerchItemAvailableSizes(item);

  const [activeImage, setActiveImage] = useState(gallery[0] || "");
  const [selectedSize, setSelectedSize] = useState(
    availableSizes[0] || allSizes[0] || "One size",
  );
  const [selectedColor, setSelectedColor] = useState(
    item.color_variants[0]?.name || "",
  );
  const [pickupMethod, setPickupMethod] = useState("Ophalen bij training");
  const [customerNote, setCustomerNote] = useState("");
  const [discountCode, setDiscountCode] = useState("");
  const [discountLabel, setDiscountLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const orderable = isMerchItemOrderable(item);
  const lowStock = getMerchLowStockLabel(item);
  const sizeStock = getMerchStockForSize(item, selectedSize);

  const returnInfo =
    item.return_policy_override ||
    "30 dagen retourrecht. Product moet ongebruikt en in originele staat zijn.";

  const finalPriceLabel = useMemo(() => {
    if (!discountLabel) return formatMerchPrice(item.price);
    return discountLabel;
  }, [discountLabel, item.price]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  async function validateDiscount() {
    if (!discountCode.trim()) {
      setDiscountLabel("");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/merch/validate-discount", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        merchItemId: item.id,
        discountCode: discountCode.trim(),
      }),
    });

    const payload = (await response.json()) as {
      valid?: boolean;
      error?: string;
      finalPriceLabel?: string;
    };

    if (!payload.valid) {
      setDiscountLabel("");
      setMessage(payload.error || "Ongeldige kortingscode.");
      return;
    }

    setMessage("");
    setDiscountLabel(payload.finalPriceLabel || "");
  }

  async function handleOrder() {
    setLoading(true);
    setMessage("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const response = await fetch("/api/merch/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token || ""}`,
      },
      body: JSON.stringify({
        merchItemId: item.id,
        size: selectedSize,
        color: selectedColor,
        pickupMethod,
        customerNote,
        discountCode: discountCode.trim() || undefined,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      checkoutUrl?: string | null;
      message?: string;
    };

    setLoading(false);

    if (!response.ok) {
      setMessage(payload.error || "Bestellen mislukt.");
      return;
    }

    if (payload.checkoutUrl) {
      await openExternalUrl(payload.checkoutUrl);
      return;
    }

    setMessage(payload.message || "Bestelling geplaatst.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 p-0 sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0"
        aria-label="Sluiten"
        onClick={onClose}
      />
      <div className="relative flex max-h-[94dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl border border-app-border bg-[#11161D] shadow-2xl sm:rounded-3xl">
        <div className="flex items-center justify-between border-b border-app-border/60 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
              Product
            </p>
            <h2 className="text-xl font-bold text-app-text">{item.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-app-border p-2 text-app-muted hover:bg-app-surface-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-5 p-5 md:grid-cols-2">
            <div>
              {activeImage ? (
                <img
                  src={activeImage}
                  alt={item.title}
                  className="aspect-square w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-app-surface-muted text-app-muted">
                  Geen afbeelding
                </div>
              )}
              {gallery.length > 1 ? (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {gallery.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => setActiveImage(url)}
                      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border ${
                        activeImage === url
                          ? "border-app-accent"
                          : "border-app-border"
                      }`}
                    >
                      <img src={url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <p className="text-2xl font-bold text-app-text">{finalPriceLabel}</p>
              {item.preorder ? (
                <p className="mt-1 text-[12px] font-medium text-amber-300">
                  Pre-order — wordt verwerkt na sluiting
                </p>
              ) : null}
              {lowStock ? (
                <p className="mt-1 text-[12px] font-medium text-orange-300">{lowStock}</p>
              ) : null}

              {item.description ? (
                <p className="mt-4 text-[14px] leading-relaxed text-app-muted">
                  {item.description}
                </p>
              ) : null}

              {item.material_info ? (
                <div className="mt-4 rounded-xl border border-app-border/60 bg-app-surface/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
                    Materiaal
                  </p>
                  <p className="mt-1 text-[13px] text-app-text">{item.material_info}</p>
                </div>
              ) : null}

              <div className="mt-4">
                <p className="text-[11px] font-bold uppercase tracking-wide text-app-subtle">
                  Kies maat
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allSizes.map((size) => {
                    const stock = item.stock_by_size?.[size];
                    const disabled =
                      !item.preorder &&
                      (item.status !== "live" || stock === 0);
                    return (
                      <button
                        key={size}
                        type="button"
                        disabled={disabled}
                        onClick={() => setSelectedSize(size)}
                        className={`rounded-xl border px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                          selectedSize === size
                            ? "border-app-accent bg-app-accent text-white"
                            : "border-app-border text-app-text hover:bg-app-surface-muted"
                        }`}
                      >
                        {size}
                        {stock !== undefined ? ` · ${stock}` : ""}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-xs text-app-muted">
                  Beschikbaar: {formatMerchSizes(item.sizes)}
                  {sizeStock !== null ? ` · geselecteerd: ${sizeStock}` : ""}
                </p>
              </div>

              {item.color_variants.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-app-subtle">
                    Kies kleur
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.color_variants.map((color) => (
                      <button
                        key={`${color.name}-${color.value}`}
                        type="button"
                        onClick={() => setSelectedColor(color.name)}
                        className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold ${
                          selectedColor === color.name
                            ? "border-app-accent text-app-text"
                            : "border-app-border text-app-muted"
                        }`}
                      >
                        <span
                          className="h-4 w-4 rounded-full border border-white/20"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.name}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {item.size_guide_text ? (
                <div className="mt-4 rounded-xl border border-app-border/60 bg-app-surface/40 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
                    Maattabel / advies
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-[13px] text-app-muted">
                    {item.size_guide_text}
                  </p>
                </div>
              ) : null}

              <div className="mt-4 grid gap-2 text-[13px] text-app-muted">
                {item.delivery_time_text ? (
                  <p>
                    <span className="font-semibold text-app-text">Levertijd:</span>{" "}
                    {item.delivery_time_text}
                  </p>
                ) : null}
                <p>
                  <span className="font-semibold text-app-text">Retour:</span> {returnInfo}
                </p>
              </div>

              <div className="mt-4 grid gap-2">
                <input
                  value={discountCode}
                  onChange={(event) => setDiscountCode(event.target.value)}
                  onBlur={() => void validateDiscount()}
                  placeholder="Kortingscode (optioneel)"
                  className="ui-auth-input"
                />
                <select
                  value={pickupMethod}
                  onChange={(event) => setPickupMethod(event.target.value)}
                  className="ui-auth-input"
                >
                  <option>Ophalen bij training</option>
                  <option>Meenemen naar wedstrijd</option>
                  <option>Verzenden</option>
                </select>
                <textarea
                  value={customerNote}
                  onChange={(event) => setCustomerNote(event.target.value)}
                  placeholder="Opmerking voor coach (optioneel)"
                  rows={2}
                  className="ui-auth-input w-full"
                />
              </div>

              {coachId ? (
                <Link
                  href={`/chat?from=${encodeURIComponent("/merch")}`}
                  className="mt-4 inline-flex items-center gap-2 text-[13px] font-medium text-app-accent hover:text-app-text"
                >
                  <MessageCircle className="h-4 w-4" />
                  Vraag coach om maatadvies
                </Link>
              ) : null}

              {message ? (
                <p className="mt-4 rounded-xl bg-app-surface-muted px-3 py-2 text-sm text-app-muted">
                  {message}
                </p>
              ) : null}

              {!orderable ? (
                <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
                  Dit product is momenteel niet bestelbaar.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-app-border/60 bg-[#11161D]/95 p-4 backdrop-blur-md">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="hidden flex-1 rounded-xl border border-app-border px-4 py-3 text-sm font-semibold text-app-text sm:inline-flex sm:items-center sm:justify-center"
            >
              Sluiten
            </button>
            <button
              type="button"
              onClick={() => void handleOrder()}
              disabled={loading || !orderable}
              className="flex-1 rounded-xl bg-app-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading ? "Bezig..." : "Bestellen & betalen"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
