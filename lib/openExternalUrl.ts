/** Open payment or other external URLs — SFSafariViewController on native iOS. */
export async function openExternalUrl(url: string): Promise<void> {
  if (typeof window === "undefined" || !url.trim()) return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (Capacitor.isNativePlatform()) {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    }
  } catch {
    // Fall through to web navigation.
  }

  window.location.assign(url);
}
