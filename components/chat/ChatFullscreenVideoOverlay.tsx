"use client";

import { X } from "lucide-react";

type ChatFullscreenVideoOverlayProps = {
  onClose: () => void;
  title: string;
  subtitle?: string;
  media: React.ReactNode;
  footer?: React.ReactNode;
  hideFooter?: boolean;
  footerPlacement?: "bottom" | "top";
};

export default function ChatFullscreenVideoOverlay({
  onClose,
  title,
  subtitle,
  media,
  footer,
  hideFooter = false,
  footerPlacement = "bottom",
}: ChatFullscreenVideoOverlayProps) {
  const showFooter = Boolean(footer) && !hideFooter;

  return (
    <div
      className={`chat-fullscreen-video fixed inset-0 z-[9999] bg-black text-white${
        showFooter && footerPlacement === "bottom"
          ? " chat-fullscreen-video--bottom-footer"
          : ""
      }`}
    >
      <div className="chat-fullscreen-video__stage absolute inset-0">{media}</div>

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/40"
        aria-hidden="true"
      />

      <div
        className={`absolute inset-x-0 top-0 z-10 px-4 pb-6 pt-[max(12px,env(safe-area-inset-top))] ${
          showFooter && footerPlacement === "top"
            ? "bg-gradient-to-b from-black/80 via-black/45 to-transparent"
            : ""
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center text-white transition active:scale-95 active:opacity-70"
            aria-label="Sluit video"
          >
            <X className="h-6 w-6" strokeWidth={2.25} />
          </button>
          <div className="min-w-0 flex-1 pt-0.5 text-right">
            <p className="truncate text-sm font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-xs text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        {showFooter && footerPlacement === "top" ? (
          <div className="mt-3 rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-md">
            {footer}
          </div>
        ) : null}
      </div>

      {showFooter && footerPlacement === "bottom" ? (
        <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-10">
          <div className="rounded-2xl border border-white/10 bg-black/50 p-3 backdrop-blur-md">
            {footer}
          </div>
        </div>
      ) : null}
    </div>
  );
}
