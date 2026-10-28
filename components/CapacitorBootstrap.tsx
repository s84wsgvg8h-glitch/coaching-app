"use client";

import { useEffect } from "react";
import { navigateToAppUrl } from "@/lib/deepLinkNavigation";
import { hideNativeSplashScreen } from "@/lib/nativeSplash";
import { refreshNativeAppIfStale } from "@/lib/nativeAppRefresh";

/**
 * Native shell polish for the Capacitor iOS app (remote URL loads production).
 */
export default function CapacitorBootstrap() {
  useEffect(() => {
    let cancelled = false;
    const listeners: Array<{ remove: () => Promise<void> | void }> = [];

    void (async () => {
      const { Capacitor } = await import("@capacitor/core");
      if (cancelled || !Capacitor.isNativePlatform()) return;

      const [{ SplashScreen }, { App }, { PushNotifications }] =
        await Promise.all([
          import("@capacitor/splash-screen"),
          import("@capacitor/app"),
          import("@capacitor/push-notifications"),
        ]);

      if (Capacitor.getPlatform() === "ios") {
        document.documentElement.classList.add("capacitor-native");
        const { syncNativeStatusBar, applyDocumentSurfaceColor } = await import(
          "@/lib/nativeStatusBar"
        );
        const theme = document.documentElement.classList.contains("dark")
          ? "dark"
          : "light";
        applyDocumentSurfaceColor(theme);
        await syncNativeStatusBar(theme);

        try {
          const { Keyboard, KeyboardResize } = await import("@capacitor/keyboard");
          const {
            setNativeKeyboardHeight,
            KEYBOARD_TRANSITION_DURATION,
            KEYBOARD_TRANSITION_EASING,
          } = await import("@/lib/nativeKeyboard");
          const { syncChatVisualViewport } = await import("@/lib/chatViewport");

          document.documentElement.style.setProperty(
            "--keyboard-transition-duration",
            KEYBOARD_TRANSITION_DURATION,
          );
          document.documentElement.style.setProperty(
            "--keyboard-transition-easing",
            KEYBOARD_TRANSITION_EASING,
          );

          // KeyboardResize.None: webview stays full-screen; chat lifts compose via --keyboard-height.
          await Keyboard.setResizeMode({ mode: KeyboardResize.None });

          const onKeyboardChange = (height: number) => {
            setNativeKeyboardHeight(height);
            syncChatVisualViewport();
          };

          listeners.push(
            await Keyboard.addListener("keyboardWillShow", (info) => {
              onKeyboardChange(info.keyboardHeight);
            }),
          );
          listeners.push(
            await Keyboard.addListener("keyboardDidShow", (info) => {
              onKeyboardChange(info.keyboardHeight);
            }),
          );
          listeners.push(
            await Keyboard.addListener("keyboardWillHide", () => {
              onKeyboardChange(0);
            }),
          );
          listeners.push(
            await Keyboard.addListener("keyboardDidHide", () => {
              onKeyboardChange(0);
            }),
          );
        } catch {
          // Keyboard plugin optional in dev web builds
        }
      }

      const openDeepLink = (url: string) => {
        navigateToAppUrl(url);
      };

      listeners.push(
        await App.addListener("appUrlOpen", ({ url }) => {
          openDeepLink(url);
        }),
      );

      const launch = await App.getLaunchUrl();
      if (launch?.url) {
        openDeepLink(launch.url);
      }

      listeners.push(
        await App.addListener("appStateChange", ({ isActive }) => {
          if (isActive) {
            void SplashScreen.hide();
            void refreshNativeAppIfStale();
          }
        }),
      );

      await refreshNativeAppIfStale();

      listeners.push(
        await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const data = action.notification.data as { url?: string } | undefined;
            if (data?.url) {
              openDeepLink(
                data.url.startsWith("http")
                  ? data.url
                  : `https://limitlesscoaching.app${data.url}`,
              );
            }
          },
        ),
      );
    })();

    return () => {
      cancelled = true;
      for (const listener of listeners) {
        void listener.remove();
      }
    };
  }, []);

  return null;
}
