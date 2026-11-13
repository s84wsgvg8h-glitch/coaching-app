"use client";

import ErrorFallback from "@/components/ui/ErrorFallback";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="premium-coach-ui flex min-h-[100dvh] items-center justify-center bg-app-bg p-4 pt-safe pb-safe">
      <ErrorFallback
        title="Er ging iets mis"
        message={error.message || "Probeer de pagina opnieuw te laden."}
        error={error}
        reset={reset}
      />
    </div>
  );
}
