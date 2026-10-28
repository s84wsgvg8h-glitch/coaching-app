import { Skeleton } from "@/components/ui/Skeleton";

export default function ProgramWeekSkeleton() {
  return (
    <div className="animate-pulse space-y-3 p-2 lg:space-y-4 lg:p-6">
      <div className="grid grid-cols-2 gap-2 lg:hidden">
        <Skeleton className="h-11 rounded-xl" />
        <Skeleton className="h-11 rounded-xl" />
      </div>
      <Skeleton className="hidden h-8 w-48 rounded-lg lg:block" />
      <div className="flex gap-3 overflow-hidden pb-2 lg:grid lg:grid-cols-4 lg:gap-4 lg:overflow-visible">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className={`shrink-0 space-y-3 ${
              index === 0
                ? "w-[min(320px,calc(100vw-2rem))] lg:w-auto"
                : "hidden w-[min(320px,calc(100vw-2rem))] lg:block lg:w-auto"
            }`}
          >
            <Skeleton className="h-8 w-32 rounded-lg" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
