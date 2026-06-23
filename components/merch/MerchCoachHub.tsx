"use client";

import { useMemo, useState } from "react";
import MerchAnalyticsTab from "@/components/merch/MerchAnalyticsTab";
import MerchCollectionsTab from "@/components/merch/MerchCollectionsTab";
import MerchDiscountsTab from "@/components/merch/MerchDiscountsTab";
import MerchOrdersTab from "@/components/merch/MerchOrdersTab";
import MerchProductForm from "@/components/merch/MerchProductForm";
import MerchSettingsTab from "@/components/merch/MerchSettingsTab";
import MerchShell from "@/components/merch/MerchShell";
import MerchShopTab from "@/components/merch/MerchShopTab";
import { loadMerchCollections, type MerchTabId } from "@/lib/merchShopConfig";
import type { MerchItem } from "@/lib/merch";
import type { CoachMerchOrderRow } from "@/lib/merchOrders";
import {
  buildMerchShopStats,
  type MerchProductFilter,
} from "@/lib/merchShopStats";

type MerchCoachHubProps = {
  userId: string;
  items: MerchItem[];
  orders: CoachMerchOrderRow[];
  ordersLoading: boolean;
  athleteCount: number;
  onRefresh: () => Promise<void>;
  onToggleLive: (item: MerchItem) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToast: (message: string) => void;
  togglingId: string | null;
};

export default function MerchCoachHub({
  userId,
  items,
  orders,
  ordersLoading,
  athleteCount,
  onRefresh,
  onToggleLive,
  onDelete,
  onToast,
  togglingId,
}: MerchCoachHubProps) {
  const [activeTab, setActiveTab] = useState<MerchTabId>("shop");
  const [shopFilter, setShopFilter] = useState<MerchProductFilter>("all");
  const [productForm, setProductForm] = useState<
    null | "create" | MerchItem
  >(null);

  const stats = useMemo(
    () => buildMerchShopStats(items, orders, athleteCount),
    [items, orders, athleteCount],
  );

  const productCollections = useMemo(
    () =>
      [
        ...new Set([
          ...(items
            .map((item) => item.collection)
            .filter(Boolean) as string[]),
          ...loadMerchCollections(userId).map((entry) => entry.name),
        ]),
      ],
    [items, userId],
  );

  function navigate(tab: MerchTabId, options?: { shopFilter?: MerchProductFilter }) {
    setActiveTab(tab);
    if (options?.shopFilter) {
      setShopFilter(options.shopFilter);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Dit product verwijderen?")) return;
    await onDelete(id);
    setProductForm(null);
  }

  return (
    <>
      <MerchShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        orderBadge={stats.newOrderCount}
        collectionCount={productCollections.length}
      >
        {activeTab === "shop" ? (
          <MerchShopTab
            items={items}
            orders={orders}
            ordersLoading={ordersLoading}
            stats={stats}
            collections={productCollections}
            togglingId={togglingId}
            initialFilter={shopFilter}
            onOpenCreate={() => setProductForm("create")}
            onOpenEdit={(item) => setProductForm(item)}
            onNavigate={navigate}
            onRefresh={onRefresh}
            onToggleLive={onToggleLive}
            onDelete={onDelete}
            onToast={onToast}
          />
        ) : null}

        {activeTab === "orders" ? (
          <MerchOrdersTab
            orders={orders}
            loading={ordersLoading}
            stats={stats}
            onRefresh={onRefresh}
            onToast={onToast}
          />
        ) : null}

        {activeTab === "discounts" ? (
          <MerchDiscountsTab userId={userId} onToast={onToast} />
        ) : null}

        {activeTab === "collections" ? (
          <MerchCollectionsTab
            userId={userId}
            items={items}
            stats={stats}
            onToast={onToast}
          />
        ) : null}

        {activeTab === "analytics" ? (
          <MerchAnalyticsTab
            items={items}
            orders={orders}
            athleteCount={athleteCount}
          />
        ) : null}

        {activeTab === "settings" ? (
          <MerchSettingsTab userId={userId} onToast={onToast} />
        ) : null}
      </MerchShell>

      {productForm ? (
        <MerchProductForm
          userId={userId}
          item={productForm === "create" ? null : productForm}
          sortOrder={items.length}
          collections={productCollections}
          stats={stats}
          onSaved={() => {
            setProductForm(null);
            void onRefresh();
            onToast(
              productForm === "create"
                ? "Product toegevoegd."
                : "Product bijgewerkt.",
            );
          }}
          onCancel={() => setProductForm(null)}
          onDelete={handleDelete}
          onToast={onToast}
        />
      ) : null}
    </>
  );
}
