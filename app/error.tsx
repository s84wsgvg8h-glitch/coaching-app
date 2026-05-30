"use client";

import ErrorFallback from "@/components/ui/ErrorFallback";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="nl">
      <body className="flex min-h-screen items-center justify-center bg-app-bg p-4">
        <ErrorFallback
          title="Er ging iets mis"
          message={error.message || "Probeer de pagina opnieuw te laden."}
          reset={reset}
        />
      </body>
    </html>
  );
}
