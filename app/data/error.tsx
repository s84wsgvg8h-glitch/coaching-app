"use client";

import AppShell from "@/components/AppShell";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function StatisticsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <ErrorFallback
        title="Statistieken kon niet laden"
        message={error.message || "Er is een fout opgetreden bij je statistieken."}
        reset={reset}
      />
    </AppShell>
  );
}
