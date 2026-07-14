"use client";

import { usePathname } from "next/navigation";
import { Check } from "lucide-react";

const STEPS = [
  { id: "account", label: "Account" },
  { id: "intake", label: "Intake" },
  { id: "dashboard", label: "Dashboard" },
] as const;

function stepIndex(pathname: string) {
  if (pathname.startsWith("/intake")) return 1;
  if (pathname === "/dashboard") return 2;
  if (pathname.startsWith("/pending-approval")) return 0;
  return -1;
}

export default function OnboardingProgress() {
  const pathname = usePathname();
  const active = stepIndex(pathname);
  if (active < 0) return null;

  return (
    <div
      className="mx-auto mb-4 flex w-full max-w-md items-center justify-center gap-2 px-4"
      aria-label="Voortgang onboarding"
    >
      {STEPS.map((step, index) => {
        const done = index < active;
        const current = index === active;
        return (
          <div key={step.id} className="flex min-w-0 flex-1 items-center gap-2">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                done || current
                  ? "border-app-accent bg-app-accent text-white"
                  : "border-app-border bg-app-surface text-app-muted"
              }`}
              aria-current={current ? "step" : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : index + 1}
            </div>
            <span
              className={`hidden truncate text-[11px] font-medium sm:inline ${
                current ? "text-app-text" : "text-app-muted"
              }`}
            >
              {step.label}
            </span>
            {index < STEPS.length - 1 ? (
              <div
                className={`mx-1 h-px flex-1 ${
                  index < active ? "bg-app-accent" : "bg-app-border"
                }`}
                aria-hidden="true"
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
