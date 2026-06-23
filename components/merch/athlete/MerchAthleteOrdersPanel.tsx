"use client";

import { formatMerchPrice } from "@/lib/merch";
import type { AthleteMerchOrderRow } from "@/lib/merchOrders";
import MerchOrderStatusBadge from "@/components/merch/athlete/MerchOrderStatusBadge";
import EmptyState from "@/components/ui/EmptyState";

type MerchAthleteOrdersPanelProps = {
  orders: AthleteMerchOrderRow[];
  loading: boolean;
};

export default function MerchAthleteOrdersPanel({
  orders,
  loading,
}: MerchAthleteOrdersPanelProps) {
  if (loading) {
    return (
      <div className="grid gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-2xl border border-app-border/60 bg-app-surface/40"
          />
        ))}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <EmptyState
        title="Nog geen bestellingen"
        description="Zodra je iets bestelt, zie je hier de status en details."
      />
    );
  }

  return (
    <div className="grid gap-3">
      {orders.map((order) => (
        <article
          key={order.id}
          className="flex gap-4 rounded-2xl border border-app-border/70 bg-app-surface/40 p-4"
        >
          {order.item_image_url ? (
            <img
              src={order.item_image_url}
              alt={order.item_title || "Product"}
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-app-surface-muted text-[11px] text-app-muted">
              Geen foto
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-[15px] font-semibold text-app-text">
                  {order.item_title || "Product"}
                </h3>
                <p className="mt-1 text-[12px] text-app-muted">
                  Maat {order.size}
                  {order.color ? ` · ${order.color}` : ""}
                </p>
              </div>
              <MerchOrderStatusBadge order={order} />
            </div>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-app-muted">
              <span>{formatMerchPrice(order.amount_cents / 100)}</span>
              <span>
                {new Date(order.created_at).toLocaleDateString("nl-NL", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
              {order.pickup_method ? <span>{order.pickup_method}</span> : null}
            </div>

            {order.customer_note ? (
              <p className="mt-2 text-[12px] text-app-subtle">
                Opmerking: {order.customer_note}
              </p>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  );
}
