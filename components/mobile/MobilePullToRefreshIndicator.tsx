"use client";

import { RefreshCw } from "lucide-react";
import { MOBILE_PTR_HOLD_PX, MOBILE_PTR_THRESHOLD_PX } from "@/lib/mobilePullToRefresh";

type MobilePullToRefreshIndicatorProps = {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
};

export default function MobilePullToRefreshIndicator({
  pullDistance,
  isRefreshing,
  threshold = MOBILE_PTR_THRESHOLD_PX,
}: MobilePullToRefreshIndicatorProps) {
  const visibleHeight = isRefreshing
    ? MOBILE_PTR_HOLD_PX
    : pullDistance > 0
      ? pullDistance
      : 0;

  if (visibleHeight <= 0) return null;

  const progress = Math.min(pullDistance / threshold, 1);
  const ready = pullDistance >= threshold || isRefreshing;

  return (
    <div
      className="mobile-ptr-indicator"
      style={{ height: visibleHeight }}
      aria-hidden="true"
    >
      <RefreshCw
        className={`mobile-ptr-indicator__icon h-5 w-5${
          isRefreshing ? " mobile-ptr-indicator__icon--spinning" : ""
        }${ready ? " mobile-ptr-indicator__icon--ready" : ""}`}
        style={{
          opacity: isRefreshing ? 1 : 0.35 + progress * 0.65,
          transform: isRefreshing ? undefined : `rotate(${progress * 180}deg)`,
        }}
        strokeWidth={2.25}
      />
    </div>
  );
}
