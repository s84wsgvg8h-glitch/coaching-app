"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  applyTheme,
  getPreferredTheme,
  toggleTheme as toggleStoredTheme,
  type ThemeMode,
} from "@/lib/theme";

type ThemeContextValue = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("dark");

  useEffect(() => {
    const initialTheme = getPreferredTheme();
    applyTheme(initialTheme);
    setThemeState(initialTheme);
  }, []);

  function setTheme(nextTheme: ThemeMode) {
    applyTheme(nextTheme);
    setThemeState(nextTheme);
  }

  function toggleTheme() {
    const nextTheme = toggleStoredTheme();
    setThemeState(nextTheme);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
