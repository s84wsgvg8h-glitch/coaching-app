"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ChatFullscreenVideoOverlay from "@/components/chat/ChatFullscreenVideoOverlay";

type ChatPlainVideoMessageProps = {
  videoUrl: string;
  title?: string;
  onMediaLoaded?: () => void;
  embedded?: boolean;
};

export default function ChatPlainVideoMessage({
  videoUrl,
  title = "Video",
  onMediaLoaded,
  embedded = false,
}: ChatPlainVideoMessageProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        className={`relative block w-full overflow-hidden text-left ${
          embedded ? "" : "mb-2 rounded-[16px]"
        }`}
        aria-label="Video openen"
      >
        <video
          src={videoUrl}
          preload="metadata"
          playsInline
          muted
          onLoadedData={onMediaLoaded}
          className="max-h-72 w-full object-cover"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-black/20">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm">
            ▶
          </span>
        </span>
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <ChatFullscreenVideoOverlay
            onClose={() => setOpen(false)}
            title={title}
            hideFooter
            media={
              <div className="chat-fullscreen-video__media-wrap">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  className="chat-fullscreen-video__media"
                />
              </div>
            }
          />,
          document.body,
        )}
    </>
  );
}
