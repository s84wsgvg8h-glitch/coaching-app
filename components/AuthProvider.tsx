"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase, getRealSupabase } from "@/lib/supabaseClient";
import MaintenanceScreen from "@/components/MaintenanceScreen";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { loadAppSettings } from "@/lib/adminSettings";
import {
  isAdminRole,
  isCoachLikeRole,
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
  coach_id?: string | null;
  business_name?: string | null;
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

const PUBLIC_PATHS = ["/login", "/signup", "/", "/privacy", "/voorwaarden"];

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

  const refresh = useCallback(async () => {
    await clearDemoModeIfRealSession(() => getRealSupabase().auth.getSession());

    if (isDemoMode()) {
      setUserId(getDemoUserId());
      setEmail(getDemoEmail());
      setProfile(getDemoProfile());
      setMaintenanceMode(false);
      setMaintenanceMessage(null);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await getRealSupabase().auth.getUser();

    if (!user) {
      setUserId("");
      setEmail("");
      setProfile(null);
      setLoading(false);
      return;
    }

    setUserId(user.id);
    setEmail(user.email || "");

    const profileData = await loadAuthenticatedProfile(user.id);
    setProfile(profileData);

    setLoading(false);

    void loadAppSettings().then((settings) => {
      setMaintenanceMode(settings.maintenance_mode);
      setMaintenanceMessage(settings.maintenance_message);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    void refresh();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refresh]);

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
      <div className="flex min-h-[100dvh] items-center justify-center bg-app-bg px-4">
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
