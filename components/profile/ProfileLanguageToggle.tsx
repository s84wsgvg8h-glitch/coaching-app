"use client";

import { useLocale } from "@/components/LocaleProvider";
import { localeLabel, type AppLocale } from "@/lib/locale";

const OPTIONS: AppLocale[] = ["nl", "en"];

export default function ProfileLanguageToggle() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="profile-language-toggle" role="group" aria-label={t("profile.language")}>
      {OPTIONS.map((option) => {
        const active = locale === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => setLocale(option)}
            className={`profile-language-toggle-btn app-focus-ring${
              active ? " is-active" : ""
            }`}
            aria-pressed={active}
          >
            {localeLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
