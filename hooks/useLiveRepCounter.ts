"use client";

import { useEffect, useRef, useState, type Dispatch, type RefObject, type SetStateAction } from "react";
import { drawPoseSkeleton } from "@/lib/pose/drawPose";
import {
  channelLabel,
  classifyMovement,
  type PoseChannel,
} from "@/lib/pose/movementPattern";
import {
  detectPoseFrame,
  loadPoseLandmarker,
  nextPoseTimestamp,
} from "@/lib/pose/poseLandmarker";
import { readPoseChannels } from "@/lib/pose/poseGeometry";
import {
  createMovementCounter,
  flushMovementCounter,
  stepMovementCounter,
  type MovementCounterState,
} from "@/lib/pose/repCounter";

export type LiveRepCounterStatus = "loading" | "unavailable" | "searching" | "ready";

export type LiveRepCounterHandle = {
  flushReps: () => number;
};

type LiveRepSnapshot = {
  reps: number;
  status: LiveRepCounterStatus;
  label: string;
};

type UseLiveRepCounterOptions = {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  enabled: boolean;
  exerciseName: string;
  sessionKey: string;
  recording: boolean;
  onReps: (reps: number, recording: boolean) => void;
  handleRef: { current: LiveRepCounterHandle | null };
};

const DETECT_INTERVAL_MS = 1000 / 15;
const EMPTY_SNAPSHOT: LiveRepSnapshot = {
  reps: 0,
  status: "loading",
  label: "Beweging",
};

export function useLiveRepCounter({
  videoRef,
  canvasRef,
  enabled,
  exerciseName,
  sessionKey,
  recording,
  onReps,
  handleRef,
}: UseLiveRepCounterOptions) {
  const resetKey = `${sessionKey}:${recording ? "rec" : "live"}:${enabled ? "on" : "off"}`;
  const [trackedKey, setTrackedKey] = useState(resetKey);
  const [snapshot, setSnapshot] = useState<LiveRepSnapshot>(EMPTY_SNAPSHOT);

  if (trackedKey !== resetKey) {
    setTrackedKey(resetKey);
    setSnapshot(EMPTY_SNAPSHOT);
  }

  const exerciseNameRef = useRef(exerciseName);
  const recordingRef = useRef(recording);
  const onRepsRef = useRef(onReps);
  const runtimeRef = useRef<MovementCounterState>(createMovementCounter());
  const statusRef = useRef<LiveRepCounterStatus>("loading");
  const snapshotRef = useRef(snapshot);

  useEffect(() => {
    exerciseNameRef.current = exerciseName;
    recordingRef.current = recording;
    onRepsRef.current = onReps;
    snapshotRef.current = snapshot;
    handleRef.current = {
      flushReps() {
        const pattern = classifyMovement(exerciseNameRef.current);
        const flushed = flushMovementCounter(
          runtimeRef.current,
          performance.now(),
          pattern,
        );
        runtimeRef.current = flushed;
        publishSnapshot(
          setSnapshot,
          snapshotRef,
          statusRef,
          onRepsRef,
          flushed.reps,
          statusRef.current,
          flushed.active,
          recordingRef.current,
        );
        return flushed.reps;
      },
    };
  });

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let frameId = 0;
    let busy = false;
    let lastDetect = 0;
    let lastPoseAt = 0;
    const sessionRecording = recording;
    runtimeRef.current = createMovementCounter();

    const clearCanvas = () => {
      const prepared = prepareCanvas(canvasRef.current);
      prepared?.context.clearRect(0, 0, prepared.width, prepared.height);
    };

    const tick = (now: number) => {
      if (cancelled) return;
      frameId = window.requestAnimationFrame(tick);
      if (busy || now - lastDetect < DETECT_INTERVAL_MS) return;

      const video = videoRef.current;
      if (!video || video.readyState < 2 || video.videoWidth === 0) return;

      lastDetect = now;
      busy = true;
      const timestamp = nextPoseTimestamp(now);

      void detectPoseFrame(video, timestamp)
        .then((frame) => {
          if (cancelled) return;

          const pattern = classifyMovement(exerciseNameRef.current);

          if (!frame) {
            if (now - lastPoseAt > 400) clearCanvas();
            publishSnapshot(
              setSnapshot,
              snapshotRef,
              statusRef,
              onRepsRef,
              runtimeRef.current.reps,
              "searching",
              runtimeRef.current.active,
              sessionRecording,
            );
            return;
          }

          lastPoseAt = now;
          const channels = readPoseChannels(
            frame.world.length > 0 ? frame.world : null,
            frame.image,
          );
          const next = stepMovementCounter(
            runtimeRef.current,
            channels,
            timestamp,
            pattern,
          );
          runtimeRef.current = next;
          const prepared = prepareCanvas(canvasRef.current);

          if (prepared) {
            drawPoseSkeleton(
              prepared.context,
              frame.image,
              prepared.width,
              prepared.height,
              video.videoWidth,
              video.videoHeight,
            );
          }

          publishSnapshot(
            setSnapshot,
            snapshotRef,
            statusRef,
            onRepsRef,
            next.reps,
            "ready",
            next.active,
            sessionRecording,
          );
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          console.error("POSE DETECT ERROR:", error);
        })
        .finally(() => {
          busy = false;
        });
    };

    void loadPoseLandmarker()
      .then(() => {
        if (cancelled) return;
        frameId = window.requestAnimationFrame(tick);
      })
      .catch((error: unknown) => {
        console.error("POSE LOAD ERROR:", error);
        if (!cancelled) {
          publishSnapshot(
            setSnapshot,
            snapshotRef,
            statusRef,
            onRepsRef,
            0,
            "unavailable",
            null,
            sessionRecording,
          );
        }
      });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
      const pattern = classifyMovement(exerciseNameRef.current);
      const flushed = flushMovementCounter(
        runtimeRef.current,
        performance.now(),
        pattern,
      );
      runtimeRef.current = flushed;
      if (sessionRecording) onRepsRef.current(flushed.reps, true);
    };
  }, [canvasRef, enabled, recording, sessionKey, videoRef]);

  return snapshot;
}

function publishSnapshot(
  setSnapshot: Dispatch<SetStateAction<LiveRepSnapshot>>,
  snapshotRef: { current: LiveRepSnapshot },
  statusRef: { current: LiveRepCounterStatus },
  onRepsRef: { current: (reps: number, recording: boolean) => void },
  reps: number,
  status: LiveRepCounterStatus,
  channel: PoseChannel | null,
  countForSet: boolean,
) {
  const label = channelLabel(channel);
  statusRef.current = status;
  const current = snapshotRef.current;

  if (current.reps !== reps || current.status !== status || current.label !== label) {
    const next = { reps, status, label };
    snapshotRef.current = next;
    setSnapshot(next);
  }

  if (countForSet) onRepsRef.current(reps, true);
}

function prepareCanvas(canvas: HTMLCanvasElement | null) {
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, rect.width);
  const height = Math.max(1, rect.height);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(width * pixelRatio);
  const pixelHeight = Math.round(height * pixelRatio);

  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }

  const context = canvas.getContext("2d");
  if (!context) return null;

  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  return { context, width, height };
}
