"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardCoachSkeleton() {
  return (
    <div className="dashboard-shell w-full space-y-3 pb-2">
      <Skeleton className="h-9 w-2/3 max-w-sm rounded-xl" />
      <Skeleton className="h-4 w-1/2 max-w-xs rounded-lg" />
      <div className="dashboard-coach-skeleton-kpi-row">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="dashboard-coach-skeleton-kpi" />
        ))}
      </div>
      <Skeleton className="h-[280px] w-full rounded-2xl md:h-[320px]" />
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    </div>
  );
}
