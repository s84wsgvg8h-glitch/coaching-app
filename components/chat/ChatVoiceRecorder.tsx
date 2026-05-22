"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Trash2 } from "lucide-react";

type ChatVoiceRecorderProps = {
  disabled?: boolean;
  onSend: (blob: Blob, mimeType: string) => void;
};

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const types = [
    "audio/mp4",
    "audio/aac",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];

  return types.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

function formatRecordingTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function ChatVoiceRecorder({
  disabled = false,
  onSend,
}: ChatVoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const cancelledRef = useRef(false);
  const recordingRef = useRef(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [cancelOffset, setCancelOffset] = useState(0);

  useEffect(() => {
    recordingRef.current = recording;
  }, [recording]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopStream();
    };
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }

  async function startRecording() {
    if (disabled || recordingRef.current) return;

    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Je browser ondersteunt geen microfoon.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      alert("Spraakberichten worden niet ondersteund in deze browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];
      cancelledRef.current = false;

      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/mp4";
        const blob = new Blob(chunksRef.current, {
          type: type.startsWith("audio/") ? type : "audio/mp4",
        });

        stopStream();
        stopTimer();
        setRecording(false);
        setSeconds(0);
        setCancelOffset(0);
        recordingRef.current = false;

        if (!cancelledRef.current && blob.size > 0) {
          onSend(blob, blob.type);
        }
      };

      if (mimeType) {
        recorder.start(250);
      } else {
        recorder.start();
      }
      setRecording(true);
      recordingRef.current = true;
      setSeconds(0);
      stopTimer();
      timerRef.current = window.setInterval(() => {
        setSeconds((current) => current + 1);
      }, 1000);
    } catch {
      alert("Microfoon kon niet worden geopend. Geef toestemming in je browser.");
    }
  }

  function cancelRecording() {
    cancelledRef.current = true;
    const recorder = mediaRecorderRef.current;

    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    stopStream();
    stopTimer();
    setRecording(false);
    setSeconds(0);
    setCancelOffset(0);
    recordingRef.current = false;
  }

  function finishRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.requestData();
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || recordingRef.current) return;

    event.preventDefault();
    buttonRef.current?.setPointerCapture(event.pointerId);
    startXRef.current = event.clientX;
    void startRecording();
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!recordingRef.current) return;

    const deltaX = event.clientX - startXRef.current;
    setCancelOffset(Math.min(0, deltaX));

    if (deltaX < -100) {
      cancelRecording();
    }
  }

  function handlePointerUp(event: React.PointerEvent<HTMLButtonElement>) {
    event.preventDefault();

    if (buttonRef.current?.hasPointerCapture(event.pointerId)) {
      buttonRef.current.releasePointerCapture(event.pointerId);
    }

    if (!recordingRef.current) return;

    if (cancelOffset < -100 || cancelledRef.current) {
      cancelRecording();
      return;
    }

    finishRecording();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelRecording}
        className="mb-0.5 flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-full text-black transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Houd ingedrukt om spraakbericht op te nemen"
      >
        <Mic className="h-5 w-5" />
      </button>

      {recording && (
        <div className="fixed inset-x-0 bottom-0 z-[9997] bg-black/90 px-4 py-6 pb-[max(24px,env(safe-area-inset-bottom))] text-white">
          <div className="mx-auto flex max-w-md items-center gap-4">
            <Trash2
              className={`h-5 w-5 shrink-0 transition-opacity ${
                cancelOffset < -40 ? "text-red-400 opacity-100" : "opacity-40"
              }`}
            />
            <div className="flex-1 text-center">
              <p className="text-sm font-semibold">
                {formatRecordingTime(seconds)}
              </p>
              <p className="text-xs text-white/70">
                {cancelOffset < -40
                  ? "Laat los om te annuleren"
                  : "Veeg naar links om te annuleren"}
              </p>
            </div>
            <Mic className="h-5 w-5 shrink-0 opacity-40" />
          </div>
        </div>
      )}
    </>
  );
}
