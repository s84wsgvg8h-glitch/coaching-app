"use client";

import { formatMerchPrice } from "@/lib/merch";
import type { CoachMerchOrderRow } from "@/lib/merchOrders";
import MerchOrderStatusBadge from "@/components/merch/athlete/MerchOrderStatusBadge";

type MerchPickupListProps = {
  orders: CoachMerchOrderRow[];
};

export default function MerchPickupList({ orders }: MerchPickupListProps) {
  const pickupOrders = orders.filter(
    (order) =>
      order.status === "paid" &&
      order.pickup_method &&
      (order.pickup_method.toLowerCase().includes("ophalen") ||
        order.pickup_method.toLowerCase().includes("wedstrijd") ||
        order.pickup_method.toLowerCase().includes("training")),
  );

  if (pickupOrders.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-app-border/70 px-4 py-6 text-center text-[13px] text-app-muted">
        Geen openstaande ophaalorders.
      </p>
    );
  }

  return (
    <div className="grid gap-2">
      {pickupOrders.map((order) => (
        <div
          key={order.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-app-border/70 bg-app-surface/30 px-4 py-3"
        >
          <div>
            <p className="text-[14px] font-semibold text-app-text">
              {order.athlete_name || "Onbekende atleet"}
            </p>
            <p className="text-[12px] text-app-muted">
              {order.item_title} · maat {order.size}
              {order.color ? ` · ${order.color}` : ""}
            </p>
            <p className="mt-1 text-[11px] text-app-subtle">{order.pickup_method}</p>
          </div>
          <div className="text-right">
            <MerchOrderStatusBadge order={order} />
            <p className="mt-1 text-[12px] font-medium text-app-text">
              {formatMerchPrice(order.amount_cents / 100)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
