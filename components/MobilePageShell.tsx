"use client";

import type { ReactNode } from "react";

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
};

export default function MobilePageShell({
  children,
  header,
  footer,
  className = "",
  bodyClassName = "",
  scrollBody = true,
  reserveBottomNav = false,
}: MobilePageShellProps) {
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

  return (
    <div className={rootClass}>
      {header ? <div className="mobile-page-shell__header">{header}</div> : null}
      <div className={bodyClass}>{children}</div>
      {footer ? <div className="mobile-page-shell__footer">{footer}</div> : null}
    </div>
  );
}

/** Class for in-page headers (chat) when not using the header slot */
export const MOBILE_SAFE_TOP_CLASS = "mobile-safe-top";
