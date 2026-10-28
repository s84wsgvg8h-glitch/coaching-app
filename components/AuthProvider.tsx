"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase, getRealSupabase } from "@/lib/supabaseClient";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import AuthLoadingShell from "@/components/loading/AuthLoadingShell";
import { loadAppSettings } from "@/lib/adminSettings";
import {
  isAdminRole,
  isCoachLikeRole,
  needsPendingApproval,
  pathRequiresAdminRole,
  pathRequiresCoachLikeRole,
} from "@/lib/authRoles";
import { loadAuthenticatedProfile } from "@/lib/profileAuth";
import { hideNativeSplashScreen } from "@/lib/nativeSplash";
import {
  clearAuthSessionCache,
  readCachedAuthBootState,
  writeAuthSessionCache,
} from "@/lib/authSessionCache";
import {
  getDemoEmail,
  getDemoProfile,
  getDemoUserId,
  clearDemoModeIfRealSession,
  isDemoMode,
} from "@/lib/demo/demoMode";

export type AuthProfile = {
  id: string;
  full_name: string | null;
  role: string | null;
  pending_kind?: string | null;
  coach_id?: string | null;
  business_name?: string | null;
  intake_completed_at?: string | null;
  intake_required?: boolean | null;
  archived_at?: string | null;
};

type AuthContextValue = {
  userId: string;
  email: string;
  profile: AuthProfile | null;
  role: string;
  loading: boolean;
  refresh: () => Promise<void>;
  isCoachLike: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/",
  "/privacy",
  "/voorwaarden",
  "/pending-approval",
  "/reset-password",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => {
    if (path === "/") return pathname === "/";
    return (
      pathname === path ||
      pathname.startsWith(`${path}/`) ||
      pathname.startsWith(`${path}?`)
    );
  });
}

function buildLoginRedirectPath(pathname: string) {
  const path = pathname.split("?")[0];
  if (
    path === "/profile" ||
    path.startsWith("/profile/") ||
    path === "/login" ||
    path === "/signup" ||
    path === "/"
  ) {
    return "/login";
  }
  return `/login?next=${encodeURIComponent(pathname)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const cachedBoot = readCachedAuthBootState();
  const [userId, setUserId] = useState(cachedBoot.userId);
  const [email, setEmail] = useState(cachedBoot.email);
  const [profile, setProfile] = useState<AuthProfile | null>(cachedBoot.profile);
  const [loading, setLoading] = useState(!cachedBoot.hasCache);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  );
  const initialSessionHandledRef = useRef(false);
  const optimisticBootRef = useRef(cachedBoot.hasCache);
  const cachedUserIdRef = useRef(cachedBoot.userId);

  const applyDemoSession = useCallback(() => {
    setUserId(getDemoUserId());
    setEmail(getDemoEmail());
    setProfile(getDemoProfile());
    setMaintenanceMode(false);
    setMaintenanceMessage(null);
  }, []);

  const clearAuthState = useCallback(() => {
    clearAuthSessionCache();
    setUserId("");
    setEmail("");
    setProfile(null);
  }, []);

  const applySession = useCallback(
    async (session: Session | null) => {
      await clearDemoModeIfRealSession(() => getRealSupabase().auth.getSession());

      if (isDemoMode()) {
        applyDemoSession();
        return;
      }

      if (!session?.user) {
        clearAuthState();
        return;
      }

      setUserId(session.user.id);
      setEmail(session.user.email || "");

      const profileData = await loadAuthenticatedProfile(session.user.id);
      const resolvedProfile = profileData;

      setProfile(resolvedProfile);

      if (resolvedProfile) {
        writeAuthSessionCache({
          userId: session.user.id,
          email: session.user.email || "",
          profile: resolvedProfile,
        });
      }

      void loadAppSettings().then((settings) => {
        setMaintenanceMode(settings.maintenance_mode);
        setMaintenanceMessage(settings.maintenance_message);
      });
    },
    [applyDemoSession, clearAuthState],
  );

  const refresh = useCallback(async () => {
    const {
      data: { session },
    } = await getRealSupabase().auth.getSession();
    await applySession(session);
  }, [applySession]);

  useEffect(() => {
    let cancelled = false;

    const finishBootstrap = () => {
      if (!cancelled) {
        setLoading(false);
      }
    };

    const handleAuthEvent = (session: Session | null) => {
      window.setTimeout(() => {
        if (cancelled) return;
        void applySession(session).finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
      }, 0);
    };

    const {
      data: { subscription },
    } = getRealSupabase().auth.onAuthStateChange((event, session) => {
      if (cancelled) return;

      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        if (event === "INITIAL_SESSION") {
          initialSessionHandledRef.current = true;
        }
        handleAuthEvent(session);
        return;
      }

      if (event === "SIGNED_OUT") {
        if (!isDemoMode()) {
          clearAuthState();
        }
        finishBootstrap();
      }
    });

    void (async () => {
      await clearDemoModeIfRealSession(() => getRealSupabase().auth.getSession());

      if (cancelled) return;

      if (isDemoMode()) {
        applyDemoSession();
        finishBootstrap();
        return;
      }

      const {
        data: { session },
      } = await getRealSupabase().auth.getSession();

      if (cancelled) return;

      if (optimisticBootRef.current) {
        optimisticBootRef.current = false;
        if (session?.user?.id === cachedUserIdRef.current) {
          finishBootstrap();
          void applySession(session);
          return;
        }
        clearAuthSessionCache();
        clearAuthState();
        setLoading(true);
      }

      // Give onAuthStateChange(INITIAL_SESSION) a tick to fire first.
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      if (cancelled || initialSessionHandledRef.current) return;

      await applySession(session);
      finishBootstrap();
    })();

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [applyDemoSession, applySession, clearAuthState]);

  useEffect(() => {
    if (loading) return;
    void hideNativeSplashScreen();
  }, [loading]);

  useEffect(() => {
    if (loading) return;

    if (!userId && !isPublicPath(pathname) && !pathname.startsWith("/signup")) {
      router.replace(buildLoginRedirectPath(pathname));
      return;
    }

    const role = profile?.role || "";

    if (
      userId &&
      needsPendingApproval(profile) &&
      !pathname.startsWith("/pending-approval")
    ) {
      router.replace("/pending-approval");
      return;
    }

    if (userId && isAdminRole(role) && pathname === "/dashboard") {
      router.replace("/admin");
      return;
    }

    if (userId && pathRequiresAdminRole(pathname) && !isAdminRole(role)) {
      router.replace("/dashboard");
      return;
    }

    if (
      userId &&
      pathRequiresCoachLikeRole(pathname) &&
      !isCoachLikeRole(role)
    ) {
      router.replace("/dashboard");
    }
  }, [loading, userId, profile?.role, pathname, router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      userId,
      email,
      profile,
      role: profile?.role || "",
      loading,
      refresh,
      isCoachLike: isCoachLikeRole(profile?.role),
      isAdmin: isAdminRole(profile?.role),
    }),
    [userId, email, profile, loading, refresh],
  );

  const publicPath = isPublicPath(pathname);

  if (loading && !publicPath) {
    return <AuthLoadingShell />;
  }

  const role = profile?.role || "";
  const showMaintenance =
    userId &&
    maintenanceMode &&
    !isAdminRole(role) &&
    !publicPath &&
    !pathname.startsWith("/login");

  if (showMaintenance) {
    return (
      <AuthContext.Provider value={value}>
        <MaintenanceScreen message={maintenanceMessage} />
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}

export function useAuthOptional() {
  return useContext(AuthContext);
}
