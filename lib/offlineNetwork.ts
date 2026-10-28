export function isOfflineEnvironment() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function isRetryableSyncError(error: {
  message?: string;
  code?: string;
} | null) {
  if (!error) return false;
  if (isOfflineEnvironment()) return true;

  const message = (error.message || "").toLowerCase();
  const code = error.code || "";

  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("load failed") ||
    message.includes("timeout") ||
    code === "PGRST001"
  ) {
    return true;
  }

  return false;
}
