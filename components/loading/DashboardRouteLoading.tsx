"use client";

import AppShell from "@/components/AppShell";
import DashboardCoachSkeleton from "@/components/dashboard/DashboardCoachSkeleton";
import { AthleteDashboardSkeleton } from "@/components/mobile/AthleteMobileSkeletons";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";

export default function DashboardRouteLoading() {
  const { role, loading } = useAuth();
  const showCoachSkeleton = !loading && isCoachLikeRole(role);

  return (
    <AppShell contentClassName="app-page-content dashboard-page-content px-2 md:px-3 lg:px-4">
      {showCoachSkeleton ? <DashboardCoachSkeleton /> : <AthleteDashboardSkeleton />}
    </AppShell>
  );
}
