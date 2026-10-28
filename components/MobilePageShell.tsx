"use client";

import { usePathname } from "next/navigation";
import { useRef, type ReactNode } from "react";
import MobilePullToRefreshInner from "@/components/mobile/MobilePullToRefreshInner";
import { useMobilePullToRefresh } from "@/hooks/useMobilePullToRefresh";
import { isMobilePullToRefreshPath } from "@/lib/mobilePullToRefresh";

export type MobilePageShellProps = {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Shell body scrolls (middle region grows/shrinks). Default true. */
  scrollBody?: boolean;
  /** Pad body for fixed 72px tab bar + home indicator */
  reserveBottomNav?: boolean;
  /** Enable pull-to-refresh on mobile. Default true. */
  pullToRefresh?: boolean;
  onPullToRefresh?: () => Promise<void> | void;
};

export default function MobilePageShell({
  children,
  header,
  footer,
  className = "",
  bodyClassName = "",
  scrollBody = true,
  reserveBottomNav = false,
  pullToRefresh = true,
  onPullToRefresh,
}: MobilePageShellProps) {
  const pathname = usePathname();
  const bodyRef = useRef<HTMLDivElement>(null);

  const ptrEnabled =
    pullToRefresh && scrollBody && isMobilePullToRefreshPath(pathname);

  const { pullDistance, isRefreshing, contentStyle, threshold } =
    useMobilePullToRefresh({
      scrollRef: bodyRef,
      enabled: ptrEnabled,
      onRefresh: onPullToRefresh,
    });

  const rootClass = [
    "mobile-page-shell",
    reserveBottomNav ? "mobile-page-shell--reserve-bottom-nav" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyClass = [
    "mobile-page-shell__body",
    scrollBody ? "mobile-page-shell__body--scroll" : "",
    bodyClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const bodyContent = ptrEnabled ? (
    <MobilePullToRefreshInner
      pullDistance={pullDistance}
      isRefreshing={isRefreshing}
      contentStyle={contentStyle}
      threshold={threshold}
    >
      {children}
    </MobilePullToRefreshInner>
  ) : (
    children
  );

  return (
    <div className={rootClass}>
      {header ? <div className="mobile-page-shell__header">{header}</div> : null}
      <div ref={scrollBody ? bodyRef : undefined} className={bodyClass}>
        {bodyContent}
      </div>
      {footer ? <div className="mobile-page-shell__footer">{footer}</div> : null}
    </div>
  );
}

/** Class for in-page headers (chat) when not using the header slot */
export const MOBILE_SAFE_TOP_CLASS = "mobile-safe-top";
