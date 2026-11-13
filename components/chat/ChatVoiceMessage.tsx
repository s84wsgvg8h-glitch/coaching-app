"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Mic, Play, Pause } from "lucide-react";

const CHAT_AUDIO_PLAY_EVENT = "chat-audio-play";

type ChatVoiceMessageProps = {
  src: string;
  isMine: boolean;
};

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function ChatVoiceMessage({ src, isMine }: ChatVoiceMessageProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playerId = useId();
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onLoaded() {
      if (!audio) return;
      setDuration(audio.duration || 0);
    }

    function onTimeUpdate() {
      if (!audio) return;
      setCurrentTime(audio.currentTime || 0);
    }

    function onEnded() {
      setPlaying(false);
      setCurrentTime(0);
    }

    function onPause() {
      setPlaying(false);
    }

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;

    function onOtherAudioPlay(event: Event) {
      const id = (event as CustomEvent<{ id: string }>).detail?.id;
      if (id === playerId || !audio || audio.paused) return;
      audio.pause();
      setPlaying(false);
    }

    window.addEventListener(CHAT_AUDIO_PLAY_EVENT, onOtherAudioPlay);
    return () => {
      window.removeEventListener(CHAT_AUDIO_PLAY_EVENT, onOtherAudioPlay);
      audio?.pause();
    };
  }, [playerId]);

  async function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }

    // Load only on play so opening chat does not touch the iOS audio session.
    if (audio.preload !== "auto") {
      audio.preload = "auto";
      audio.load();
    }

    window.dispatchEvent(
      new CustomEvent(CHAT_AUDIO_PLAY_EVENT, { detail: { id: playerId } }),
    );
    await audio.play();
    setPlaying(true);
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="flex min-w-[220px] items-center gap-3">
      <audio ref={audioRef} src={src} preload="none" className="hidden" />

      <button
        type="button"
        onClick={() => void togglePlay()}
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
          isMine ? "bg-white/20 text-white" : "bg-app-accent text-white"
        }`}
        aria-label={playing ? "Pauzeer spraakbericht" : "Speel spraakbericht af"}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="ml-0.5 h-4 w-4" />}
      </button>

      <div className="min-w-0 flex-1">
        <div
          className={`relative h-1.5 overflow-hidden rounded-full ${
            isMine ? "bg-white/25" : "bg-app-surface-hover"
          }`}
        >
          <div
            className={`absolute left-0 top-0 h-full rounded-full ${
              isMine ? "bg-app-surface" : "bg-app-accent"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1 flex items-center gap-1">
          <Mic className={`h-3 w-3 ${isMine ? "text-white/70" : "text-app-subtle"}`} />
          <span className={`text-[11px] ${isMine ? "text-white/70" : "text-app-muted"}`}>
            {formatDuration(playing ? currentTime : duration || 0)}
          </span>
        </div>
      </div>
    </div>
  );
}
