const VERSION_STORAGE_KEY = "lc-deploy-version";

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

  try {
    const response = await fetch(`/api/build-version?t=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return;

    const payload = (await response.json()) as { version?: string };
    const version = payload.version?.trim();
    if (!version) return;

    const previous = localStorage.getItem(VERSION_STORAGE_KEY);
    localStorage.setItem(VERSION_STORAGE_KEY, version);

    if (previous && previous !== version) {
      window.location.reload();
    }
  } catch {
    // Ignore network errors during background refresh checks.
  }
}
