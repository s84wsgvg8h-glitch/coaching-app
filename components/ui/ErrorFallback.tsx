"use client";

type ErrorFallbackProps = {
  title?: string;
  message?: string;
  reset?: () => void;
};

export default function ErrorFallback({
  title = "Er ging iets mis",
  message = "Probeer de pagina opnieuw te laden.",
  reset,
}: ErrorFallbackProps) {
  return (
    <div className="app-card mx-auto flex max-w-lg flex-col items-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-2xl dark:bg-red-950/40">
        ⚠️
      </div>
      <h2 className="mt-4 text-xl font-bold text-app-text">{title}</h2>
      <p className="mt-2 text-sm text-app-muted">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {reset ? (
          <button type="button" onClick={reset} className="app-btn-primary">
            Opnieuw proberen
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="app-btn-secondary"
        >
          Pagina verversen
        </button>
      </div>
    </div>
  );
}
