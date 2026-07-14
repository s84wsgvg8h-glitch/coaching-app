import { APP_UNIVERSAL_LINK_HOSTS } from "@/lib/universalLinks";

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** Navigate in-app to a universal link or custom-scheme URL. */
export function navigateToAppUrl(rawUrl: string): void {
  if (typeof window === "undefined" || !rawUrl.trim()) return;

  try {
    const parsed = new URL(rawUrl, window.location.origin);
    const hostAllowed =
      APP_UNIVERSAL_LINK_HOSTS.includes(
        parsed.hostname as (typeof APP_UNIVERSAL_LINK_HOSTS)[number],
      ) ||
      parsed.hostname === window.location.hostname ||
      LOCAL_DEV_HOSTS.has(parsed.hostname);

    if (!hostAllowed) return;

    const target = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (target === current) return;

    window.location.assign(target);
  } catch {
    // ignore malformed URLs
  }
}
