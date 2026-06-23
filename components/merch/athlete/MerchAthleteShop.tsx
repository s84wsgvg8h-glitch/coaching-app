"use client";

import { useState } from "react";
import MerchAthleteOrdersPanel from "@/components/merch/athlete/MerchAthleteOrdersPanel";
import MerchProductCard from "@/components/merch/athlete/MerchProductCard";
import MerchProductDetailModal from "@/components/merch/athlete/MerchProductDetailModal";
import EmptyState from "@/components/ui/EmptyState";
import { PageHeader } from "@/components/ui/design-system";
import type { MerchItem } from "@/lib/merch";
import type { AthleteMerchOrderRow } from "@/lib/merchOrders";

type MerchAthleteShopProps = {
  items: MerchItem[];
  orders: AthleteMerchOrderRow[];
  ordersLoading: boolean;
  coachId?: string | null;
};

type AthleteTab = "shop" | "orders";

export default function MerchAthleteShop({
  items,
  orders,
  ordersLoading,
  coachId,
}: MerchAthleteShopProps) {
  const [tab, setTab] = useState<AthleteTab>("shop");
  const [selectedItem, setSelectedItem] = useState<MerchItem | null>(null);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <PageHeader
        title="Merch shop"
        description="Teamkleding en merchandise bestellen bij je coach."
        eyebrow="Limitless Coaching"
      />

      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:overflow-visible">
        {[
          { id: "shop" as const, label: "Shop" },
          { id: "orders" as const, label: `Mijn bestellingen${orders.length ? ` (${orders.length})` : ""}` },
        ].map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setTab(entry.id)}
            className={`shrink-0 rounded-full px-4 py-2.5 text-[13px] font-medium transition min-h-[44px] ${
              tab === entry.id
                ? "bg-app-accent/15 text-app-accent ring-1 ring-app-accent/30"
                : "text-app-muted hover:text-app-text"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === "shop" ? (
        items.length === 0 ? (
          <EmptyState
            title="Nog geen merch beschikbaar"
            description="Je coach heeft nog geen producten live gezet."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <MerchProductCard
                key={item.id}
                item={item}
                onOpen={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )
      ) : (
        <MerchAthleteOrdersPanel orders={orders} loading={ordersLoading} />
      )}

      {selectedItem ? (
        <MerchProductDetailModal
          item={selectedItem}
          coachId={coachId}
          onClose={() => setSelectedItem(null)}
        />
      ) : null}
    </div>
  );
}
