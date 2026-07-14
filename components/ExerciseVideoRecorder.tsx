"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type ExerciseVideoRecorderProps = {
  open: boolean;
  title?: string;
  saving?: boolean;
  onClose: () => void;
  onSave: (file: File) => void | Promise<void>;
};

function getSupportedVideoMimeType() {
  const types = [
    "video/mp4;codecs=h264,aac",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function getRecordedFileExtension(type: string) {
  return type.includes("mp4") ? "mp4" : "webm";
}

function formatVideoTime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function isIgnorableCameraError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  return /aborted|AbortError|interrupted by a new load request/i.test(message);
}

function getCameraErrorMessage(error: unknown) {
  if (isIgnorableCameraError(error)) return "";

  const message = error instanceof Error ? error.message : String(error);

  return (
    message ||
    "Camera kon niet worden geopend. Geef Safari/Chrome toestemming voor camera en microfoon."
  );
}

export default function ExerciseVideoRecorder({
  open,
  title = "Video opnemen",
  saving = false,
  onClose,
  onSave,
}: ExerciseVideoRecorderProps) {
  const [cameraFacingMode, setCameraFacingMode] = useState<"user" | "environment">(
    "environment",
  );
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState("");
  const [recordedVideoFile, setRecordedVideoFile] = useState<File | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [trimmingVideo, setTrimmingVideo] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [muteVideoAudio, setMuteVideoAudio] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [activeTrimHandle, setActiveTrimHandle] = useState<"start" | "end" | null>(
    null,
  );

  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const trimSliderRef = useRef<HTMLDivElement | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }

  function stopCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  async function playCameraPreview() {
    if (!cameraVideoRef.current) return;

    try {
      await cameraVideoRef.current.play();
    } catch (error) {
      if (!isIgnorableCameraError(error)) {
        console.warn("CAMERA PREVIEW PLAY ERROR:", error);
      }
    }
  }

  async function applyTorch(nextFlashOn: boolean) {
    const videoTrack = cameraStreamRef.current?.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      if (!capabilities?.torch) return;

      await videoTrack.applyConstraints({
        advanced: [{ torch: nextFlashOn } as MediaTrackConstraintSet],
      });
    } catch {
      if (nextFlashOn) setFlashOn(false);
    }
  }

  async function startCameraStream() {
    setCameraError("");

    if (cameraStreamRef.current) {
      if (
        cameraVideoRef.current &&
        cameraVideoRef.current.srcObject !== cameraStreamRef.current
      ) {
        cameraVideoRef.current.srcObject = cameraStreamRef.current;
        await playCameraPreview();
      }
      setCameraReady(true);
      await applyTorch(flashOn);
      return;
    }

    setCameraReady(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        // Video-only: keeps background music playing on iOS.
        audio: false,
      });

      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await playCameraPreview();
      }

      setCameraReady(true);
      await applyTorch(flashOn);
    } catch (error) {
      const message = getCameraErrorMessage(error);
      if (message) setCameraError(message);
      setCameraReady(false);
    }
  }

  function resetState() {
    stopCameraStream();
    stopRecordingTimer();
    setIsRecordingVideo(false);
    setRecordingSeconds(0);
    setCameraReady(false);
    setCameraError("");
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setGalleryOpen(false);
    setGalleryFiles([]);
    setMuteVideoAudio(true);
    setFlashOn(false);
    setActiveTrimHandle(null);
  }

  useEffect(() => {
    if (!open) {
      deferEffectUpdate(() => {
        resetState();
      });
      return;
    }

    if (recordedVideoUrl) {
      stopCameraStream();
      return;
    }

    deferEffectUpdate(() => {
      void startCameraStream();
    });
  }, [open, recordedVideoUrl]);

  useEffect(() => {
    if (!open || recordedVideoUrl) return;
    stopCameraStream();
    deferEffectUpdate(() => {
      void startCameraStream();
    });
  }, [cameraFacingMode]);

  useEffect(() => {
    deferEffectUpdate(() => {
      void applyTorch(flashOn);
    });
  }, [flashOn]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  function handleGalleryFiles(files: FileList | null) {
    const videos = Array.from(files || []).filter((file) =>
      file.type.startsWith("video/"),
    );

    if (videos.length === 0) {
      alert("Kies minimaal één video uit je camerarol");
      return;
    }

    setGalleryFiles(videos);
    setGalleryOpen(true);
  }

  function chooseGalleryFile(file: File) {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    const url = URL.createObjectURL(file);
    setRecordedVideoFile(file);
    setRecordedVideoUrl(url);
    setTrimStart(0);
    setTrimEnd(0);
    setRecordingSeconds(0);
    setGalleryOpen(false);
    stopRecordingTimer();
    setIsRecordingVideo(false);
  }

  function startVideoRecording() {
    const stream = cameraStreamRef.current;
    if (!stream) {
      alert("Camera is nog niet klaar");
      return;
    }

    const mimeType = getSupportedVideoMimeType();

    try {
      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const recordingType = recorder.mimeType || mimeType || "video/mp4";
        const extension = getRecordedFileExtension(recordingType);
        const blob = new Blob(recordedChunksRef.current, { type: recordingType });
        const file = new File([blob], `recording-${Date.now()}.${extension}`, {
          type: recordingType,
        });
        const url = URL.createObjectURL(blob);
        if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
        setRecordedVideoFile(file);
        setRecordedVideoUrl(url);
        setTrimStart(0);
        setTrimEnd(0);
        stopRecordingTimer();
        setIsRecordingVideo(false);
      };

      recorder.start(250);
      setRecordingSeconds(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      setIsRecordingVideo(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Opnemen mislukt");
      setIsRecordingVideo(false);
    }
  }

  function stopVideoRecording() {
    stopRecordingTimer();
    if (mediaRecorderRef.current?.state !== "inactive") {
      mediaRecorderRef.current?.stop();
    }
  }

  function resetRecordedVideo() {
    if (recordedVideoUrl) URL.revokeObjectURL(recordedVideoUrl);
    setRecordedVideoUrl("");
    setRecordedVideoFile(null);
    setVideoDuration(0);
    setTrimStart(0);
    setTrimEnd(0);
    setGalleryOpen(false);
    window.setTimeout(() => void startCameraStream(), 80);
  }

  function handlePreviewLoadedMetadata() {
    const duration = previewVideoRef.current?.duration || 0;
    if (!Number.isFinite(duration) || duration <= 0) return;
    setVideoDuration(duration);
    setTrimStart(0);
    setTrimEnd(duration);
  }

  async function getFFmpeg() {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;
    const ffmpeg = ffmpegRef.current || new FFmpeg();
    ffmpegRef.current = ffmpeg;
    if (!ffmpeg.loaded) await ffmpeg.load();
    return ffmpeg;
  }

  async function trimVideoFile(file: File, start: number, end: number) {
    const effectiveEnd = end > 0 ? end : videoDuration;

    if (
      !muteVideoAudio &&
      (!videoDuration ||
        (start <= 0.05 && effectiveEnd >= Math.max(videoDuration - 0.05, 0)))
    ) {
      return file;
    }

    const safeStart = Math.max(0, start);
    const safeEnd = videoDuration
      ? Math.min(videoDuration, effectiveEnd || videoDuration)
      : Math.max(effectiveEnd || 0, safeStart + 0.5);

    if (safeEnd <= safeStart) return file;

    setTrimmingVideo(true);

    try {
      const ffmpeg = await getFFmpeg();
      const inputName = file.name.toLowerCase().endsWith(".webm")
        ? "input.webm"
        : "input.mp4";
      const outputName = "output.mp4";

      await ffmpeg.writeFile(inputName, await fetchFile(file));
      const ffmpegArgs = [
        "-ss",
        String(safeStart),
        "-to",
        String(safeEnd),
        "-i",
        inputName,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
      ];

      if (muteVideoAudio) ffmpegArgs.push("-an");
      else ffmpegArgs.push("-c:a", "aac");

      ffmpegArgs.push(outputName);
      await ffmpeg.exec(ffmpegArgs);

      const output = await ffmpeg.readFile(outputName);
      const outputData =
        output instanceof Uint8Array ? output : new TextEncoder().encode(output);
      const fixedOutputData = new Uint8Array(outputData as Uint8Array).buffer;

      await ffmpeg.deleteFile(inputName).catch(() => undefined);
      await ffmpeg.deleteFile(outputName).catch(() => undefined);

      return new File([new Blob([fixedOutputData], { type: "video/mp4" })], `trimmed-${Date.now()}.mp4`, {
        type: "video/mp4",
      });
    } finally {
      setTrimmingVideo(false);
    }
  }

  async function handleSave() {
    if (!recordedVideoFile) {
      alert("Neem eerst een video op of kies er een uit je camerarol");
      return;
    }

    const endTime = trimEnd || videoDuration || 0;
    let fileToUpload = recordedVideoFile;

    try {
      fileToUpload = await trimVideoFile(recordedVideoFile, trimStart, endTime);
    } catch {
      fileToUpload = recordedVideoFile;
    }

    await onSave(fileToUpload);
  }

  function updateTrimFromClientX(clientX: number, handle?: "start" | "end") {
    if (!trimSliderRef.current || !videoDuration) return;

    const rect = trimSliderRef.current.getBoundingClientRect();
    const nextTime = Math.min(
      videoDuration,
      Math.max(0, ((clientX - rect.left) / rect.width) * videoDuration),
    );
    const minGap = Math.min(0.4, Math.max(0.1, videoDuration / 30));
    const currentEnd = trimEnd || videoDuration;
    const chosenHandle =
      handle ||
      (Math.abs(nextTime - trimStart) <= Math.abs(nextTime - currentEnd)
        ? "start"
        : "end");

    if (chosenHandle === "start") {
      const nextStart = Math.min(nextTime, currentEnd - minGap);
      setTrimStart(nextStart);
      if (previewVideoRef.current) previewVideoRef.current.currentTime = nextStart;
      return;
    }

    const nextEnd = Math.max(nextTime, trimStart + minGap);
    setTrimEnd(nextEnd);
    if (previewVideoRef.current) previewVideoRef.current.currentTime = nextEnd;
  }

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] overscroll-none bg-black text-white">
      {!recordedVideoUrl && (
        <div className="relative h-[100dvh] w-full touch-none overflow-hidden bg-black">
          <video
            ref={cameraVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full bg-black object-cover"
          />

          <div className="absolute left-4 right-4 top-[max(16px,env(safe-area-inset-top))] flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-3xl font-light text-white backdrop-blur"
            >
              ×
            </button>
            <div className="rounded-full bg-black/45 px-4 py-2 text-center backdrop-blur">
              <p className="max-w-[190px] truncate text-xs font-bold text-white">{title}</p>
            </div>
            <button
              type="button"
              onClick={() => setFlashOn((current) => !current)}
              disabled={isRecordingVideo}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-lg backdrop-blur disabled:opacity-30 ${
                flashOn ? "bg-white text-black" : "bg-black/45 text-white"
              }`}
            >
              ⚡
            </button>
          </div>

          {cameraError && (
            <div className="absolute left-5 right-5 top-28 rounded-3xl bg-red-500/90 p-4 text-center text-sm font-bold text-white">
              {cameraError}
            </div>
          )}

          {isRecordingVideo && (
            <div className="absolute left-1/2 top-24 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/55 px-4 py-2 text-sm font-black">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
              {formatVideoTime(recordingSeconds)}
            </div>
          )}

          <div className="absolute bottom-[max(26px,env(safe-area-inset-bottom))] left-0 right-0 px-6">
            {galleryOpen && galleryFiles.length > 0 && (
              <div className="mb-5 max-h-44 overflow-y-auto rounded-3xl border border-white/15 bg-black/60 p-3">
                <div className="grid grid-cols-3 gap-2">
                  {galleryFiles.map((file, index) => (
                    <button
                      key={`${file.name}-${file.lastModified}-${index}`}
                      type="button"
                      onClick={() => chooseGalleryFile(file)}
                      className="relative aspect-[9/16] overflow-hidden rounded-2xl border border-white/10"
                    >
                      <video
                        src={URL.createObjectURL(file)}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
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
              onChange={(event) => handleGalleryFiles(event.target.files)}
              className="hidden"
            />

            <div className="grid grid-cols-3 items-center">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isRecordingVideo}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/45 text-xl text-white backdrop-blur disabled:opacity-30"
                aria-label="Camerarol"
              >
                ▣
              </button>

              <button
                type="button"
                onClick={() =>
                  isRecordingVideo ? stopVideoRecording() : startVideoRecording()
                }
                disabled={!cameraReady && !isRecordingVideo}
                className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-white bg-white/15 disabled:opacity-50 ${
                  isRecordingVideo ? "border-red-500" : ""
                }`}
              >
                <span
                  className={`block ${
                    isRecordingVideo
                      ? "h-8 w-8 rounded-lg bg-red-500"
                      : "h-14 w-14 rounded-full bg-red-500"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isRecordingVideo) return;
                  setFlashOn(false);
                  setCameraFacingMode((current) =>
                    current === "environment" ? "user" : "environment",
                  );
                }}
                disabled={isRecordingVideo}
                className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur disabled:opacity-30"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      )}

      {recordedVideoUrl && (
        <div className="relative flex min-h-[100dvh] w-full flex-col overflow-y-auto bg-black pb-40">
          <video
            ref={previewVideoRef}
            src={recordedVideoUrl}
            playsInline
            muted={muteVideoAudio}
            onLoadedMetadata={handlePreviewLoadedMetadata}
            className="absolute inset-0 h-full w-full bg-black object-contain"
          />

          <div className="absolute left-4 right-4 top-[max(10px,env(safe-area-inset-top))]">
            <div
              ref={trimSliderRef}
              onPointerDown={(event) => {
                setActiveTrimHandle("start");
                updateTrimFromClientX(event.clientX);
              }}
              onPointerMove={(event) => {
                if (!activeTrimHandle) return;
                updateTrimFromClientX(event.clientX, activeTrimHandle);
              }}
              onPointerUp={() => setActiveTrimHandle(null)}
              className="relative h-12 rounded-2xl bg-white/15"
            >
              <div
                className="absolute top-0 h-full rounded-2xl border-2 border-white"
                style={{
                  left: `${videoDuration ? (trimStart / videoDuration) * 100 : 0}%`,
                  right: `${
                    videoDuration
                      ? ((videoDuration - (trimEnd || videoDuration)) / videoDuration) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMuteVideoAudio((current) => !current)}
            className="absolute right-4 top-24 flex h-10 w-10 items-center justify-center rounded-full bg-black/45 text-lg"
          >
            {muteVideoAudio ? "🔇" : "🔊"}
          </button>

          <div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-10 px-4">
            <div className="mx-auto grid w-full max-w-sm grid-cols-3 items-center">
              <button
                type="button"
                onClick={resetRecordedVideo}
                disabled={trimmingVideo || saving}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-2xl text-white disabled:opacity-40"
              >
                ×
              </button>
              <div />
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={trimmingVideo || saving}
                className="ml-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-2xl font-black text-black disabled:opacity-40"
              >
                {trimmingVideo || saving ? "…" : "✓"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
