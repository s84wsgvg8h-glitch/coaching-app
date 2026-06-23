type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-app-surface-hover ${className}`}
      aria-hidden
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="app-card space-y-3 p-6">
      <Skeleton className="h-6 w-1/3" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageLoading({ label = "Laden…" }: { label?: string }) {
  return (
    <div
      className="flex min-h-[32vh] flex-col items-center justify-center gap-4 py-10"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md px-4">
        <SkeletonList rows={4} />
      </div>
      <p className="text-[13px] text-app-muted">{label}</p>
    </div>
  );
}
