"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { createTranslator } from "@/lib/i18n";
import {
  applyLocale,
  getPreferredLocale,
  type AppLocale,
} from "@/lib/locale";
import { deferEffectUpdate } from "@/lib/deferEffectUpdate";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: ReturnType<typeof createTranslator>;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(() =>
    typeof window !== "undefined" ? getPreferredLocale() : "nl",
  );

  useEffect(() => {
    const initialLocale = getPreferredLocale();
    applyLocale(initialLocale);
    deferEffectUpdate(() => {
      setLocaleState(initialLocale);
    });
  }, []);

  const setLocale = (nextLocale: AppLocale) => {
    applyLocale(nextLocale);
    setLocaleState(nextLocale);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: createTranslator(locale),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
