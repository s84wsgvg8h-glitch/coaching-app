export default function ProgramWeekSkeleton() {
  return (
    <div className="animate-pulse space-y-4 p-4 lg:p-6">
      <div className="h-8 w-48 rounded-lg bg-app-surface-hover" />
      <div className="grid gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[420px] rounded-2xl border border-app-border bg-app-surface"
          />
        ))}
      </div>
    </div>
  );
}
