"use client";

import { createContext, useContext } from "react";
import { usePathname } from "next/navigation";
import { useKeyboardViewportSync } from "@/hooks/useKeyboardViewportSync";
import {
  DEFAULT_KEYBOARD_VIEWPORT,
  type KeyboardViewportState,
} from "@/lib/keyboardViewport";

const KeyboardViewportContext =
  createContext<KeyboardViewportState>(DEFAULT_KEYBOARD_VIEWPORT);

const CHROMELESS_PREFIXES = ["/login", "/signup", "/intake", "/pending-approval"];

function isChromelessRoute(pathname: string) {
  return CHROMELESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function KeyboardViewportProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const enabled =
    !isChromelessRoute(pathname) && !pathname.startsWith("/chat");
  const viewport = useKeyboardViewportSync(enabled);

  return (
    <KeyboardViewportContext.Provider value={viewport}>
      {children}
    </KeyboardViewportContext.Provider>
  );
}

export function useKeyboardViewport() {
  return useContext(KeyboardViewportContext);
}
