"use client";

import AppShell from "@/components/AppShell";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <ErrorFallback
        title="Dashboard kon niet laden"
        message={error.message || "Er is een fout opgetreden op het dashboard."}
        reset={reset}
      />
    </AppShell>
  );
}
