"use client";

import { createPortal } from "react-dom";
import { normalizeExerciseName } from "@/lib/programWeek/exerciseUtils";
import { type VideoRecorderTarget } from "@/lib/programWeek/types";

export type ProgramAthleteVideoRecorderProps = {
  isOpen: boolean;
  videoRecorderTarget: VideoRecorderTarget | null;
  recordedVideoUrl: string;
  cameraVideoRef: React.RefObject<HTMLVideoElement | null>;
  closeVideoRecorder: () => void;
  toggleFlash: () => void;
  isRecordingVideo: boolean;
  flashOn: boolean;
  cameraError: string;
  formatVideoTime: (value: number) => string;
  recordingSeconds: number;
  galleryOpen: boolean;
  galleryFiles: File[];
  setGalleryOpen: (open: boolean) => void;
  chooseGalleryFile: (file: File) => void;
  galleryInputRef: React.RefObject<HTMLInputElement | null>;
  handleGalleryFiles: (files: FileList | null) => void;
  handleRecordButtonClick: () => void;
  cameraReady: boolean;
  switchCameraFacingMode: () => void;
  previewVideoRef: React.RefObject<HTMLVideoElement | null>;
  muteVideoAudio: boolean;
  handlePreviewLoadedMetadata: () => void;
  trimSliderRef: React.RefObject<HTMLDivElement | null>;
  trimEnd: number;
  videoDuration: number;
  trimStart: number;
  activeTrimHandle: "start" | "end" | null;
  setActiveTrimHandle: (handle: "start" | "end" | null) => void;
  updateTrimFromClientX: (clientX: number, handle?: "start" | "end") => void;
  togglePreviewMute: () => void;
  scrollMobileFieldIntoView: (target: HTMLElement) => void;
  videoCaption: string;
  setVideoCaption: (value: string) => void;
  resetRecordedVideo: () => void;
  trimmingVideo: boolean;
  uploadingVideoSetKey: string;
  saveRecordedVideo: () => void;
};

