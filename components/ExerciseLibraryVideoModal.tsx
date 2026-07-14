"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ExerciseLibraryItem } from "@/lib/exerciseLibrary";
import {
  getExerciseLibraryPlaybackUrl,
  resolveExerciseLibraryVideoUrl,
  revokeExerciseLibraryPlaybackUrl,
} from "@/lib/exerciseLibraryVideos";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type ExerciseLibraryVideoModalProps = {
  item: ExerciseLibraryItem | null;
  onClose: () => void;
};

export default function ExerciseLibraryVideoModal({
  item,
  onClose,
}: ExerciseLibraryVideoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    deferEffectUpdate(() => {
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (!item) {
      deferEffectUpdate(() => {
        setPlaybackUrl(null);
        setFallbackUrl(null);
        setVideoError(false);
      });
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;

    async function loadPlaybackUrl() {
      setLoadingUrl(true);
      setVideoError(false);

      const primaryUrl = await getExerciseLibraryPlaybackUrl(item);
      const publicUrl = resolveExerciseLibraryVideoUrl(item);

      if (cancelled) {
        revokeExerciseLibraryPlaybackUrl(primaryUrl);
        return;
      }

      objectUrl = primaryUrl?.startsWith("blob:") ? primaryUrl : null;

      setPlaybackUrl(primaryUrl);
      setFallbackUrl(
        publicUrl && publicUrl !== primaryUrl ? publicUrl : null,
      );
      setLoadingUrl(false);
    }

    void loadPlaybackUrl();

    return () => {
      cancelled = true;
      revokeExerciseLibraryPlaybackUrl(objectUrl);
    };
  }, [item]);

  if (!item || !mounted) return null;

  const openUrl = playbackUrl || fallbackUrl;

  return createPortal(
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center bg-black/50 p-4 pt-10 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-app-border bg-app-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {loadingUrl ? (
          <div className="flex aspect-video items-center justify-center bg-app-surface-muted text-sm text-app-muted">
            Video laden...
          </div>
        ) : playbackUrl && !videoError ? (
          <video
            key={playbackUrl}
            src={playbackUrl}
            controls
            autoPlay
            playsInline
            preload="metadata"
            className="aspect-video w-full bg-black"
            onError={() => {
              if (fallbackUrl && fallbackUrl !== playbackUrl) {
                revokeExerciseLibraryPlaybackUrl(playbackUrl);
                setPlaybackUrl(fallbackUrl);
                setFallbackUrl(null);
                return;
              }

              setVideoError(true);
            }}
          />
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center gap-2 bg-app-surface-muted px-6 text-center text-app-muted">
            <p>
              {videoError
                ? "Video kon niet worden afgespeeld."
                : "Geen video beschikbaar"}
            </p>
            {openUrl && videoError && (
              <a
                href={openUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-purple-700 underline"
              >
                Open video in nieuw tabblad
              </a>
            )}
          </div>
        )}

        <div className="space-y-3 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              {item.category}
            </p>
            <h2 className="text-2xl font-bold text-app-text">{item.name}</h2>
          </div>

          {item.description && (
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {item.description}
            </p>
          )}

          {item.cues && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-400">
                Coaching cues
              </p>
              <p className="whitespace-pre-wrap text-sm text-gray-700">
                {item.cues}
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-app-border px-4 py-2 text-sm font-semibold text-app-muted hover:bg-app-surface-hover"
          >
            Sluiten
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
