import { Skeleton } from "@/components/ui/Skeleton";

export function AthleteDashboardSkeleton() {
  return (
    <div className="athlete-dashboard athlete-dashboard--mobile-fit w-full">
      <div className="athlete-dashboard-bento">
        <div className="athlete-dashboard-bento-metrics grid grid-cols-2 gap-1.5">
          <div className="athlete-dashboard-card space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-10 w-16" />
          </div>
          <div className="athlete-dashboard-card space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="athlete-dashboard-bento-cta">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="athlete-dashboard-bento-chat">
          <div className="athlete-dashboard-card flex gap-3">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
      </div>
      <div className="athlete-dashboard-mobile-spacer max-lg:block lg:hidden" aria-hidden="true" />
      <div className="athlete-dashboard-quicklinks athlete-dashboard-quicklinks--mobile max-lg:block lg:hidden">
        <div className="athlete-dashboard-quicklinks-scroll">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="athlete-dashboard-quicknav-skeleton h-[72px] w-[132px] shrink-0 rounded-[14px]" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AthleteChatListSkeleton() {
  return (
    <div className="chat-list-panel flex h-full min-h-0 flex-col">
      <div className="chat-list-header mobile-safe-top shrink-0 border-b border-app-border px-3 pb-2">
        <Skeleton className="mb-2 h-7 w-20" />
        <Skeleton className="h-11 w-full rounded-full" />
        <div className="mt-2 flex gap-2">
          <Skeleton className="h-9 w-14 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
      </div>
      <div className="chat-list-scroll flex-1 space-y-0 p-1">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 px-2 py-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-2/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-3 w-10 shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AthleteProgramsSkeleton() {
  return (
    <div className="space-y-3 px-1 pt-1">
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <div className="flex gap-3 overflow-hidden pb-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="w-[min(320px,calc(100vw-2rem))] shrink-0 space-y-3">
            <Skeleton className="h-8 w-40 rounded-lg" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AthleteProfileSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none lg:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-24 shrink-0 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64 max-w-full" />
      <div className="space-y-3 pt-2">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export function AthleteGenericPageSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 px-1">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-56 max-w-full" />
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}
