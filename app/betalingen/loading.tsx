export default function BetalingenLoading() {
  return (
    <div className="min-w-0 space-y-4 px-2 md:px-3 lg:px-4" aria-busy="true">
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
        <div className="h-11 w-full max-w-xl animate-pulse rounded-full bg-app-surface-muted" />
        <div className="h-11 w-full animate-pulse rounded-xl bg-app-surface-muted sm:ml-auto sm:w-36" />
      </div>
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-11 w-28 shrink-0 animate-pulse rounded-full bg-app-surface-muted"
          />
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-app-border">
        <div className="grid grid-cols-5 gap-3 border-b border-app-border px-4 py-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-5 animate-pulse rounded bg-app-surface-muted"
            />
          ))}
        </div>
        <div className="space-y-3 p-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-xl bg-app-surface-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
