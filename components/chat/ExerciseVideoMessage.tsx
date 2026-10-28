"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ExerciseVideoBadge from "@/components/ExerciseVideoBadge";
import ChatFullscreenVideoOverlay from "@/components/chat/ChatFullscreenVideoOverlay";
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
          className="chat-media-card relative block w-full overflow-hidden text-left"
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
              className="max-h-[35dvh] w-full object-cover"
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
          <p className="chat-bubble-text mt-2 opacity-90">{caption}</p>
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
            <ChatFullscreenVideoOverlay
              onClose={() => setFullscreenOpen(false)}
              title={payload.exerciseName}
              subtitle={`${formatDutchSetLabel(payload.setNumber)}${
                statsLine ? ` · ${statsLine}` : ""
              }`}
              hideFooter={!caption}
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
              footer={
                caption ? (
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white/90">
                    {caption}
                  </p>
                ) : undefined
              }
            />
          ),
          document.body,
        )}
    </>
  );
}
