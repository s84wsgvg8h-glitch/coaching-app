"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Pause, Play, SendHorizontal, Trash2 } from "lucide-react";

type ChatVoiceRecorderProps = {
  disabled?: boolean;
  onSend: (blob: Blob, mimeType: string) => void;
};

const BAR_COUNT = 24;

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

function VoiceLevelBars({
  levels,
  paused,
}: {
  levels: number[];
  paused: boolean;
}) {
  return (
    <div className="flex h-8 items-end justify-center gap-[3px] px-1">
      {levels.map((level, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-full transition-[height] duration-75 ${
            paused ? "bg-amber-300" : "bg-emerald-400"
          }`}
          style={{
            height: `${Math.max(4, Math.round(level * 28))}px`,
          }}
        />
      ))}
    </div>
  );
}

export default function ChatVoiceRecorder({
  disabled = false,
  onSend,
}: ChatVoiceRecorderProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const sendOnStopRef = useRef(false);
  const mimeTypeRef = useRef("");
  const recordingRef = useRef(false);
  const pausedRef = useRef(false);

  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(() =>
    Array.from({ length: BAR_COUNT }, () => 0.12),
  );
  const levelsRef = useRef<number[]>(
    Array.from({ length: BAR_COUNT }, () => 0.12),
  );

  useEffect(() => {
    recordingRef.current = active;
  }, [active]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    return () => {
      stopTimer();
      stopAnalyserLoop();
      stopStream();
      void audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  function stopTimer() {
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  function stopAnalyserLoop() {
    if (animationRef.current) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    analyserRef.current = null;
  }

  function resetUi() {
    setActive(false);
    setPaused(false);
    setSeconds(0);
    setLevels(Array.from({ length: BAR_COUNT }, () => 0.12));
    levelsRef.current = Array.from({ length: BAR_COUNT }, () => 0.12);
    recordingRef.current = false;
    pausedRef.current = false;
  }

  function startAnalyserLoop() {
    stopAnalyserLoop();

    const analyser = analyserRef.current;
    if (!analyser) return;

    const buffer = new Uint8Array(analyser.fftSize);

    const tick = () => {
      if (!analyserRef.current) return;

      analyser.getByteTimeDomainData(buffer);

      const nextLevels = Array.from({ length: BAR_COUNT }, (_, index) => {
        const sampleIndex = Math.floor((index / BAR_COUNT) * buffer.length);
        const sample = buffer[sampleIndex] ?? 128;
        const amplitude = Math.abs(sample - 128) / 128;
        const previous = levelsRef.current[index] ?? 0.12;
        const target = pausedRef.current
          ? 0.12
          : Math.min(1, 0.12 + amplitude * 2.4);
        return previous * 0.55 + target * 0.45;
      });

      levelsRef.current = nextLevels;
      setLevels(nextLevels);
      animationRef.current = window.requestAnimationFrame(tick);
    };

    animationRef.current = window.requestAnimationFrame(tick);
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
      sendOnStopRef.current = false;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.65;
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const mimeType = getSupportedAudioMimeType();
      mimeTypeRef.current = mimeType;
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
        const type =
          recorder.mimeType || mimeTypeRef.current || "audio/mp4";
        const blob = new Blob(chunksRef.current, {
          type: type.startsWith("audio/") ? type : "audio/mp4",
        });

        stopAnalyserLoop();
        stopStream();
        stopTimer();
        void audioContextRef.current?.close();
        audioContextRef.current = null;
        resetUi();
        mediaRecorderRef.current = null;

        if (sendOnStopRef.current && !cancelledRef.current && blob.size > 0) {
          onSend(blob, blob.type);
        }
      };

      if (mimeType) {
        recorder.start(250);
      } else {
        recorder.start();
      }

      setActive(true);
      setPaused(false);
      setSeconds(0);
      recordingRef.current = true;
      stopTimer();
      timerRef.current = window.setInterval(() => {
        setSeconds((current) => current + 1);
      }, 1000);
      startAnalyserLoop();
    } catch {
      alert("Microfoon kon niet worden geopend. Geef toestemming in je browser.");
    }
  }

  function stopRecorder(send: boolean) {
    sendOnStopRef.current = send;
    const recorder = mediaRecorderRef.current;

    if (!recorder) {
      stopAnalyserLoop();
      stopStream();
      stopTimer();
      void audioContextRef.current?.close();
      audioContextRef.current = null;
      resetUi();
      return;
    }

    if (recorder.state === "recording") {
      recorder.requestData();
    }

    if (recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    stopAnalyserLoop();
    stopStream();
    stopTimer();
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    resetUi();
  }

  function cancelRecording() {
    cancelledRef.current = true;
    sendOnStopRef.current = false;
    stopRecorder(false);
  }

  function sendRecording() {
    if (seconds < 1) {
      alert("Neem minstens 1 seconde op.");
      return;
    }

    sendOnStopRef.current = true;
    cancelledRef.current = false;
    stopRecorder(true);
  }

  function togglePause() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (recorder.state === "recording") {
      recorder.pause();
      setPaused(true);
      stopTimer();
      return;
    }

    if (recorder.state === "paused") {
      recorder.resume();
      setPaused(false);
      stopTimer();
      timerRef.current = window.setInterval(() => {
        setSeconds((current) => current + 1);
      }, 1000);
    }
  }

  if (active) {
    return (
      <div className="fixed inset-x-0 bottom-0 z-[9997] bg-black px-4 py-5 pb-[max(20px,env(safe-area-inset-bottom))] text-white">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={cancelRecording}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-red-300 transition hover:bg-white/20"
            aria-label="Opname annuleren"
          >
            <Trash2 className="h-5 w-5" />
          </button>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
            <VoiceLevelBars levels={levels} paused={paused} />
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  paused ? "bg-amber-400" : "bg-red-500 animate-pulse"
                }`}
              />
              <p className="text-base font-semibold tabular-nums">
                {formatRecordingTime(seconds)}
              </p>
            </div>
            <p className="text-[11px] text-white/70">
              {paused ? "Gepauzeerd" : "Geluid wordt opgenomen"}
            </p>
          </div>

          <button
            type="button"
            onClick={togglePause}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            aria-label={paused ? "Opname hervatten" : "Opname pauzeren"}
          >
            {paused ? (
              <Play className="ml-0.5 h-5 w-5" />
            ) : (
              <Pause className="h-5 w-5" />
            )}
          </button>

          <button
            type="button"
            onClick={sendRecording}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white transition hover:bg-emerald-400"
            aria-label="Spraakbericht versturen"
          >
            <SendHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => void startRecording()}
      className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-app-text transition hover:bg-app-surface-hover disabled:cursor-not-allowed disabled:opacity-40"
      aria-label="Spraakbericht opnemen"
    >
      <Mic className="h-5 w-5" />
    </button>
  );
}
