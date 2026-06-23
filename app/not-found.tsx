import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-app-bg px-4 pb-safe pt-safe text-center">
      <p className="text-[13px] font-semibold uppercase tracking-wide text-app-accent">
        404
      </p>
      <h1 className="mt-3 text-2xl font-semibold text-app-text">
        Pagina niet gevonden
      </h1>
      <p className="mt-2 max-w-md text-[14px] leading-relaxed text-app-muted">
        Deze pagina bestaat niet of is verplaatst. Ga terug naar je dashboard om
        verder te gaan.
      </p>
      <div className="mt-6 flex w-full max-w-xs flex-col gap-2 sm:flex-row sm:justify-center">
        <Link href="/dashboard" className="app-btn-primary min-h-[44px]">
          Naar dashboard
        </Link>
        <Link href="/login" className="app-btn-secondary min-h-[44px]">
          Inloggen
        </Link>
      </div>
    </main>
  );
}
