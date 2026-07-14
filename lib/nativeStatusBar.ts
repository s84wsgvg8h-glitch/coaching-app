import type { ThemeMode } from "@/lib/theme";

const LIGHT_STATUS_BG = "#f8f9fc";
const DARK_STATUS_BG = "#09090b";

export async function syncNativeStatusBar(theme: ThemeMode): Promise<void> {
  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") return;

    const { StatusBar, Style } = await import("@capacitor/status-bar");

    if (theme === "light") {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: LIGHT_STATUS_BG });
    } else {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: DARK_STATUS_BG });
    }

    await StatusBar.setOverlaysWebView({ overlay: true });
  } catch {
    // Capacitor plugins unavailable in web dev
  }
}

export function applyDocumentSurfaceColor(theme: ThemeMode): void {
  if (typeof document === "undefined") return;

  const color = getThemeColorMeta(theme);
  document.documentElement.style.backgroundColor = color;
  document.body.style.backgroundColor = color;

  const root = document.getElementById("app-viewport-root");
  if (root) {
    root.style.backgroundColor = color;
  }
}

export function getThemeColorMeta(theme: ThemeMode): string {
  return theme === "light" ? LIGHT_STATUS_BG : DARK_STATUS_BG;
}
