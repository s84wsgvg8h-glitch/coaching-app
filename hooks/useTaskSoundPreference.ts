"use client";

import { useCallback, useEffect, useState } from "react";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

const STORAGE_KEY = "coaching-app:todo-task-sounds";

export function useTaskSoundPreference() {
  const [soundEnabled, setSoundEnabledState] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      deferEffectUpdate(() => {
        if (stored !== null) {
          setSoundEnabledState(stored === "true");
        }
        setHydrated(true);
      });
    } catch {
      deferEffectUpdate(() => {
        setHydrated(true);
      });
    }
  }, []);

  const setSoundEnabled = useCallback((value: boolean) => {
    setSoundEnabledState(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(value));
    } catch {
      // ignore
    }
  }, []);

  return { soundEnabled, setSoundEnabled, hydrated };
}
