"use client";

import { useEffect, useState } from "react";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type RestTimerBarProps = {
  seconds: number;
  label?: string;
  onDone?: () => void;
};

export default function RestTimerBar({ seconds, label, onDone }: RestTimerBarProps) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    deferEffectUpdate(() => {
      setRemaining(seconds);
    });
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onDone?.();
      return;
    }

    const timer = window.setInterval(() => {
      setRemaining((value) => value - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [remaining, onDone]);

  if (remaining <= 0) return null;

  const progress = Math.max(0, Math.min(100, (remaining / seconds) * 100));

  return (
    <div className="fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[900] rounded-2xl border border-violet-200 bg-violet-950 px-4 py-3 text-white shadow-xl lg:inset-x-auto lg:right-6 lg:bottom-6 lg:max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-200">
            Rusttimer
          </p>
          <p className="text-sm font-semibold">{label || "Volgende set"}</p>
        </div>
        <p className="text-3xl font-black tabular-nums">{remaining}s</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-800">
        <div
          className="h-full bg-violet-300 transition-all duration-1000 linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
