"use client";

import DashboardCoachSkeleton from "@/components/dashboard/DashboardCoachSkeleton";
import { AthleteDashboardSkeleton } from "@/components/mobile/AthleteMobileSkeletons";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";

/** Content-only dashboard skeleton — AppShell chrome comes from the page, not a second loading shell. */
export default function DashboardRouteLoading() {
  const { role } = useAuth();

  return (
    <div className="app-page-content min-h-0 flex-1 px-2 py-3 lg:px-6">
      {isCoachLikeRole(role) ? (
        <DashboardCoachSkeleton />
      ) : (
        <AthleteDashboardSkeleton />
      )}
    </div>
  );
}
