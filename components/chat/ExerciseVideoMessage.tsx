"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ExerciseVideoBadge from "@/components/ExerciseVideoBadge";
import ChatVideoCoachFeedbackViewer from "@/components/chat/ChatVideoCoachFeedbackViewer";
import {
  formatDutchSetLabel,
  formatExerciseVideoStatsLine,
  type ExerciseVideoMessagePayload,
} from "@/lib/chatUtils";

type ExerciseVideoMessageProps = {
  videoUrl: string;
  payload: ExerciseVideoMessagePayload;
  isMine: boolean;
  coachFeedbackEnabled?: boolean;
  onSendFeedback?: (payload: {
    text: string;
    imageFile?: File;
  }) => Promise<void>;
};

export default function ExerciseVideoMessage({
  videoUrl,
  payload,
  isMine,
  coachFeedbackEnabled = false,
  onSendFeedback,
}: ExerciseVideoMessageProps) {
  const [fullscreenOpen, setFullscreenOpen] = useState(false);

  const statsLine = formatExerciseVideoStatsLine(payload);
  const caption = payload.caption?.trim() || "";
  const useCoachViewer = coachFeedbackEnabled && Boolean(onSendFeedback);

  useEffect(() => {
    if (!fullscreenOpen || useCoachViewer) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullscreenOpen, useCoachViewer]);

  return (
    <>
      <div className="mb-2 w-full">
        <button
          type="button"
          onClick={() => setFullscreenOpen(true)}
          className="relative block w-full overflow-hidden rounded-[16px] text-left"
          aria-label={`Video openen: ${payload.exerciseName}`}
        >
          <ExerciseVideoBadge
            exerciseName={payload.exerciseName}
            priority={payload.priority}
          />

          {payload.thumbnailUrl ? (
            <img
              src={payload.thumbnailUrl}
              alt={`${payload.exerciseName} set ${payload.setNumber}`}
              className="max-h-80 w-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="chat-video-preview">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                ▶ Video
              </span>
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

          <div className="absolute inset-x-0 bottom-0 p-3 text-white">
            <p className="text-base font-bold leading-tight">
              {payload.exerciseName}
            </p>
            <p className="mt-0.5 text-sm font-semibold text-white/90">
              {formatDutchSetLabel(payload.setNumber)}
            </p>
            {statsLine && (
              <p className="mt-0.5 text-sm font-semibold text-white/95">
                {statsLine}
              </p>
            )}
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-[10px] text-white backdrop-blur-sm">
              ▶
            </span>
          </div>
        </button>

        {caption && (
          <p
            className={`mt-2 whitespace-pre-wrap break-words text-[14px] leading-6 ${
              isMine ? "text-white/90" : "text-app-muted"
            }`}
          >
            {caption}
          </p>
        )}
      </div>

      {fullscreenOpen &&
        typeof document !== "undefined" &&
        createPortal(
          useCoachViewer && onSendFeedback ? (
            <ChatVideoCoachFeedbackViewer
              videoUrl={videoUrl}
              title={payload.exerciseName}
              subtitle={`${formatDutchSetLabel(payload.setNumber)}${
                statsLine ? ` · ${statsLine}` : ""
              }`}
              onClose={() => setFullscreenOpen(false)}
              onSendFeedback={onSendFeedback}
            />
          ) : (
            <div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white">
              <div className="flex items-center justify-between px-4 py-[max(12px,env(safe-area-inset-top))]">
                <button
                  type="button"
                  onClick={() => setFullscreenOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl font-light"
                  aria-label="Sluit video"
                >
                  ×
                </button>
                <div className="min-w-0 flex-1 px-3 text-right">
                  <p className="truncate text-sm font-bold">{payload.exerciseName}</p>
                  <p className="truncate text-xs text-white/70">
                    {formatDutchSetLabel(payload.setNumber)}
                    {statsLine ? ` · ${statsLine}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 items-center justify-center px-2">
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              {caption && (
                <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/90">
                    {caption}
                  </p>
                </div>
              )}
            </div>
          ),
          document.body,
        )}
    </>
  );
}
