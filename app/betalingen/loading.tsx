export default function BetalingenLoading() {
  return (
    <div className="min-w-0 space-y-4 px-2 md:px-3 lg:px-4" aria-busy="true">
      <div className="flex gap-2 overflow-hidden">
        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-app-surface-muted" />
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-11 w-24 shrink-0 animate-pulse rounded-full bg-app-surface-muted"
          />
        ))}
      </div>
      <div className="space-y-3 pt-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="h-10 animate-pulse rounded-xl bg-app-surface-muted"
          />
        ))}
      </div>
    </div>
  );
}
