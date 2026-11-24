"use client";

import { useRef, type RefObject } from "react";
import {
  useLiveRepCounter,
  type LiveRepCounterHandle,
  type LiveRepCounterStatus,
} from "@/hooks/useLiveRepCounter";

type LiveRepCounterOverlayProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  exerciseName: string;
  sessionKey: string;
  recording: boolean;
  onReps: (reps: number, recording: boolean) => void;
  handleRef: { current: LiveRepCounterHandle | null };
};

export default function LiveRepCounterOverlay({
  videoRef,
  enabled,
  exerciseName,
  sessionKey,
  recording,
  onReps,
  handleRef,
}: LiveRepCounterOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { reps, status, label } = useLiveRepCounter({
    videoRef,
    canvasRef,
    enabled,
    exerciseName,
    sessionKey,
    recording,
    onReps,
    handleRef,
  });

  return (
    <div className="pointer-events-none absolute inset-0 z-[2]">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <div
        className="absolute left-4 top-[26%] max-w-[11rem]"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="rounded-[28px] border border-white/15 bg-black/55 px-4 py-3 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 rounded-full ${statusDotClass(status)}`}
              aria-hidden="true"
            />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/60">
              Reps
            </p>
          </div>
          <p
            key={reps}
            className={`mt-1 text-6xl font-black leading-none tabular-nums text-white ${
              reps > 0 ? "live-rep-count" : ""
            }`}
          >
            {status === "loading" ? "…" : reps}
          </p>
          <p className="mt-2 text-[11px] font-semibold text-white/75">
            {statusText(status, recording, label)}
          </p>
        </div>
      </div>
    </div>
  );
}

function statusDotClass(status: LiveRepCounterStatus) {
  if (status === "ready") return "bg-emerald-400";
  if (status === "unavailable") return "bg-white/35";
  return "bg-amber-300";
}

function statusText(
  status: LiveRepCounterStatus,
  recording: boolean,
  label: string,
) {
  if (status === "loading") return "Pose laden";
  if (status === "unavailable") return "Tellen lukt nu niet";
  if (status === "searching") return "Stap in beeld";
  return recording ? `${label} · deze set` : `${label} · live`;
}
