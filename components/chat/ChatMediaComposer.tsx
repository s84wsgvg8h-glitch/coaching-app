"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { SendHorizontal, X } from "lucide-react";

type ChatMediaComposerProps = {
  open: boolean;
  file: File | null;
  uploading?: boolean;
  onClose: () => void;
  onSend: (file: File, caption: string) => void;
};

export default function ChatMediaComposer({
  open,
  file,
  uploading = false,
  onClose,
  onSend,
}: ChatMediaComposerProps) {
  const [caption, setCaption] = useState("");

  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    if (!open) {
      setCaption("");
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  if (!open || !file || typeof document === "undefined") {
    return null;
  }

  const isVideo = file.type.startsWith("video/");

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-end justify-center bg-black/70 p-0 md:items-center md:p-6">
      <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-black md:h-auto md:max-h-[90vh] md:max-w-2xl md:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 text-white">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="rounded-full p-2 hover:bg-white/10 disabled:opacity-40"
            aria-label="Sluiten"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold">
            {isVideo ? "Video versturen" : "Foto versturen"}
          </p>
          <div className="w-9" />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden bg-black">
          {isVideo ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
            />
          ) : (
            <img
              src={previewUrl}
              alt="Voorvertoning"
              className="h-full w-full object-contain"
            />
          )}
        </div>

        <div className="shrink-0 border-t border-white/10 bg-[#111] px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Voeg een bijschrift toe..."
              disabled={uploading}
              className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/40 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => onSend(file, caption.trim())}
              disabled={uploading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-app-surface text-app-text disabled:opacity-40"
              aria-label="Versturen"
            >
              <SendHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
