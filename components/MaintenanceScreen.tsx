"use client";

type MaintenanceScreenProps = {
  message?: string | null;
};

export default function MaintenanceScreen({ message }: MaintenanceScreenProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-app-bg px-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-app-muted">
        Onderhoud
      </p>
      <h1 className="mt-2 text-2xl font-bold text-app-text">
        De app is tijdelijk niet beschikbaar
      </h1>
      <p className="mt-3 max-w-md text-sm text-app-muted">
        {message?.trim() ||
          "We voeren onderhoud uit. Probeer het later opnieuw of neem contact op met je coach."}
      </p>
    </div>
  );
}
