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
        className="sticky top-4 rounded-2xl border border-app-border/80 bg-[#11161D]/90 p-2 shadow-[0_0_24px_rgba(59,130,246,0.06)] backdrop-blur-md"
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
              className={`mb-0.5 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                isActive
                  ? "bg-sky-500/15 text-app-text shadow-[0_0_16px_rgba(59,130,246,0.25)] ring-1 ring-sky-500/30"
                  : "text-app-muted hover:bg-app-surface-muted/60 hover:text-app-text"
              }`}
            >
              <span className="flex items-center gap-2.5">
                <Icon className={`h-4 w-4 ${isActive ? "text-sky-400" : ""}`} />
                {link.label}
              </span>
              {badge > 0 ? (
                <span className="rounded-full bg-sky-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>

    <div className="lg:hidden mb-4 -mx-1 overflow-x-auto px-1 pb-1">
      <div className="flex gap-1 min-w-max">
        {LINKS.map((link) => {
          const isActive = activeTab === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onTabChange(link.id)}
              className={`rounded-xl px-3 py-2 text-[12px] font-medium whitespace-nowrap transition ${
                isActive
                  ? "bg-sky-500/15 text-app-text ring-1 ring-sky-500/30"
                  : "text-app-muted hover:text-app-text"
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
