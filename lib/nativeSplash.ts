let splashHidden = false;

/** Hide Capacitor splash once — after auth/bootstrap is ready. */
export async function hideNativeSplashScreen() {
  if (splashHidden || typeof window === "undefined") return;

  try {
    const { Capacitor } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform()) return;

    const { SplashScreen } = await import("@capacitor/splash-screen");
    await SplashScreen.hide();
    splashHidden = true;
  } catch {
    // Web build or plugin unavailable
  }
}
