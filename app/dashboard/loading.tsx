import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import DashboardCoachSkeleton from "@/components/dashboard/DashboardCoachSkeleton";
import { AthleteDashboardSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function DashboardLoading() {
  return (
    <AppShellRouteLoading contentClassName="app-page-content dashboard-page-content px-2 md:px-3 lg:px-4">
      <div className="lg:hidden">
        <AthleteDashboardSkeleton />
      </div>
      <div className="hidden lg:block">
        <DashboardCoachSkeleton />
      </div>
    </AppShellRouteLoading>
  );
}
