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
import { SkeletonCard } from "@/components/ui/Skeleton";
import { loadAppSettings } from "@/lib/adminSettings";
import {
  isAdminRole,
  isCoachLikeRole,
  needsPendingApproval,
  pathRequiresAdminRole,
  pathRequiresCoachLikeRole,
} from "@/lib/authRoles";
import { loadAuthenticatedProfile } from "@/lib/profileAuth";
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
];

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
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState<string | null>(
    null,
  );
  const initialSessionHandledRef = useRef(false);

  const applyDemoSession = useCallback(() => {
    setUserId(getDemoUserId());
    setEmail(getDemoEmail());
    setProfile(getDemoProfile());
    setMaintenanceMode(false);
    setMaintenanceMessage(null);
  }, []);

  const clearAuthState = useCallback(() => {
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
      let resolvedProfile = profileData;

      if (
        profileData?.role === "atleet" &&
        !profileData.intake_completed_at &&
        profileData.intake_required == null
      ) {
        const { data: intakeRow } = await getRealSupabase()
          .from("profiles")
          .select("intake_required")
          .eq("id", session.user.id)
          .maybeSingle();
        resolvedProfile = {
          ...profileData,
          intake_required: intakeRow?.intake_required ?? null,
        };
      }

      setProfile(resolvedProfile);

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

      // Give onAuthStateChange(INITIAL_SESSION) a tick to fire first.
      await new Promise((resolve) => window.setTimeout(resolve, 0));

      if (cancelled || initialSessionHandledRef.current) return;

      const {
        data: { session },
      } = await getRealSupabase().auth.getSession();

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

    const isPublic = PUBLIC_PATHS.some(
      (path) => pathname === path || pathname.startsWith(`${path}?`),
    );

    if (!userId && !isPublic && !pathname.startsWith("/signup")) {
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

  const isPublicPath = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}?`),
  );

  if (loading && !isPublicPath) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-app-bg px-4">
        <div className="w-full max-w-sm">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  const role = profile?.role || "";
  const showMaintenance =
    userId &&
    maintenanceMode &&
    !isAdminRole(role) &&
    !isPublicPath &&
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
