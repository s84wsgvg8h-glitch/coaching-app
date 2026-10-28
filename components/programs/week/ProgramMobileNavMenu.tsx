"use client";

import {
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type MenuAnchor = {
  top: number;
  left: number;
  width: number;
};

export default function ProgramMobileNavMenu({
  open,
  anchorRef,
  children,
  onClose,
  wide = false,
}: {
  open: boolean;
  anchorRef: RefObject<HTMLButtonElement | null>;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    deferEffectUpdate(() => {
      setMounted(true);
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      deferEffectUpdate(() => {
        setAnchor(null);
      });
      return;
    }

    function updateAnchor() {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) {
        setAnchor(null);
        return;
      }

      const width = wide
        ? Math.min(window.innerWidth - 16, 420)
        : Math.max(rect.width, 168);
      const maxLeft = Math.max(8, window.innerWidth - width - 8);
      const left = wide ? Math.max(8, Math.min(rect.left, maxLeft)) : Math.min(Math.max(8, rect.left), maxLeft);

      setAnchor({
        top: rect.bottom + 6,
        left,
        width,
      });
    }

    updateAnchor();
    window.addEventListener("resize", updateAnchor);
    window.addEventListener("scroll", updateAnchor, true);

    return () => {
      window.removeEventListener("resize", updateAnchor);
      window.removeEventListener("scroll", updateAnchor, true);
    };
  }, [open, anchorRef]);

  if (!mounted || !open || !anchor) return null;

  return createPortal(
    <>
      <button
        type="button"
        aria-label="Sluit menu"
        className="program-mobile-week-nav-backdrop fixed inset-0 z-[250] cursor-default bg-transparent"
        onClick={onClose}
      />
      <div
        role="menu"
        className={`program-mobile-week-nav-menu fixed z-[251] max-h-[min(16rem,50dvh)] overflow-y-auto overscroll-contain rounded-2xl border py-1 shadow-xl${
          wide ? " program-mobile-week-nav-menu--wide" : ""
        }`}
        style={{
          top: anchor.top,
          left: anchor.left,
          width: anchor.width,
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}
