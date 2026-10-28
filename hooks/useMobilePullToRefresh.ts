"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  MOBILE_PTR_HOLD_PX,
  MOBILE_PTR_MAX_PULL_PX,
  MOBILE_PTR_THRESHOLD_PX,
  isMobilePullToRefreshViewport,
} from "@/lib/mobilePullToRefresh";

export type UseMobilePullToRefreshOptions = {
  scrollRef: RefObject<HTMLElement | null>;
  enabled?: boolean;
  onRefresh?: () => Promise<void> | void;
};

export function useMobilePullToRefresh({
  scrollRef,
  enabled = true,
  onRefresh,
}: UseMobilePullToRefreshOptions) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const pullingRef = useRef(false);
  const startYRef = useRef(0);

  pullDistanceRef.current = pullDistance;
  isRefreshingRef.current = isRefreshing;

  const runRefresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }

    await queryClient.invalidateQueries();
    router.refresh();
  }, [onRefresh, queryClient, router]);

  useEffect(() => {
    if (!enabled) return;

    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    function canStartPull() {
      return scrollEl!.scrollTop <= 0 && !isRefreshingRef.current;
    }

    function onTouchStart(event: TouchEvent) {
      if (!isMobilePullToRefreshViewport()) return;
      if (!canStartPull()) return;
      if (event.touches.length !== 1) return;

      pullingRef.current = true;
      startYRef.current = event.touches[0]?.clientY ?? 0;
    }

    function onTouchMove(event: TouchEvent) {
      if (!pullingRef.current || isRefreshingRef.current) return;
      if (!isMobilePullToRefreshViewport()) return;

      const currentY = event.touches[0]?.clientY ?? startYRef.current;
      const deltaY = currentY - startYRef.current;

      if (scrollEl!.scrollTop > 0) {
        pullingRef.current = false;
        setPullDistance(0);
        return;
      }

      if (deltaY <= 0) {
        setPullDistance(0);
        return;
      }

      event.preventDefault();
      setPullDistance(Math.min(deltaY * 0.5, MOBILE_PTR_MAX_PULL_PX));
    }

    async function onTouchEnd() {
      if (!pullingRef.current) return;
      pullingRef.current = false;

      const distance = pullDistanceRef.current;
      if (distance >= MOBILE_PTR_THRESHOLD_PX && !isRefreshingRef.current) {
        setIsRefreshing(true);
        setPullDistance(MOBILE_PTR_HOLD_PX);

        try {
          await runRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
        return;
      }

      setPullDistance(0);
    }

    scrollEl.addEventListener("touchstart", onTouchStart, { passive: true });
    scrollEl.addEventListener("touchmove", onTouchMove, { passive: false });
    scrollEl.addEventListener("touchend", onTouchEnd, { passive: true });
    scrollEl.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      scrollEl.removeEventListener("touchstart", onTouchStart);
      scrollEl.removeEventListener("touchmove", onTouchMove);
      scrollEl.removeEventListener("touchend", onTouchEnd);
      scrollEl.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [enabled, runRefresh, scrollRef]);

  const contentStyle =
    pullDistance > 0 || isRefreshing
      ? {
          transform: `translateY(${pullDistance}px)`,
          transition:
            pullDistance === 0 && !isRefreshing ? "transform 0.22s ease" : undefined,
        }
      : undefined;

  return {
    pullDistance,
    isRefreshing,
    contentStyle,
    threshold: MOBILE_PTR_THRESHOLD_PX,
  };
}
