"use client";

import "@/styles/dashboard-coach.css";
import AthleteRouteLoadingShell from "@/components/mobile/AthleteRouteLoadingShell";
import DashboardCoachSkeleton from "@/components/dashboard/DashboardCoachSkeleton";
import { AthleteDashboardSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

/** Auth bootstrap — same dashboard shape as the real home screen to avoid a second loading flash. */
export default function AuthLoadingShell() {
  return (
    <AthleteRouteLoadingShell>
      <div className="lg:hidden">
        <AthleteDashboardSkeleton />
      </div>
      <div className="hidden lg:block">
        <DashboardCoachSkeleton />
      </div>
    </AthleteRouteLoadingShell>
  );
}
