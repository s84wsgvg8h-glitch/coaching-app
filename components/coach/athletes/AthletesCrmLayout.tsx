"use client";

import type { ReactNode } from "react";
import { PageContainer } from "@/components/ui/design-system";
import { athletesCrmInner, athletesCrmMain } from "@/components/coach/athletes/athletesCrmClasses";

type AthletesCrmLayoutProps = {
  children: ReactNode;
};

export default function AthletesCrmLayout({ children }: AthletesCrmLayoutProps) {
  return (
    <div className="athletes-crm-layout min-h-0 w-full">
      <div className={athletesCrmMain}>
        <PageContainer size="full" className={athletesCrmInner}>
          {children}
        </PageContainer>
      </div>
    </div>
  );
}
