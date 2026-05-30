export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "coaching-app-theme";

export function getStoredTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
}

export function getPreferredTheme(): ThemeMode {
  return getStoredTheme() ?? "light";
}

export function applyTheme(theme: ThemeMode) {
  if (typeof document === "undefined") return;

  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}

export function toggleTheme(): ThemeMode {
  const nextTheme = document.documentElement.classList.contains("dark")
    ? "light"
    : "dark";

  applyTheme(nextTheme);
  return nextTheme;
}
