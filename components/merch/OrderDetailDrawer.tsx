"use client";

import { useEffect, useState } from "react";
import { Truck, X } from "lucide-react";
import MerchOrderTimeline from "@/components/merch/MerchOrderTimeline";
import MerchOrderStatusBadge from "@/components/merch/athlete/MerchOrderStatusBadge";
import { formatMerchPrice } from "@/lib/merch";
import {
  formatMerchFulfillmentStatus,
  formatMerchOrderStatus,
  loadMerchOrderEvents,
  saveMerchCoachNote,
  updateMerchOrderFulfillmentStatus,
  type CoachMerchOrderRow,
  type MerchFulfillmentStatus,
  type MerchOrderEvent,
} from "@/lib/merchOrders";

type OrderDetailDrawerProps = {
  order: CoachMerchOrderRow;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onToast: (message: string) => void;
};

const FULFILLMENT_OPTIONS: MerchFulfillmentStatus[] = [
  "new",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

export default function OrderDetailDrawer({
  order,
  onClose,
  onRefresh,
  onToast,
}: OrderDetailDrawerProps) {
  const [coachNote, setCoachNote] = useState(order.coach_note || "");
  const [fulfillment, setFulfillment] = useState(order.fulfillment_status);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<MerchOrderEvent[]>([]);

  useEffect(() => {
    void loadMerchOrderEvents(order.id).then(setEvents);
  }, [order.id]);

  async function handleStatusSave(next: MerchFulfillmentStatus) {
    setSaving(true);
    const { error } = await updateMerchOrderFulfillmentStatus(order.id, next);
    setSaving(false);
    if (error) {
      onToast(error.message);
      return;
    }
    setFulfillment(next);
    await onRefresh();
    void loadMerchOrderEvents(order.id).then(setEvents);
    onToast(`Status bijgewerkt naar ${formatMerchFulfillmentStatus(next)}.`);
  }

  async function handleSaveCoachNote() {
    setSaving(true);
    const { error } = await saveMerchCoachNote(order.id, coachNote);
    setSaving(false);
    if (error) {
      onToast(error.message);
      return;
    }
    await onRefresh();
    onToast("Interne notitie opgeslagen.");
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
      <button
        type="button"
        className="flex-1"
        aria-label="Drawer sluiten"
        onClick={onClose}
      />
      <aside className="flex h-full w-full max-w-md flex-col border-l border-app-border bg-[#11161D] shadow-2xl">
        <div className="flex items-center justify-between border-b border-app-border/60 px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-app-subtle">
              Order
            </p>
            <h2 className="text-lg font-semibold text-app-text">
              #{order.id.slice(0, 8)}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-app-border p-2 text-app-muted hover:bg-app-surface-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <section>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
                Status
              </h3>
              <MerchOrderStatusBadge order={order} />
            </div>
          </section>

          <section>
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
              Klant
            </h3>
            <p className="mt-2 text-[14px] font-medium text-app-text">
              {order.athlete_name || "Onbekende atleet"}
            </p>
            <p className="text-[12px] text-app-muted">
              Besteld op {new Date(order.created_at).toLocaleString("nl-NL")}
            </p>
          </section>

          <section className="rounded-2xl border border-app-border/70 bg-app-surface-muted/20 p-4">
            <h3 className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
              Product
            </h3>
            <div className="mt-3 flex gap-3">
              {order.item_image_url ? (
                <img
                  src={order.item_image_url}
                  alt={order.item_title || "Product"}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : null}
              <div>
                <p className="text-[14px] font-semibold text-app-text">
                  {order.item_title || "Product"}
                </p>
                <p className="text-[12px] text-app-muted">
                  Maat {order.size}
                  {order.color ? ` · ${order.color}` : ""}
                </p>
                <p className="mt-2 text-[16px] font-bold text-app-text">
                  {formatMerchPrice(order.amount_cents / 100)}
                </p>
                {order.discount_code ? (
                  <p className="text-[11px] text-emerald-300">
                    Korting: {order.discount_code} (
                    {formatMerchPrice((order.discount_cents || 0) / 100)})
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="grid gap-2 text-[13px]">
            <p>
              <span className="text-app-muted">Betaalstatus:</span>{" "}
              <span className="font-medium text-app-text">
                {formatMerchOrderStatus(order.status)}
              </span>
            </p>
            <p>
              <span className="text-app-muted">Fulfillment:</span>{" "}
              <span className="font-medium text-app-text">
                {formatMerchFulfillmentStatus(order.fulfillment_status)}
              </span>
            </p>
            {order.paid_at ? (
              <p className="text-app-muted">
                Betaald op {new Date(order.paid_at).toLocaleString("nl-NL")}
              </p>
            ) : null}
            {order.pickup_method ? (
              <p>
                <span className="text-app-muted">Ophalen/verzenden:</span>{" "}
                {order.pickup_method}
              </p>
            ) : null}
            {order.customer_note ? (
              <p>
                <span className="text-app-muted">Opmerking atleet:</span>{" "}
                {order.customer_note}
              </p>
            ) : null}
            {order.stripe_session_id ? (
              <p className="break-all text-[11px] text-app-subtle">
                Session: {order.stripe_session_id}
              </p>
            ) : null}
            {order.stripe_payment_intent_id ? (
              <p className="break-all text-[11px] text-app-subtle">
                Payment intent: {order.stripe_payment_intent_id}
              </p>
            ) : null}
          </section>

          <section>
            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-app-muted">
              Timeline
            </h3>
            <MerchOrderTimeline order={order} />
            {events.length > 0 ? (
              <div className="mt-4 space-y-2 border-t border-app-border/50 pt-3">
                {events.map((event) => (
                  <p key={event.id} className="text-[11px] text-app-subtle">
                    {event.event_type} ·{" "}
                    {new Date(event.created_at).toLocaleString("nl-NL")}
                  </p>
                ))}
              </div>
            ) : null}
          </section>

          <section>
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
                Fulfillment status
              </span>
              <select
                value={fulfillment}
                disabled={saving}
                onChange={(event) =>
                  void handleStatusSave(
                    event.target.value as MerchFulfillmentStatus,
                  )
                }
                className="ui-auth-input mt-2 w-full"
              >
                {FULFILLMENT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {formatMerchFulfillmentStatus(option)}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section>
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-app-muted">
                Interne coachnotitie
              </span>
              <textarea
                value={coachNote}
                onChange={(event) => setCoachNote(event.target.value)}
                rows={3}
                placeholder="Interne notitie bij deze order..."
                className="ui-auth-input mt-2 w-full"
              />
            </label>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSaveCoachNote()}
              className="app-btn-secondary mt-2"
            >
              Notitie opslaan
            </button>
          </section>
        </div>

        <div className="space-y-2 border-t border-app-border/60 p-5">
          <button
            type="button"
            disabled={saving || fulfillment === "shipped"}
            onClick={() => void handleStatusSave("shipped")}
            className="app-btn-primary inline-flex w-full items-center justify-center gap-2 disabled:opacity-60"
          >
            <Truck className="h-4 w-4" />
            Markeer als verzonden
          </button>
          <button
            type="button"
            disabled
            className="app-btn-secondary w-full opacity-50"
            title="Stripe terugbetaling volgt in een latere update"
          >
            Terugbetaling (binnenkort)
          </button>
        </div>
      </aside>
    </div>
  );
}
