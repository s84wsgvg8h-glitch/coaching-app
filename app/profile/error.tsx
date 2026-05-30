"use client";

import AppShell from "@/components/AppShell";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <ErrorFallback
        title="Profiel kon niet laden"
        message={error.message || "Er is een fout opgetreden bij je profiel."}
        reset={reset}
      />
    </AppShell>
  );
}
