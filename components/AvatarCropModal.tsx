"use client";

import { useCallback, useRef, useState } from "react";

type AvatarCropModalProps = {
  file: File;
  onCancel: () => void;
  onConfirm: (croppedFile: File) => void;
};

export default function AvatarCropModal({
  file,
  onCancel,
  onConfirm,
}: AvatarCropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const [imageUrl] = useState(() => URL.createObjectURL(file));

  const handleLoad = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  function handlePointerDown(e: React.PointerEvent) {
    setDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      ox: offset.x,
      oy: offset.y,
    };
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragging) return;
    setOffset({
      x: dragStart.current.ox + (e.clientX - dragStart.current.x),
      y: dragStart.current.oy + (e.clientY - dragStart.current.y),
    });
  }

  function handleConfirm() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const previewSize = 280;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    const centerX = previewSize / 2 + offset.x;
    const centerY = previewSize / 2 + offset.y;
    const ratio = size / previewSize;

    ctx.drawImage(
      img,
      (centerX - drawW / 2) * ratio,
      (centerY - drawH / 2) * ratio,
      drawW * ratio,
      drawH * ratio,
    );
    ctx.restore();

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(
          new File([blob], file.name.replace(/\.\w+$/, ".jpg"), {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-app-overlay p-4">
      <div className="app-card w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-app-text">Profielfoto bijsnijden</h2>
        <p className="mt-1 text-sm text-app-muted">
          Sleep en zoom om je foto te positioneren.
        </p>

        <div
          className="relative mx-auto mt-4 h-[280px] w-[280px] overflow-hidden rounded-full border-4 border-app-accent bg-black/10"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={() => setDragging(false)}
          onPointerLeave={() => setDragging(false)}
        >
          <img
            ref={imgRef}
            src={imageUrl}
            alt="Voorbeeld"
            onLoad={handleLoad}
            draggable={false}
            className="pointer-events-none absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
            }}
          />
        </div>

        <label className="mt-4 block text-sm font-semibold text-app-text">
          Zoom
          <input
            type="range"
            min="0.5"
            max="3"
            step="0.05"
            value={scale}
            onChange={(e) => setScale(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <canvas ref={canvasRef} className="hidden" />

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="app-btn-secondary">
            Annuleren
          </button>
          <button type="button" onClick={handleConfirm} className="app-btn-primary">
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
