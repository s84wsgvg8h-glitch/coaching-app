type CapacitorWindow = Window & {
  Capacitor?: { isNativePlatform?: () => boolean };
};

function isNativeAppWindow() {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as CapacitorWindow).Capacitor?.isNativePlatform?.(),
  );
}

/** Open a blank tab during the click, before any await, so popup blockers allow it. */
export function prepareExternalWindow(): Window | null {
  if (typeof window === "undefined" || isNativeAppWindow()) return null;
  return window.open("about:blank", "_blank");
}

function assignPreparedWindow(popup: Window, url: string) {
  try {
    popup.opener = null;
  } catch {
    // Some browsers reject clearing opener.
  }
  popup.location.replace(url);
}

/** Open payment or other external URLs — SFSafariViewController on native iOS. */
export async function openExternalUrl(
  url: string,
  options?: { newTab?: boolean; preparedWindow?: Window | null },
): Promise<void> {
  if (typeof window === "undefined" || !url.trim()) {
    options?.preparedWindow?.close();
    return;
  }

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      options?.preparedWindow?.close();
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    }
  } catch {
    // Fall through to web navigation.
  }

  if (options?.newTab) {
    const popup = options.preparedWindow;
    if (popup && !popup.closed) {
      assignPreparedWindow(popup, url);
      return;
    }

    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) window.location.assign(url);
    return;
  }

  options?.preparedWindow?.close();
  window.location.assign(url);
}
