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

function isUserEditing() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return false;
  return Boolean(
    active.closest("input, textarea, select, [contenteditable='true']"),
  );
}

function scheduleReload(delayMs: number, attempt = 0) {
  sessionStorage.setItem(PENDING_RELOAD_KEY, "1");
  window.setTimeout(() => {
    if (sessionStorage.getItem(PENDING_RELOAD_KEY) !== "1") return;

    if (isUserEditing() && attempt < 4) {
      scheduleReload(8000, attempt + 1);
      return;
    }

    sessionStorage.removeItem(PENDING_RELOAD_KEY);
    window.location.reload();
  }, delayMs);
}

let refreshInFlight: Promise<void> | null = null;
let wantsImmediateReload = false;
let reloadStarted = false;

async function runRefresh() {
  try {
    const version = await fetchDeployVersion();
    if (!version || reloadStarted) return;

    const previous = localStorage.getItem(VERSION_STORAGE_KEY);
    localStorage.setItem(VERSION_STORAGE_KEY, version);

    if (!previous || previous === version) {
      sessionStorage.removeItem(PENDING_RELOAD_KEY);
      return;
    }

    reloadStarted = true;

    if (wantsImmediateReload) {
      sessionStorage.removeItem(PENDING_RELOAD_KEY);
      window.location.reload();
      return;
    }

    scheduleReload(2500);
  } catch {
    // Ignore network errors during background refresh checks.
  }
}

export function refreshAppIfStale(options?: { immediate?: boolean }) {
  if (typeof window === "undefined") return Promise.resolve();
  if (reloadStarted) return Promise.resolve();
  if (options?.immediate) wantsImmediateReload = true;

  if (!refreshInFlight) {
    refreshInFlight = runRefresh().finally(() => {
      refreshInFlight = null;
      if (!reloadStarted) wantsImmediateReload = false;
    });
  }

  return refreshInFlight;
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
