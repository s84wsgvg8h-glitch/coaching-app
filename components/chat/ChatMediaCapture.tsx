"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Image as ImageIcon } from "lucide-react";

type CaptureMode = "photo" | "video";

type ChatMediaCaptureProps = {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File, caption: string) => void;
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

async function capturePhotoFromVideo(video: HTMLVideoElement) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Kon geen foto maken");
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (value) => {
        if (!value) {
          reject(new Error("Kon geen foto maken"));
          return;
        }

        resolve(value);
      },
      "image/jpeg",
      0.9,
    );
  });

  return new File([blob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
}

function formatVideoTime(value: number) {
  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function ChatMediaCapture({
  open,
  onClose,
  onCapture,
}: ChatMediaCaptureProps) {
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const startingCameraRef = useRef(false);

  const [mode, setMode] = useState<CaptureMode>("photo");
  const [cameraFacingMode, setCameraFacingMode] = useState<
    "user" | "environment"
  >("environment");
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [isRecordingVideo, setIsRecordingVideo] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [flashOn, setFlashOn] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);

  useEffect(() => {
    if (!open) return;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || previewUrl) return;

    void startCameraStream(false);

    return () => {
      stopCameraStream();
    };
  }, [open, previewUrl, cameraFacingMode]);

  useEffect(() => {
    return () => {
      stopRecordingTimer();
      stopCameraStream();

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function stopRecordingTimer() {
    if (recordingTimerRef.current) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
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

  async function startCameraStream(withAudio: boolean) {
    if (startingCameraRef.current) return;

    startingCameraRef.current = true;
    setCameraError("");
    stopCameraStream();
    setCameraReady(false);
    setCameraStarting(true);

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("Je browser ondersteunt de camera niet.");
      setCameraStarting(false);
      startingCameraRef.current = false;
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 640, max: 1280 },
          height: { ideal: 480, max: 720 },
        },
        audio: withAudio,
      });

      cameraStreamRef.current = stream;

      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        await playCameraPreview();
      }

      setCameraReady(true);

      const track = stream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as MediaTrackCapabilities & {
        torch?: boolean;
      };
      setFlashSupported(Boolean(capabilities?.torch));
    } catch (error) {
      console.error("CAMERA ERROR:", error);
      const message = getCameraErrorMessage(error);
      if (message) {
        setCameraError(message);
      }
      setCameraReady(false);
    } finally {
      setCameraStarting(false);
      startingCameraRef.current = false;
    }
  }

  async function ensureAudioForRecording() {
    const stream = cameraStreamRef.current;
    if (!stream) return false;

    if (stream.getAudioTracks().length > 0) {
      return true;
    }

    stopCameraStream();
    await startCameraStream(true);
    return Boolean(cameraStreamRef.current);
  }

  function stopCameraStream() {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    setFlashOn(false);
    setFlashSupported(false);

    if (cameraVideoRef.current) {
      cameraVideoRef.current.srcObject = null;
    }
  }

  async function toggleFlash() {
    const track = cameraStreamRef.current?.getVideoTracks()[0];
    if (!track) return;

    const nextValue = !flashOn;

    try {
      await track.applyConstraints({
        torch: nextValue,
      } as MediaTrackConstraints);
      setFlashOn(nextValue);
      return;
    } catch {
      // fall through
    }

    try {
      await track.applyConstraints({
        advanced: [{ torch: nextValue } as MediaTrackConstraintSet],
      });
      setFlashOn(nextValue);
    } catch {
      alert("Flits niet beschikbaar op dit apparaat");
    }
  }

  function resetPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl("");
    setPreviewFile(null);
    setCaption("");
    setRecordingSeconds(0);
    setCameraError("");
    setCameraReady(false);
  }

  function handleClose() {
    if (isRecordingVideo) {
      mediaRecorderRef.current?.stop();
    }

    stopRecordingTimer();
    stopCameraStream();
    resetPreview();
    setIsRecordingVideo(false);
    setMode("photo");
    onClose();
  }

  function switchCameraFacingMode() {
    if (isRecordingVideo) return;

    setCameraFacingMode((current) =>
      current === "environment" ? "user" : "environment",
    );
  }

  function showPreviewForFile(file: File) {
    stopCameraStream();
    const url = URL.createObjectURL(file);
    setPreviewFile(file);
    setPreviewUrl(url);
  }

  async function handlePhotoCapture() {
    if (!cameraVideoRef.current || !cameraReady) return;

    try {
      const file = await capturePhotoFromVideo(cameraVideoRef.current);
      showPreviewForFile(file);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Foto maken mislukt");
    }
  }

  async function startVideoRecording() {
    const ready = await ensureAudioForRecording();
    const stream = cameraStreamRef.current;

    if (!ready || !stream) {
      alert("Camera is nog niet klaar");
      return;
    }

    const mimeType = getSupportedVideoMimeType();

    try {
      recordedChunksRef.current = [];

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordingType = recorder.mimeType || mimeType || "video/mp4";
        const extension = getRecordedFileExtension(recordingType);
        const blob = new Blob(recordedChunksRef.current, {
          type: recordingType,
        });
        const file = new File([blob], `video-${Date.now()}.${extension}`, {
          type: recordingType,
        });

        showPreviewForFile(file);
        stopRecordingTimer();
        setIsRecordingVideo(false);
        setRecordingSeconds(0);
      };

      recorder.start(250);
      setRecordingSeconds(0);
      stopRecordingTimer();
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((current) => current + 1);
      }, 1000);
      setIsRecordingVideo(true);
    } catch (error) {
      console.error("RECORD ERROR:", error);
      alert(error instanceof Error ? error.message : "Opnemen mislukt");
      setIsRecordingVideo(false);
    }
  }

  function stopVideoRecording() {
    if (!mediaRecorderRef.current) return;

    stopRecordingTimer();

    if (mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }

  function handleRecordButtonClick() {
    if (mode === "photo") {
      void handlePhotoCapture();
      return;
    }

    if (isRecordingVideo) {
      stopVideoRecording();
    } else {
      void startVideoRecording();
    }
  }

  function handleGalleryPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      alert("Kies een foto of video");
      return;
    }

    showPreviewForFile(file);

    if (galleryInputRef.current) {
      galleryInputRef.current.value = "";
    }
  }

  function handleConfirm() {
    if (!previewFile) return;

    onCapture(previewFile, caption.trim());
    handleClose();
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] overscroll-none bg-black text-white">
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={handleGalleryPick}
        className="hidden"
      />

      {!previewUrl ? (
        <div
          className="relative h-[100dvh] w-full touch-none overflow-hidden bg-black"
          onTouchMove={(event) => event.preventDefault()}
        >
          <video
            ref={cameraVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 h-full w-full bg-black object-cover"
          />

          {cameraStarting && !cameraReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}

          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-black/80 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 to-transparent" />

          <div className="absolute left-4 right-4 top-[max(16px,env(safe-area-inset-top))] flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-3xl font-light text-white backdrop-blur active:scale-95"
              aria-label="Sluiten"
            >
              ×
            </button>

            <button
              type="button"
              onClick={() => void toggleFlash()}
              disabled={!flashSupported || isRecordingVideo}
              className={`flex h-11 w-11 items-center justify-center rounded-full backdrop-blur active:scale-95 disabled:opacity-30 ${
                flashOn ? "bg-yellow-300 text-black" : "bg-black/45 text-white"
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
            <div className="mb-5 flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isRecordingVideo) return;
                  setMode("photo");
                }}
                disabled={isRecordingVideo}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${
                  mode === "photo"
                    ? "bg-white text-black"
                    : "bg-black/45 text-white/80"
                }`}
              >
                Foto
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isRecordingVideo) return;
                  setMode("video");
                }}
                disabled={isRecordingVideo}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] ${
                  mode === "video"
                    ? "bg-white text-black"
                    : "bg-black/45 text-white/80"
                }`}
              >
                Video
              </button>
            </div>

            <div className="flex items-center justify-between px-2">
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={isRecordingVideo}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur active:scale-95 disabled:opacity-30"
                aria-label="Kies uit galerij"
              >
                <ImageIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleRecordButtonClick}
                disabled={!cameraReady && !isRecordingVideo}
                className={`relative flex h-20 w-20 items-center justify-center rounded-full border-[5px] border-white bg-white/15 shadow-2xl active:scale-95 disabled:opacity-50 ${
                  isRecordingVideo ? "border-red-500" : ""
                }`}
                aria-label={
                  mode === "photo"
                    ? "Maak foto"
                    : isRecordingVideo
                      ? "Stop opname"
                      : "Start opname"
                }
              >
                <span
                  className={`block transition-all ${
                    mode === "video" && isRecordingVideo
                      ? "h-8 w-8 rounded-lg bg-red-500"
                      : mode === "photo"
                        ? "h-14 w-14 rounded-full bg-white"
                        : "h-14 w-14 rounded-full bg-red-500"
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={switchCameraFacingMode}
                disabled={isRecordingVideo}
                className="flex h-12 w-12 items-center justify-center rounded-full bg-black/45 text-xl text-white backdrop-blur active:scale-95 disabled:opacity-30"
                aria-label="Draai camera"
              >
                ↻
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-black">
          {previewFile?.type.startsWith("image/") ? (
            <img
              src={previewUrl}
              alt="Voorvertoning"
              className="min-h-0 flex-1 bg-black object-contain"
            />
          ) : (
            <video
              src={previewUrl}
              controls
              playsInline
              className="min-h-0 flex-1 bg-black object-contain"
            />
          )}

          <div className="shrink-0 border-t border-white/10 bg-black/95 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={resetPreview}
                className="rounded-full bg-white/15 px-4 py-2 text-sm font-bold text-white"
              >
                Opnieuw
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="rounded-full bg-white px-5 py-2 text-sm font-bold text-black"
              >
                Versturen
              </button>
            </div>
            <textarea
              rows={1}
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Voeg een bijschrift toe..."
              className="max-h-24 min-h-[44px] w-full resize-none rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[15px] text-white outline-none placeholder:text-white/40"
            />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
