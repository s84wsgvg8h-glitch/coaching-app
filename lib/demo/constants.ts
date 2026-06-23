export const DEMO_MODE_STORAGE_KEY = "limitless-demo-mode-v1";
export const DEMO_ROLE_STORAGE_KEY = "limitless-demo-role-v1";
/** Set only when an admin launches demo from /admin — required for isDemoMode(). */
export const DEMO_ADMIN_AUTH_KEY = "limitless-demo-admin-auth-v1";

export type DemoPersona = "coach" | "atleet";

export const DEMO_COACH_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_ATHLETE_1 = "00000000-0000-4000-8000-000000000002";
export const DEMO_ATHLETE_2 = "00000000-0000-4000-8000-000000000003";
export const DEMO_ATHLETE_3 = "00000000-0000-4000-8000-000000000004";
export const DEMO_PENDING_1 = "00000000-0000-4000-8000-000000000005";

export const DEMO_EMAIL = "demo@limitlesscoaching.app";
export const DEMO_ATHLETE_EMAIL = "demo-atleet@limitlesscoaching.app";

export const DEMO_PROFILE = {
  id: DEMO_COACH_ID,
  full_name: "Demo Coach",
  role: "coach",
  coach_id: null,
  business_name: "Limitless Demo Team",
  organization_id: null,
  intake_completed_at: new Date().toISOString(),
  lidnummer: null,
  betaling_prijs: null,
  betaling_dag: null,
  stripe_connect_account_id: null,
  stripe_connect_onboarded_at: null,
};

export const DEMO_ATHLETE_PROFILE = {
  id: DEMO_ATHLETE_1,
  full_name: "Sophie van Dijk",
  role: "atleet",
  coach_id: DEMO_COACH_ID,
  business_name: null,
  organization_id: null,
  intake_completed_at: new Date().toISOString(),
  lidnummer: "LC-1042",
  betaling_prijs: 129,
  betaling_dag: 1,
  stripe_connect_account_id: null,
  stripe_connect_onboarded_at: null,
};

export const DEMO_AUTH_USER = {
  id: DEMO_COACH_ID,
  email: DEMO_EMAIL,
  app_metadata: {},
  user_metadata: { full_name: "Demo Coach" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

export const DEMO_ATHLETE_AUTH_USER = {
  id: DEMO_ATHLETE_1,
  email: DEMO_ATHLETE_EMAIL,
  app_metadata: {},
  user_metadata: { full_name: "Sophie van Dijk" },
  aud: "authenticated",
  created_at: new Date().toISOString(),
};
