"use client";

import type { ReactNode } from "react";
import { athletesCrmInner, athletesCrmMain } from "@/components/coach/athletes/athletesCrmClasses";

type AthletesCrmLayoutProps = {
  children: ReactNode;
};

export default function AthletesCrmLayout({ children }: AthletesCrmLayoutProps) {
  return (
    <div className="athletes-crm-layout min-h-0 w-full">
      <div className={athletesCrmMain}>
        <div className="athletes-crm-glow pointer-events-none" aria-hidden />
        <div className={athletesCrmInner}>{children}</div>
      </div>
    </div>
  );
}
