"use client";

import {
  formatMerchCombinedStatus,
  getMerchCombinedStatus,
  merchCombinedStatusBadgeClass,
} from "@/lib/merchOrderDisplay";
import type { MerchOrder } from "@/lib/merchOrders";

type MerchOrderStatusBadgeProps = {
  order: Pick<
    MerchOrder,
    "status" | "fulfillment_status" | "refunded_at"
  >;
  className?: string;
};

export default function MerchOrderStatusBadge({
  order,
  className = "",
}: MerchOrderStatusBadgeProps) {
  const combined = getMerchCombinedStatus(order);
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${merchCombinedStatusBadgeClass(combined)} ${className}`}
    >
      {formatMerchCombinedStatus(combined)}
    </span>
  );
}
