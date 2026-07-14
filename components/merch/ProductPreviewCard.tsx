"use client";

import { Heart } from "lucide-react";
import {
  formatMerchPrice,
  formatMerchSizes,
  getMerchStatusLabel,
  type MerchColorVariant,
  type MerchItemStatus,
} from "@/lib/merch";

type ProductPreviewCardProps = {
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  imageUrls?: string[];
  sizes: string[];
  colors: MerchColorVariant[];
  status: MerchItemStatus;
  featured?: boolean;
  limited?: boolean;
  preorder?: boolean;
};

export default function ProductPreviewCard({
  title,
  description,
  price,
  imageUrl,
  imageUrls = [],
  sizes,
  colors,
  status,
  featured,
  limited,
  preorder,
}: ProductPreviewCardProps) {
  const displayTitle = title.trim() || "Producttitel";
  const parsedPrice = price.trim() ? Number(price) : null;
  const primaryImage = imageUrl || imageUrls[0] || "";
  const displaySizes = sizes.length > 0 ? sizes : ["S", "M", "L", "XL", "One size"];
  const displayColors =
    colors.length > 0
      ? colors
      : [
          { name: "Zwart", value: "#111827" },
          { name: "Wit", value: "#ffffff" },
          { name: "Navy", value: "#1e3a8a" },
        ];

  const badgeLabel =
    status === "live"
      ? featured
        ? "Nieuw"
        : "Live"
      : status === "concept"
        ? "Concept"
        : getMerchStatusLabel(status);

  return (
    <div className="flex flex-col">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-muted">
        Live preview
      </p>
      <article className="overflow-hidden rounded-2xl border border-app-border/80 bg-[#161B22]/90 shadow-[0_0_32px_rgba(59,130,246,0.08)]">
        <div className="relative">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt=""
              className="aspect-[4/3] w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#1a1f2e] to-[#111827] text-app-muted">
              <div className="h-16 w-16 rounded-2xl border border-dashed border-app-border/60" />
              <span className="text-[12px]">Productafbeelding</span>
            </div>
          )}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1">
            <span
              className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                status === "live"
                  ? "bg-emerald-500 text-white"
                  : status === "concept"
                    ? "bg-amber-500 text-white"
                    : "bg-slate-500 text-white"
              }`}
            >
              {badgeLabel}
            </span>
            {limited ? (
              <span className="rounded-md bg-fuchsia-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Limited
              </span>
            ) : null}
            {preorder ? (
              <span className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Pre-order
              </span>
            ) : null}
          </div>
          <button
            type="button"
            className="absolute right-3 top-3 rounded-full bg-black/50 p-2 text-white backdrop-blur"
            aria-label="Favoriet"
          >
            <Heart className="h-4 w-4" />
          </button>
        </div>

        {imageUrls.length > 1 ? (
          <div className="flex gap-1 border-t border-app-border/60 p-2">
            {imageUrls.slice(0, 6).map((url, index) => (
              <div
                key={`${url}-${index}`}
                className={`h-10 w-10 overflow-hidden rounded-lg border ${
                  url === primaryImage
                    ? "border-sky-500 ring-1 ring-sky-500/40"
                    : "border-app-border/60"
                }`}
              >
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        ) : null}

        <div className="p-4">
          <h3 className="text-base font-semibold text-app-text">{displayTitle}</h3>
          <p className="mt-1 text-lg font-bold text-app-text">
            {parsedPrice !== null && Number.isFinite(parsedPrice)
              ? formatMerchPrice(parsedPrice)
              : "€0,00"}
          </p>

          <p className="mt-3 min-h-[48px] text-[13px] leading-relaxed text-app-muted">
            {description.trim() ||
              "Premium hoodie met comfortabele pasvorm en minimalistisch Limitless design."}
          </p>

          <div className="mt-4 space-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
                Maten
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {displaySizes.map((size) => (
                  <span
                    key={size}
                    className="rounded-md border border-app-border/60 bg-app-surface-muted/50 px-2 py-0.5 text-[11px] text-app-muted"
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
                Kleuren
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {displayColors.map((color) => (
                  <span
                    key={`${color.name}-${color.value}`}
                    className="inline-flex items-center gap-1.5 text-[11px] text-app-muted"
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-white/20"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name.toLowerCase()}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <p className="mt-4 text-[11px] leading-relaxed text-app-subtle">
            Op voorraad · Voor 23:59 besteld, morgen in huis · 30 dagen retourrecht
          </p>
          <p className="mt-1 text-[11px] text-app-subtle">
            Maten: {formatMerchSizes(displaySizes)}
          </p>
        </div>
      </article>
    </div>
  );
}
