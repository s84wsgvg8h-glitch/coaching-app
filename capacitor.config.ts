import type { CapacitorConfig } from "@capacitor/cli";
import { KeyboardResize, KeyboardStyle } from "@capacitor/keyboard";

// Set CAP_ENV=development when syncing for local simulator testing.
// Example: CAP_ENV=development npx cap sync ios
const isDev = process.env.CAP_ENV === "development";

const config: CapacitorConfig = {
  appId: "app.limitlesscoaching",
  appName: "Limitless Coaching",
  webDir: "capacitor-www",
  server: {
    // Dev: load from local Next.js server (localhost reachable from iOS Simulator).
    // Prod: load from deployed Vercel URL.
    url: isDev ? "http://localhost:3000" : "https://limitlesscoaching.app",
    // iOS allows localhost over HTTP by default (ATS exemption for loopback).
    cleartext: isDev,
    androidScheme: "https",
  },
  ios: {
    // Safe-area in CSS; webview uses overlay + theme surface colors at runtime.
    contentInset: "never",
    backgroundColor: "#09090b",
    allowsLinkPreview: true,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: "#09090b",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#09090b",
    },
    Keyboard: {
      // None: webview does not resize; chat uses --keyboard-height + padding-bottom (WhatsApp-like).
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
