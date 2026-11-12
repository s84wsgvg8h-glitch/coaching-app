"use client";

import {
  Archive,
  BarChart3,
  Package,
  Settings,
  ShoppingBag,
  Tag,
} from "lucide-react";
import type { MerchTabId } from "@/lib/merchShopConfig";

type MerchSidebarProps = {
  activeTab: MerchTabId;
  onTabChange: (tab: MerchTabId) => void;
  orderBadge?: number;
  collectionCount?: number;
};

const LINKS: Array<{
  id: MerchTabId;
  label: string;
  icon: typeof ShoppingBag;
  badgeKey?: "orders" | "collections";
}> = [
  { id: "shop", label: "Merch shop", icon: ShoppingBag },
  { id: "orders", label: "Bestellingen", icon: Package, badgeKey: "orders" },
  { id: "discounts", label: "Kortingen", icon: Tag },
  { id: "collections", label: "Collecties", icon: Archive, badgeKey: "collections" },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "settings", label: "Instellingen", icon: Settings },
];

export default function MerchSidebar({
  activeTab,
  onTabChange,
  orderBadge = 0,
  collectionCount = 0,
}: MerchSidebarProps) {
  return (
  <>
    <aside className="hidden lg:block w-[200px] shrink-0">
      <div
        className="sticky top-4 rounded-2xl border border-app-border bg-app-surface p-2"
      >
        {LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = activeTab === link.id;
          const badge =
            link.badgeKey === "orders"
              ? orderBadge
              : link.badgeKey === "collections"
                ? collectionCount
                : 0;

          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onTabChange(link.id)}
              className={`app-focus-ring mb-0.5 flex min-h-[44px] w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                isActive
                  ? "bg-app-accent/15 text-app-text"
                  : "text-app-muted hover:bg-app-surface-hover hover:text-app-text"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? "text-app-accent" : ""}`} />
                {link.label}
              </span>
              {badge > 0 ? (
                <span className="rounded-full bg-app-accent px-2 py-0.5 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>

    <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1 scrollbar-none lg:hidden">
      <div className="flex min-w-max gap-2">
        {LINKS.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onTabChange(link.id)}
              className={`app-focus-ring min-h-[44px] whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-medium transition ${
                isActive
                  ? "bg-app-accent text-white"
                  : "border border-app-border bg-app-surface text-app-muted hover:bg-app-surface-hover hover:text-app-text"
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </div>
  </>
  );
}
