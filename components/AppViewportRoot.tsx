"use client";

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { isChatPath } from "@/lib/viewportPin";
import { pinAppViewport, syncMobileViewport } from "@/lib/viewportPin";

export default function AppViewportRoot({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const chatRoute = isChatPath(pathname);

  useLayoutEffect(() => {
    if (chatRoute) {
      syncMobileViewport(pathname);
      return;
    }

    let focusOutTimer: number | null = null;

    function sync() {
      syncMobileViewport(pathname);
    }

    function onVisualViewportScroll() {
      pinAppViewport(pathname);
      sync();
    }

    function onFocusIn(event: FocusEvent) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.closest("input,textarea,select,[contenteditable='true']")) return;
      pinAppViewport(pathname);
      window.requestAnimationFrame(() => pinAppViewport(pathname));
    }

    function onFocusOut() {
      if (focusOutTimer !== null) {
        window.clearTimeout(focusOutTimer);
      }
      focusOutTimer = window.setTimeout(() => {
        pinAppViewport(pathname);
        sync();
        window.setTimeout(() => {
          pinAppViewport(pathname);
          sync();
        }, 120);
      }, 80);
    }

    sync();

    const viewport = window.visualViewport;
    viewport?.addEventListener("scroll", onVisualViewportScroll);
    viewport?.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);

    return () => {
      if (focusOutTimer !== null) {
        window.clearTimeout(focusOutTimer);
      }
      viewport?.removeEventListener("scroll", onVisualViewportScroll);
      viewport?.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [pathname, chatRoute]);

  useLayoutEffect(() => {
    syncMobileViewport(pathname);
  }, [pathname]);

  return (
    // suppressHydrationWarning: pinAppViewport() applies inline styles on the
    // client immediately after mount; the server renders without them, causing
    // a benign mismatch that we intentionally suppress here.
    <div id="app-viewport-root" className="app-viewport-root" suppressHydrationWarning>
      <div className="app-viewport-inner">{children}</div>
    </div>
  );
}
