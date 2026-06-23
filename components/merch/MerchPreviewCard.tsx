"use client";

import { formatMerchPrice, formatMerchSizes } from "@/lib/merch";

type MerchPreviewCardProps = {
  title: string;
  description: string;
  price: string;
  imageUrl: string;
  sizes: string[];
  active: boolean;
};

export default function MerchPreviewCard({
  title,
  description,
  price,
  imageUrl,
  sizes,
  active,
}: MerchPreviewCardProps) {
  const displayTitle = title.trim() || "Producttitel";
  const parsedPrice = price.trim() ? Number(price) : null;

  return (
    <div className="flex flex-col">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-app-muted">
        Voorbeeld
      </p>
      <article className="app-card overflow-hidden p-0">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt=""
            className="aspect-[4/3] w-full object-cover"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-app-surface-muted text-sm text-app-muted">
            Geen afbeelding
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-base font-semibold text-app-text">{displayTitle}</h3>
            {!active && (
              <span className="rounded-full bg-app-surface-muted px-2 py-0.5 text-[10px] font-semibold text-app-muted">
                Inactief
              </span>
            )}
          </div>
          <p className="mt-1 text-sm font-medium text-app-text">
            {parsedPrice !== null && Number.isFinite(parsedPrice)
              ? formatMerchPrice(parsedPrice)
              : "Prijs"}
          </p>
          <p className="mt-1 text-xs text-app-muted">
            Maten: {sizes.length > 0 ? formatMerchSizes(sizes) : "—"}
          </p>
          {description.trim() ? (
            <p className="mt-2 line-clamp-3 text-sm text-app-muted">{description}</p>
          ) : (
            <p className="mt-2 text-sm italic text-app-subtle">
              Beschrijving verschijnt hier
            </p>
          )}
        </div>
      </article>
    </div>
  );
}
