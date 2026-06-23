"use client";

import type { ReactNode } from "react";
import MerchSidebar from "@/components/merch/MerchSidebar";
import type { MerchTabId } from "@/lib/merchShopConfig";

type MerchShellProps = {
  activeTab: MerchTabId;
  onTabChange: (tab: MerchTabId) => void;
  orderBadge?: number;
  collectionCount?: number;
  children: ReactNode;
};

export default function MerchShell({
  activeTab,
  onTabChange,
  orderBadge,
  collectionCount,
  children,
}: MerchShellProps) {
  return (
    <div className="merch-shop mx-auto w-full max-w-[1660px]">
      <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <MerchSidebar
          activeTab={activeTab}
          onTabChange={onTabChange}
          orderBadge={orderBadge}
          collectionCount={collectionCount}
        />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
