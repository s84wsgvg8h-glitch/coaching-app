"use client";

import { useEffect, useRef, useState } from "react";
import { Pencil, Ruler, Send } from "lucide-react";
import ChatFullscreenVideoOverlay from "@/components/chat/ChatFullscreenVideoOverlay";

type DrawTool = "pen" | "ruler";

type ChatVideoCoachFeedbackViewerProps = {
  videoUrl: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  onSendFeedback: (payload: { text: string; imageFile?: File }) => Promise<void>;
};

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function ChatVideoCoachFeedbackViewer({
  videoUrl,
  title,
  subtitle,
  onClose,
  onSendFeedback,
}: ChatVideoCoachFeedbackViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement>(null);

  const [feedbackText, setFeedbackText] = useState("");
  const [sending, setSending] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [tool, setTool] = useState<DrawTool>("pen");
  const [color, setColor] = useState("#ef4444");
  const [drawing, setDrawing] = useState(false);
  const [lineStart, setLineStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [capturedAt, setCapturedAt] = useState<number | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isPortraitVideo, setIsPortraitVideo] = useState(false);

  const useSideFeedback = isPortraitVideo && !annotateMode;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (annotateMode) return;

    function onKeyDown(event: KeyboardEvent) {
      const video = videoRef.current;
      if (!video || annotateMode) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        video.pause();
        video.currentTime = Math.max(0, video.currentTime - 1 / 30);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        video.pause();
        const next = video.currentTime + 1 / 30;
        video.currentTime = Number.isFinite(video.duration)
          ? Math.min(video.duration, next)
          : next;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [annotateMode]);

  useEffect(() => {
    if (!annotateMode) return;

    const canvas = canvasRef.current;
    const frameCanvas = frameCanvasRef.current;
    if (!canvas || !frameCanvas) return;

    canvas.width = frameCanvas.width;
    canvas.height = frameCanvas.height;
  }, [annotateMode]);

  function pointerPos(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function handleFeedbackKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend(annotateMode);
    }
  }

  function captureFrame() {
    const video = videoRef.current;
    const frameCanvas = frameCanvasRef.current;
    if (!video || !frameCanvas) return;

    if (!videoReady || video.readyState < 2) {
      video.pause();
      video.currentTime = video.currentTime || 0;
    }

    video.pause();

    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    if (width <= 0 || height <= 0) return;

    frameCanvas.width = width;
    frameCanvas.height = height;

    const ctx = frameCanvas.getContext("2d");
    if (!ctx) return;

    try {
      ctx.drawImage(video, 0, 0, width, height);
    } catch {
      return;
    }

    setCapturedAt(video.currentTime);
    setAnnotateMode(true);
    setLineStart(null);
  }

  function clearAnnotations() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setLineStart(null);
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = getCtx();
    if (!ctx) return;

    const { x, y } = pointerPos(event);

    if (tool === "pen") {
      setDrawing(true);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(x, y);
      return;
    }

    if (lineStart) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(lineStart.x, lineStart.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      setLineStart(null);
      return;
    }

    setLineStart({ x, y });
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (tool !== "pen" || !drawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pointerPos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  async function exportAnnotatedFrame(): Promise<File | null> {
    const frameCanvas = frameCanvasRef.current;
    const drawCanvas = canvasRef.current;
    if (!frameCanvas) return null;

    const merged = document.createElement("canvas");
    merged.width = frameCanvas.width;
    merged.height = frameCanvas.height;
    const ctx = merged.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(frameCanvas, 0, 0);
    if (drawCanvas) {
      ctx.drawImage(drawCanvas, 0, 0);
    }

    const blob = await new Promise<Blob | null>((resolve) => {
      merged.toBlob(resolve, "image/jpeg", 0.92);
    });

    if (!blob) return null;

    const stamp = capturedAt !== null ? formatTime(capturedAt) : "frame";
    return new File([blob], `video-feedback-${stamp.replace(":", "-")}.jpg`, {
      type: "image/jpeg",
    });
  }

  async function handleSend(includeFrame: boolean) {
    const text = feedbackText.trim();
    if (!text && !includeFrame) return;

    setSending(true);
    try {
      const imageFile = includeFrame ? await exportAnnotatedFrame() : undefined;
      await onSendFeedback({ text, imageFile: imageFile || undefined });
      onClose();
    } finally {
      setSending(false);
    }
  }

  const watchFeedbackComposer = (
    <div
      className={
        useSideFeedback
          ? "chat-fullscreen-video__feedback-sidebar-inner"
          : "flex items-center gap-2"
      }
    >
      <textarea
        value={feedbackText}
        onChange={(event) => setFeedbackText(event.target.value)}
        onKeyDown={handleFeedbackKeyDown}
        placeholder="Typ feedback terwijl je de video bekijkt..."
        rows={useSideFeedback ? 4 : 1}
        className={
          useSideFeedback
            ? "chat-fullscreen-video__feedback-sidebar-input min-h-[88px] min-w-0 flex-1 resize-none rounded-[12px] border border-white/15 bg-white/10 px-3 py-2 text-base leading-5 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/25 sm:text-sm"
            : "min-h-[36px] min-w-0 flex-1 resize-none rounded-[12px] border border-white/15 bg-white/10 px-3 py-2 text-base leading-5 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/25 sm:text-sm"
        }
      />
      <button
        type="button"
        disabled={sending || !feedbackText.trim()}
        onClick={() => void handleSend(false)}
        className={
          useSideFeedback
            ? "inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[12px] bg-app-accent text-sm font-semibold text-white disabled:opacity-40"
            : "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-app-accent text-white disabled:opacity-40"
        }
        aria-label="Feedback versturen"
      >
        <Send className="h-4 w-4" />
        {useSideFeedback ? <span>Versturen</span> : null}
      </button>
    </div>
  );

  return (
    <ChatFullscreenVideoOverlay
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      footerPlacement="top"
      hideFooter={useSideFeedback}
      media={
        !annotateMode ? (
          useSideFeedback ? (
            <div className="chat-fullscreen-video__portrait-layout">
              <div className="chat-fullscreen-video__media-wrap">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  crossOrigin="anonymous"
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  onLoadedData={() => setVideoReady(true)}
                  onLoadedMetadata={(event) => {
                    const video = event.currentTarget;
                    setIsPortraitVideo(video.videoHeight > video.videoWidth);
                  }}
                  className="chat-fullscreen-video__media"
                />
              </div>
              <aside className="chat-fullscreen-video__feedback-sidebar">
                {watchFeedbackComposer}
              </aside>
            </div>
          ) : (
            <div className="chat-fullscreen-video__media-wrap">
              <video
                ref={videoRef}
                src={videoUrl}
                crossOrigin="anonymous"
                controls
                autoPlay
                playsInline
                preload="auto"
                onLoadedData={() => setVideoReady(true)}
                onLoadedMetadata={(event) => {
                  const video = event.currentTarget;
                  setIsPortraitVideo(video.videoHeight > video.videoWidth);
                }}
                className="chat-fullscreen-video__media"
              />
            </div>
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative max-h-full max-w-full">
              <canvas
                ref={frameCanvasRef}
                className="block max-h-[100dvh] max-w-full"
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 h-full w-full touch-none"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={() => setDrawing(false)}
                onPointerLeave={() => setDrawing(false)}
              />
            </div>
          </div>
        )
      }
      footer={
        annotateMode ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTool("pen")}
                className={`inline-flex items-center gap-1 rounded-[16px] px-3 py-1.5 text-xs font-semibold ${
                  tool === "pen" ? "bg-white text-black" : "bg-white/10"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" />
                Pen
              </button>
              <button
                type="button"
                onClick={() => {
                  setTool("ruler");
                  setLineStart(null);
                }}
                className={`inline-flex items-center gap-1 rounded-[16px] px-3 py-1.5 text-xs font-semibold ${
                  tool === "ruler" ? "bg-white text-black" : "bg-white/10"
                }`}
              >
                <Ruler className="h-3.5 w-3.5" />
                Lineaal
              </button>
              {["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#ffffff"].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full border-2 ${
                    color === c ? "border-white" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Kleur ${c}`}
                />
              ))}
              <button
                type="button"
                onClick={clearAnnotations}
                className="rounded-[16px] border border-white/20 px-3 py-1.5 text-xs font-semibold"
              >
                Wissen
              </button>
              <button
                type="button"
                onClick={() => {
                  setAnnotateMode(false);
                  setLineStart(null);
                }}
                className="rounded-[16px] border border-white/20 px-3 py-1.5 text-xs font-semibold"
              >
                Terug naar video
              </button>
            </div>
            {tool === "ruler" ? (
              <p className="mb-2 text-xs text-white/60">
                Tik twee punten om een rechte lijn te tekenen.
              </p>
            ) : null}
            {capturedAt !== null ? (
              <p className="mb-2 text-xs text-white/60">
                Frame op {formatTime(capturedAt)}
              </p>
            ) : null}
            <div className="flex items-center gap-2">
              <textarea
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                onKeyDown={handleFeedbackKeyDown}
                placeholder="Typ feedback bij dit frame..."
                rows={1}
                className="min-h-[36px] min-w-0 flex-1 resize-none rounded-[12px] border border-white/15 bg-white/10 px-3 py-2 text-base leading-5 text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/25 sm:text-sm"
              />
              <button
                type="button"
                disabled={sending || (!feedbackText.trim() && !annotateMode)}
                onClick={() => void handleSend(annotateMode)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-app-accent text-white disabled:opacity-40"
                aria-label="Feedback versturen"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          watchFeedbackComposer
        )
      }
    />
  );
}
