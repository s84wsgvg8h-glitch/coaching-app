"use client";

import type { CSSProperties, ReactNode } from "react";
import MobilePullToRefreshIndicator from "@/components/mobile/MobilePullToRefreshIndicator";

type MobilePullToRefreshInnerProps = {
  children: ReactNode;
  pullDistance: number;
  isRefreshing: boolean;
  contentStyle?: CSSProperties;
  threshold?: number;
  className?: string;
};

export default function MobilePullToRefreshInner({
  children,
  pullDistance,
  isRefreshing,
  contentStyle,
  threshold,
  className = "",
}: MobilePullToRefreshInnerProps) {
  return (
    <div
      className={`mobile-ptr-content min-h-full ${className}`.trim()}
      style={contentStyle}
    >
      <MobilePullToRefreshIndicator
        pullDistance={pullDistance}
        isRefreshing={isRefreshing}
        threshold={threshold}
      />
      {children}
    </div>
  );
}
