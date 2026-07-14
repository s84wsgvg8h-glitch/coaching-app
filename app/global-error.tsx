"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="nl">
      <body className="bg-app-bg text-app-text">
        <main className="mx-auto flex min-h-[100dvh] max-w-lg flex-col items-center justify-center px-6 text-center">
          <h1 className="text-xl font-semibold">Er ging iets mis</h1>
          <p className="mt-2 text-sm text-app-muted">
            Probeer de pagina opnieuw te laden. Blijft het probleem? Neem contact op
            met support.
          </p>
          <button
            type="button"
            onClick={reset}
            className="app-btn-primary mt-6 min-h-[44px]"
          >
            Opnieuw proberen
          </button>
        </main>
      </body>
    </html>
  );
}
