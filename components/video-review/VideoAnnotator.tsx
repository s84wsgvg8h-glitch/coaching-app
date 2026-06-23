"use client";

import { useEffect, useRef, useState } from "react";
import VideoPlaybackControls from "@/components/ui/VideoPlaybackControls";

type VideoAnnotatorProps = {
  videoUrl: string;
  className?: string;
};

export default function VideoAnnotator({ videoUrl, className = "" }: VideoAnnotatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState("#dc2626");

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    function resize() {
      if (!canvas || !video) return;
      canvas.width = video.clientWidth;
      canvas.height = video.clientHeight;
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  function getCtx() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  function pointerPos(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = getCtx();
    if (!ctx) return;
    setDrawing(true);
    const { x, y } = pointerPos(event);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const { x, y } = pointerPos(event);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative overflow-hidden rounded-xl bg-black">
        <video ref={videoRef} src={videoUrl} controls className="w-full" />
        <canvas
          ref={canvasRef}
          className="pointer-events-auto absolute inset-0 h-full w-full touch-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrawing(false)}
          onPointerLeave={() => setDrawing(false)}
        />
      </div>
      <VideoPlaybackControls videoRef={videoRef} />
      <div className="flex flex-wrap items-center gap-2">
        {["#dc2626", "#2563eb", "#16a34a", "#eab308"].map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-black" : "border-transparent"}`}
            style={{ backgroundColor: c }}
            aria-label={`Kleur ${c}`}
          />
        ))}
        <button
          type="button"
          onClick={clearCanvas}
          className="rounded-lg border border-app-border px-3 py-1 text-xs font-semibold"
        >
          Tekening wissen
        </button>
      </div>
    </div>
  );
}
