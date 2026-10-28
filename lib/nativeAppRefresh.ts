const VERSION_STORAGE_KEY = "lc-deploy-version";
const PENDING_RELOAD_KEY = "lc-pending-reload";

async function fetchDeployVersion() {
  const response = await fetch(`/api/build-version?t=${Date.now()}`, {
    cache: "no-store",
  });
  if (!response.ok) return null;

  const payload = (await response.json()) as { version?: string };
  const version = payload.version?.trim();
  return version || null;
}

function scheduleReload(delayMs: number) {
  sessionStorage.setItem(PENDING_RELOAD_KEY, "1");
  window.setTimeout(() => {
    if (sessionStorage.getItem(PENDING_RELOAD_KEY) === "1") {
      sessionStorage.removeItem(PENDING_RELOAD_KEY);
      window.location.reload();
    }
  }, delayMs);
}

export async function refreshAppIfStale(options?: { immediate?: boolean }) {
  if (typeof window === "undefined") return;

  try {
    const version = await fetchDeployVersion();
    if (!version) return;

    const previous = localStorage.getItem(VERSION_STORAGE_KEY);
    localStorage.setItem(VERSION_STORAGE_KEY, version);

    if (!previous || previous === version) return;

    if (options?.immediate) {
      window.location.reload();
      return;
    }

    scheduleReload(2500);
  } catch {
    // Ignore network errors during background refresh checks.
  }
}

export async function refreshNativeAppIfStale() {
  if (typeof window === "undefined") return;

  let isNative = false;
  try {
    const { Capacitor } = await import("@capacitor/core");
    isNative = Capacitor.isNativePlatform();
  } catch {
    return;
  }

  if (!isNative) return;
  await refreshAppIfStale();
}

export function cancelPendingNativeReload() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(PENDING_RELOAD_KEY);
}
