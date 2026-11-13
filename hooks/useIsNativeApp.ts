"use client";

import { useSyncExternalStore } from "react";

type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return Boolean((window as CapacitorWindow).Capacitor?.isNativePlatform?.());
}

function getServerSnapshot() {
  return false;
}

export function useIsNativeApp() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