export default function ProgramAthleteVideoRecorder({
  isOpen,
  videoRecorderTarget,
  recordedVideoUrl,
  cameraVideoRef,
  closeVideoRecorder,
  toggleFlash,
  isRecordingVideo,
  flashOn,
  cameraError,
  formatVideoTime,
  recordingSeconds,
  galleryOpen,
  galleryFiles,
  setGalleryOpen,
  chooseGalleryFile,
  galleryInputRef,
  handleGalleryFiles,
  handleRecordButtonClick,
  cameraReady,
  switchCameraFacingMode,
  previewVideoRef,
  muteVideoAudio,
  handlePreviewLoadedMetadata,
  trimSliderRef,
  trimEnd,
  videoDuration,
  trimStart,
  activeTrimHandle,
  setActiveTrimHandle,
  updateTrimFromClientX,
  togglePreviewMute,
  scrollMobileFieldIntoView,
  videoCaption,
  setVideoCaption,
  resetRecordedVideo,
  trimmingVideo,
  uploadingVideoSetKey,
  saveRecordedVideo,
}: ProgramAthleteVideoRecorderProps) {
  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 isolate z-[9999] touch-manipulation overscroll-none bg-black text-white">
      {!recordedVideoUrl && (
        <div
          className="relative h-[100dvh] w-full touch-none overflow-hidden bg-black"
          onTouchMove={(e) => e.preventDefault()}
        >
          <video
            ref={cameraVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full bg-black object-cover"
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 to-transparent" />

          <div className="absolute left-4 right-4 top-[max(16px,env(safe-area-inset-top))] flex items-center justify-between">
            <button
              type="button"
              onClick={closeVideoRecorder}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-3xl font-light text-white backdrop-blur active:scale-95"
              aria-label="Sluiten"
            >
              ×
            </button>

            <div className="rounded-full bg-black/45 px-4 py-2 text-center backdrop-blur">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
                Video
              </p>
              <p className="max-w-[190px] truncate text-xs font-bold text-white">
                {videoRecorderTarget
                  ? `${normalizeExerciseName(videoRecorderTarget.exercise.name)} · set ${videoRecorderTarget.setNumber}`
                  : "Video opnemen"}
              </p>
            </div>

            <button
              type="button"
              onClick={toggleFlash}
              disabled={isRecordingVideo}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-lg backdrop-blur active:scale-95 disabled:opacity-30 ${
                flashOn ? "bg-white text-black" : "bg-black/45 text-white"
              }`}
              aria-label="Flits"
            >
              ⚡
            </button>
          </div>

          {cameraError && (
            <div className="absolute left-5 right-5 top-28 rounded-3xl bg-red-500/90 p-4 text-center text-sm font-bold text-white shadow-2xl">
              {cameraError}
            </div>
          )}

          {isRecordingVideo && (
            <div className="absolute left-1/2 top-[max(86px,calc(env(safe-area-inset-top)+70px))] flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-black text-white backdrop-blur">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {formatVideoTime(recordingSeconds)}
            </div>
          )}

          <div className="absolute bottom-[max(26px,env(safe-area-inset-bottom))] left-0 right-0 px-6">
            {galleryOpen && galleryFiles.length > 0 && (
              <div className="mb-5 max-h-44 overflow-y-auto rounded-3xl border border-white/15 bg-black/60 p-3 shadow-2xl backdrop-blur">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-white/70">
                    Camerarol
                  </p>
                  <button
                    type="button"
                    onClick={() => setGalleryOpen(false)}
                    className="text-xs font-bold text-white/60"
                  >
                    Sluit
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {galleryFiles.map((file, index) => (
                    <button
                      key={`${file.name}-${file.lastModified}-${index}`}
                      type="button"
                      onClick={() => chooseGalleryFile(file)}
                      className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10 bg-white/10"
                    >
                      <video
                        src={URL.createObjectURL(file)}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 right-1 truncate rounded-full bg-black/55 px-2 py-1 text-[10px] font-bold text-white">
                        Video {index + 1}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <input
              ref={galleryInputRef}
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => handleGalleryFiles(e.target.files)}
              className="hidden"
            />

            <div className="grid grid-cols-3 items-center">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isRecordingVideo}
                className="flex h-12 w-12 items-center justify-center justify-self-start rounded-2xl bg-black/45 text-xl text-white backdrop-blur active:scale-95 disabled:opacity-30"
                aria-label="Camerarol"
              >
                ▣
              </button>

              <button
                type="button"
                onClick={handleRecordButtonClick}
                disabled={!cameraReady && !isRecordingVideo}
                className={`relative flex h-20 w-20 items-center justify-center justify-self-center rounded-full border-[5px] border-white bg-white/15 shadow-2xl active:scale-95 disabled:opacity-50 ${
                  isRecordingVideo ? "border-red-500" : ""
                }`}
                aria-label={isRecordingVideo ? "Stop opname" : "Start opname"}
              >
                <span
                  className={`block transition-all ${
                    isRecordingVideo
                      ? "h-8 w-8 rounded-lg bg-red-500"
                      : "h-14 w-14 rounded-full bg-red-500"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={switchCameraFacingMode}
                disabled={isRecordingVideo}
                className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full bg-black/45 text-xl text-white backdrop-blur active:scale-95 disabled:opacity-30"
                aria-label="Draai camera"
              >
                ↻
              </button>
            </div>

            <p className="mt-4 text-center text-xs font-black uppercase tracking-[0.22em] text-red-400">
              Video
            </p>
          </div>
        </div>
      )}

      {recordedVideoUrl && (
        <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
          <video
            ref={previewVideoRef}
            src={recordedVideoUrl}
            playsInline
            muted={muteVideoAudio}
            onLoadedMetadata={handlePreviewLoadedMetadata}
            className="pointer-events-none absolute inset-0 h-full w-full bg-black object-contain"
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/85 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/95 to-transparent" />

          <div className="pointer-events-auto absolute left-4 right-4 top-[max(10px,env(safe-area-inset-top))] z-20">
            <div className="rounded-3xl border border-white/15 bg-black/40 p-3 shadow-2xl backdrop-blur">
              <div
                ref={trimSliderRef}
                onPointerDown={(e) => {
                  const currentEnd = trimEnd || videoDuration;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const nextTime =
                    ((e.clientX - rect.left) / rect.width) * (videoDuration || 0);
                  const handle =
                    Math.abs(nextTime - trimStart) <= Math.abs(nextTime - currentEnd)
                      ? "start"
                      : "end";
                  setActiveTrimHandle(handle);
                  e.currentTarget.setPointerCapture(e.pointerId);
                  updateTrimFromClientX(e.clientX, handle);
                }}
                onPointerMove={(e) => {
                  if (!activeTrimHandle) return;
                  updateTrimFromClientX(e.clientX, activeTrimHandle);
                }}
                onPointerUp={(e) => {
                  setActiveTrimHandle(null);
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onPointerCancel={() => setActiveTrimHandle(null)}
                className="relative h-14 touch-none overflow-hidden rounded-2xl border border-white/20 bg-white/10"
              >
                <div className="absolute inset-0 flex">
                  {Array.from({ length: 28 }).map((_, index) => (
                    <div
                      key={index}
                      className="mx-[1px] flex-1 rounded-sm bg-white/30"
                      style={{ opacity: index % 2 === 0 ? 0.9 : 0.45 }}
                    />
                  ))}
                </div>

                <div
                  className="absolute top-0 h-full bg-black/55"
                  style={{
                    left: 0,
                    width: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                  }}
                />

                <div
                  className="absolute top-0 h-full bg-black/55"
                  style={{
                    right: 0,
                    width: `${
                      videoDuration
                        ? ((videoDuration - (trimEnd || videoDuration)) / videoDuration) *
                          100
                        : 0
                    }%`,
                  }}
                />

                <div
                  className="absolute top-0 h-full rounded-2xl border-2 border-white shadow-[0_0_18px_rgba(255,255,255,0.22)]"
                  style={{
                    left: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                    right: `${
                      videoDuration
                        ? ((videoDuration - (trimEnd || videoDuration)) / videoDuration) *
                          100
                        : 0
                    }%`,
                  }}
                />

                <div
                  className="absolute top-1/2 z-10 h-12 w-4 -translate-y-1/2 rounded-full bg-white shadow-xl"
                  style={{
                    left: `calc(${videoDuration ? (trimStart / videoDuration) * 100 : 0}% - 8px)`,
                  }}
                />

                <div
                  className="absolute top-1/2 z-10 h-12 w-4 -translate-y-1/2 rounded-full bg-white shadow-xl"
                  style={{
                    left: `calc(${videoDuration ? ((trimEnd || videoDuration) / videoDuration) * 100 : 100}% - 8px)`,
                  }}
                />
              </div>

              <p className="mt-2 text-center text-[11px] font-bold text-white/65">
                {formatVideoTime(trimStart)} - {formatVideoTime(trimEnd || videoDuration)}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={togglePreviewMute}
            className="pointer-events-auto absolute right-4 top-[max(92px,calc(env(safe-area-inset-top)+84px))] z-20 flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-lg text-white backdrop-blur active:scale-95"
            aria-label="Geluid aan of uit"
          >
            {muteVideoAudio ? "🔇" : "🔊"}
          </button>

          <button
            type="button"
            onClick={() => {
              if (!previewVideoRef.current) return;
              if (previewVideoRef.current.paused) {
                void previewVideoRef.current.play();
              } else {
                previewVideoRef.current.pause();
              }
            }}
            className="pointer-events-auto absolute left-1/2 top-1/2 z-20 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 text-black shadow-2xl backdrop-blur active:scale-95"
            aria-label="Video afspelen of pauzeren"
          >
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="ml-0.5 h-5 w-5"
              aria-hidden="true"
            >
              <path d="M8 5.5v13l10-6.5-10-6.5Z" />
            </svg>
          </button>

          <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-[10000] px-4 pb-[max(16px,env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-3 w-full max-w-sm">
              <textarea
                value={videoCaption}
                onChange={(e) => setVideoCaption(e.target.value)}
                onFocus={(e) => scrollMobileFieldIntoView(e.currentTarget)}
                placeholder="Voeg een bijschrift toe..."
                rows={2}
                maxLength={500}
                className="max-h-24 w-full resize-none rounded-3xl border border-white/15 bg-black/45 px-4 py-3 text-base text-white placeholder:text-white/45 outline-none backdrop-blur focus:border-white/30"
              />
            </div>

            <div className="mx-auto grid w-full max-w-sm grid-cols-3 items-center gap-2">
              <button
                type="button"
                onClick={resetRecordedVideo}
                disabled={trimmingVideo || Boolean(uploadingVideoSetKey)}
                className="flex h-12 w-12 items-center justify-center justify-self-start rounded-full bg-white/10 text-2xl font-light text-white backdrop-blur active:scale-95 disabled:opacity-40"
                aria-label="Opnieuw"
              >
                ×
              </button>

              <div />

              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  void saveRecordedVideo();
                }}
                disabled={trimmingVideo || Boolean(uploadingVideoSetKey)}
                className="flex h-12 w-12 items-center justify-center justify-self-end rounded-full bg-white text-2xl font-black text-black shadow-xl active:scale-95 disabled:opacity-40"
                aria-label="Gebruik video"
              >
                {trimmingVideo || uploadingVideoSetKey ? "…" : "✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
