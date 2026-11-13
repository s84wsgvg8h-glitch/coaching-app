"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type ErrorFallbackProps = {
  title?: string;
  message?: string;
  reset?: () => void;
  error?: Error | null;
};

const CHUNK_RELOAD_KEY = "lc-chunk-reload-at";
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(error: Error | null | undefined) {
  if (!error) return false;
  return (
    error.name === "ChunkLoadError" ||
    /Failed to load chunk|Loading chunk [\w-]+ failed|Failed to fetch dynamically imported module/i.test(
      error.message,
    )
  );
}

function shouldAutoReload(error: Error | null | undefined) {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
    return Date.now() - last > CHUNK_RELOAD_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export default function ErrorFallback({
  title = "Er ging iets mis",
  message = "Probeer de pagina opnieuw te laden.",
  reset,
  error,
}: ErrorFallbackProps) {
  const [reloading] = useState(() => shouldAutoReload(error));

  useEffect(() => {
    if (!reloading) return;
    try {
      window.sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
    } catch {
      // Storage can be unavailable in private mode.
    }
    window.location.reload();
  }, [reloading]);

  if (reloading) {
    return (
      <div className="ui-panel mx-auto flex max-w-lg flex-col items-center gap-3 p-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-app-accent" aria-hidden="true" />
        <p className="text-sm text-app-muted">Nieuwe versie laden…</p>
      </div>
    );
  }

  const chunkError = isChunkLoadError(error);

  return (
    <div className="ui-panel mx-auto flex w-full max-w-lg flex-col items-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/15 text-red-400">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mt-4 text-lg font-semibold tracking-tight text-app-text">{title}</h2>
      <p className="mt-2 text-sm text-app-muted">
        {chunkError
          ? "Er is een nieuwe versie van de app beschikbaar. Ververs de pagina om verder te gaan."
          : message}
      </p>
      <div className="mt-6 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
        {reset && !chunkError ? (
          <button type="button" onClick={reset} className="app-btn-primary app-focus-ring min-h-11">
            Opnieuw proberen
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className={`${chunkError ? "app-btn-primary" : "app-btn-secondary"} app-focus-ring min-h-11`}
        >
          Pagina verversen
        </button>
      </div>
    </div>
  );
}
