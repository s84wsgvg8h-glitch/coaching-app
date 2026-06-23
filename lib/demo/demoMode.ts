import {
  DEMO_ATHLETE_AUTH_USER,
  DEMO_ATHLETE_EMAIL,
  DEMO_ATHLETE_PROFILE,
  DEMO_AUTH_USER,
  DEMO_COACH_ID,
  DEMO_ATHLETE_1,
  DEMO_EMAIL,
  DEMO_ADMIN_AUTH_KEY,
  DEMO_MODE_STORAGE_KEY,
  DEMO_PROFILE,
  DEMO_ROLE_STORAGE_KEY,
  type DemoPersona,
} from "@/lib/demo/constants";
import { resetDemoStore } from "@/lib/demo/demoData";

export function isDemoMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.sessionStorage.getItem(DEMO_MODE_STORAGE_KEY) === "1" &&
      window.sessionStorage.getItem(DEMO_ADMIN_AUTH_KEY) === "1"
    );
  } catch {
    return false;
  }
}

export function getDemoPersona(): DemoPersona {
  if (typeof window === "undefined") return "coach";
  try {
    const role = window.sessionStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    return role === "atleet" ? "atleet" : "coach";
  } catch {
    return "coach";
  }
}

/** Internal: switch persona while demo is already active (preserves admin auth). */
export function enableDemoMode(persona: DemoPersona = "coach") {
  if (typeof window === "undefined") return;
  const hadAdminAuth =
    window.sessionStorage.getItem(DEMO_ADMIN_AUTH_KEY) === "1";
  resetDemoStore();
  window.sessionStorage.setItem(DEMO_MODE_STORAGE_KEY, "1");
  window.sessionStorage.setItem(DEMO_ROLE_STORAGE_KEY, persona);
  if (hadAdminAuth) {
    window.sessionStorage.setItem(DEMO_ADMIN_AUTH_KEY, "1");
  }
}

/** Launch demo from admin — only entry point for demo mode. */
export function enableDemoModeFromAdmin(persona: DemoPersona = "coach") {
  if (typeof window === "undefined") return;
  resetDemoStore();
  window.sessionStorage.setItem(DEMO_MODE_STORAGE_KEY, "1");
  window.sessionStorage.setItem(DEMO_ROLE_STORAGE_KEY, persona);
  window.sessionStorage.setItem(DEMO_ADMIN_AUTH_KEY, "1");
}

export function disableDemoMode() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(DEMO_MODE_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_ROLE_STORAGE_KEY);
  window.sessionStorage.removeItem(DEMO_ADMIN_AUTH_KEY);
  resetDemoStore();
}

/**
 * Demo mode must never override a real Supabase session (e.g. after /login).
 * Returns true when demo mode was active and got cleared.
 */
export async function clearDemoModeIfRealSession(
  getRealSession: () => Promise<{ data: { session: { user: { id: string } } | null } }>,
): Promise<boolean> {
  if (!isDemoMode()) return false;

  const { data } = await getRealSession();
  if (!data.session?.user) return false;

  disableDemoMode();
  return true;
}

export function getDemoUserId() {
  return getDemoPersona() === "atleet" ? DEMO_ATHLETE_1 : DEMO_COACH_ID;
}

export function getDemoEmail() {
  return getDemoPersona() === "atleet" ? DEMO_ATHLETE_EMAIL : DEMO_EMAIL;
}

export function getDemoProfile() {
  return getDemoPersona() === "atleet"
    ? { ...DEMO_ATHLETE_PROFILE }
    : { ...DEMO_PROFILE };
}

export function getDemoAuthUser() {
  return getDemoPersona() === "atleet"
    ? { ...DEMO_ATHLETE_AUTH_USER }
    : { ...DEMO_AUTH_USER };
}

export function getDemoSession() {
  return {
    access_token: "demo-access-token",
    refresh_token: "demo-refresh-token",
    expires_in: 3600,
    token_type: "bearer" as const,
    user: getDemoAuthUser(),
  };
}

export function getDemoPersonaLabel() {
  return getDemoPersona() === "atleet" ? "Demo atleet" : "Demo coach";
}
