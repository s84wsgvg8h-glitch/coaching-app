"use client";

import {
  formatMerchPrice,
  getMerchItemGallery,
  getMerchLowStockLabel,
  type MerchItem,
} from "@/lib/merch";

type MerchProductCardProps = {
  item: MerchItem;
  onOpen: () => void;
};

function ProductBadges({ item }: { item: MerchItem }) {
  const lowStock = getMerchLowStockLabel(item);

  return (
    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
      {item.featured ? (
        <span className="rounded-full bg-app-accent px-2 py-0.5 text-[10px] font-semibold text-white">
          Featured
        </span>
      ) : null}
      {item.limited ? (
        <span className="rounded-full bg-violet-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          Limited
        </span>
      ) : null}
      {item.preorder ? (
        <span className="rounded-full bg-amber-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          Pre-order
        </span>
      ) : null}
      {item.status === "soldout" || lowStock === "Uitverkocht" ? (
        <span className="rounded-full bg-rose-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          Uitverkocht
        </span>
      ) : lowStock ? (
        <span className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
          {lowStock}
        </span>
      ) : null}
    </div>
  );
}

export default function MerchProductCard({ item, onOpen }: MerchProductCardProps) {
  const image = getMerchItemGallery(item)[0];

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="merch-product-card group cursor-pointer overflow-hidden rounded-2xl border border-app-border/70 bg-app-surface/40 transition hover:border-app-accent/40 hover:shadow-[0_0_24px_rgba(59,130,246,0.12)]"
    >
      <div className="relative">
        <ProductBadges item={item} />
        {image ? (
          <img
            src={image}
            alt={item.title}
            className="aspect-[4/3] w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center bg-app-surface-muted text-app-muted">
            Geen afbeelding
          </div>
        )}
      </div>

      <div className="p-4">
        <h2 className="text-[16px] font-semibold text-app-text">{item.title}</h2>
        <p className="mt-1 text-[14px] font-semibold text-app-text">
          {formatMerchPrice(item.price)}
        </p>
        {item.collection ? (
          <p className="mt-1 text-[11px] uppercase tracking-wide text-app-subtle">
            {item.collection}
          </p>
        ) : null}
        <p className="mt-3 text-[12px] font-medium text-app-accent">
          Bekijk product →
        </p>
      </div>
    </article>
  );
}
