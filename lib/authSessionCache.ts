import type { AuthProfile } from "@/components/AuthProvider";

const AUTH_CACHE_KEY = "lc-auth-snapshot-v1";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type CachedAuthSnapshot = {
  userId: string;
  email: string;
  profile: AuthProfile;
  cachedAt: number;
};

export function readAuthSessionCache(): CachedAuthSnapshot | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(AUTH_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CachedAuthSnapshot;
    if (
      !parsed.userId ||
      !parsed.profile?.role ||
      Date.now() - (parsed.cachedAt || 0) > MAX_AGE_MS
    ) {
      window.sessionStorage.removeItem(AUTH_CACHE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function writeAuthSessionCache(snapshot: {
  userId: string;
  email: string;
  profile: AuthProfile | null;
}) {
  if (typeof window === "undefined" || !snapshot.profile?.role) return;

  try {
    const payload: CachedAuthSnapshot = {
      userId: snapshot.userId,
      email: snapshot.email,
      profile: snapshot.profile,
      cachedAt: Date.now(),
    };
    window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage full or unavailable
  }
}

export function clearAuthSessionCache() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(AUTH_CACHE_KEY);
  } catch {
    // ignore
  }
}

export function readCachedAuthBootState(): {
  userId: string;
  email: string;
  profile: AuthProfile | null;
  hasCache: boolean;
} {
  const cached = readAuthSessionCache();
  if (!cached) {
    return { userId: "", email: "", profile: null, hasCache: false };
  }

  return {
    userId: cached.userId,
    email: cached.email,
    profile: cached.profile,
    hasCache: true,
  };
}
