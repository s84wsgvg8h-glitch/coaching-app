"use client";

import {
  MERCH_ORDER_TIMELINE_STEPS,
  getMerchTimelineStepState,
} from "@/lib/merchOrderDisplay";
import type { MerchOrder } from "@/lib/merchOrders";
import { Check } from "lucide-react";

type MerchOrderTimelineProps = {
  order: Pick<
    MerchOrder,
    | "status"
    | "fulfillment_status"
    | "paid_at"
    | "fulfilled_at"
    | "refunded_at"
    | "created_at"
  >;
};

export default function MerchOrderTimeline({ order }: MerchOrderTimelineProps) {
  return (
    <ol className="space-y-3">
      {MERCH_ORDER_TIMELINE_STEPS.map((step) => {
        const state = getMerchTimelineStepState(step.key, order);
        return (
          <li key={step.key} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                state === "done"
                  ? "bg-emerald-500/20 text-emerald-300"
                  : state === "current"
                    ? "bg-app-accent/20 text-app-accent"
                    : state === "cancelled"
                      ? "bg-rose-500/10 text-rose-300/70"
                      : "bg-app-surface-muted text-app-subtle"
              }`}
            >
              {state === "done" ? <Check className="h-3.5 w-3.5" /> : "·"}
            </span>
            <div>
              <p
                className={`text-[13px] font-medium ${
                  state === "current"
                    ? "text-app-text"
                    : state === "done"
                      ? "text-app-muted"
                      : "text-app-subtle"
                }`}
              >
                {step.label}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
