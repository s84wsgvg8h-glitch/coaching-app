export type AppLocale = "nl" | "en";

export const LOCALE_STORAGE_KEY = "coaching-app-locale";

export const DEFAULT_LOCALE: AppLocale = "nl";

export function getStoredLocale(): AppLocale | null {
  if (typeof window === "undefined") return null;

  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  return stored === "nl" || stored === "en" ? stored : null;
}

export function getPreferredLocale(): AppLocale {
  return getStoredLocale() ?? DEFAULT_LOCALE;
}

export function applyLocale(locale: AppLocale) {
  if (typeof document === "undefined") return;

  document.documentElement.lang = locale;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function localeLabel(locale: AppLocale) {
  return locale === "en" ? "English" : "Nederlands";
}
