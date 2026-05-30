"use client";

import AppShell from "@/components/AppShell";
import ErrorFallback from "@/components/ui/ErrorFallback";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell contentClassName="flex-1 p-4">
      <ErrorFallback
        title="Chat kon niet laden"
        message={error.message || "Er is een fout opgetreden in de chat."}
        reset={reset}
      />
    </AppShell>
  );
}
