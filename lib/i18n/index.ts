import type { AppLocale } from "@/lib/locale";
import en from "@/lib/i18n/messages/en";
import nl from "@/lib/i18n/messages/nl";

type MessageTree = {
  [key: string]: string | MessageTree;
};

const catalogs: Record<AppLocale, MessageTree> = {
  nl,
  en,
};

function getNestedValue(tree: MessageTree, key: string): string | undefined {
  const parts = key.split(".");
  let current: unknown = tree;

  for (const part of parts) {
    if (!current || typeof current !== "object" || !(part in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : undefined;
}

export function createTranslator(locale: AppLocale) {
  const catalog = catalogs[locale] ?? catalogs.nl;

  return function t(
    key: string,
    params?: Record<string, string | number>,
  ): string {
    const template = getNestedValue(catalog, key) ?? getNestedValue(catalogs.nl, key) ?? key;

    if (!params) return template;

    return Object.entries(params).reduce(
      (result, [paramKey, value]) =>
        result.replaceAll(`{{${paramKey}}}`, String(value)),
      template,
    );
  };
}

export function getMessages(locale: AppLocale) {
  return catalogs[locale] ?? catalogs.nl;
}
