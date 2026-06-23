"use client";

import { useEffect, useRef, useState } from "react";

type VideoPlaybackControlsProps = {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  className?: string;
};

const SPEED_OPTIONS = [0.25, 0.5, 0.75, 1, 1.25];

export default function VideoPlaybackControls({
  videoRef,
  className = "",
}: VideoPlaybackControlsProps) {
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    video.addEventListener("play", onPlay);
    video.addEventListener("pause", onPause);
    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("pause", onPause);
    };
  }, [videoRef]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play();
    else video.pause();
  }

  function changeSpeed(next: number) {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = next;
    setSpeed(next);
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-xl border border-app-border bg-white/95 px-3 py-2 ${className}`}
    >
      <button
        type="button"
        onClick={togglePlay}
        className="rounded-lg bg-app-text px-3 py-1.5 text-xs font-bold text-white"
      >
        {playing ? "Pauze" : "Afspelen"}
      </button>
      <span className="text-xs font-semibold text-app-muted">Snelheid</span>
      {SPEED_OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => changeSpeed(option)}
          className={`rounded-lg px-2 py-1 text-xs font-bold ${
            speed === option
              ? "bg-brand-purple text-white"
              : "bg-gray-100 text-app-text hover:bg-gray-200"
          }`}
        >
          {option}x
        </button>
      ))}
    </div>
  );
}
