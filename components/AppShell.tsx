"use client";

import AppSidebar from "@/components/AppSidebar";
import MobileBottomNav from "@/components/MobileBottomNav";
import SystemBanner from "@/components/SystemBanner";
import { useAuth } from "@/components/AuthProvider";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function AppShell({
  children,
  className = "min-h-[100dvh] bg-app-bg",
  contentClassName = "p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:p-6 lg:pb-6",
}: AppShellProps) {
  const { role } = useAuth();
  const showMobileNav = role === "atleet";

  return (
    <main className={`${className} lg:flex lg:h-[100dvh] lg:min-h-0 lg:overflow-hidden`}>
      <AppSidebar />
      <section
        className={`mobile-scroll flex-1 min-h-0 min-w-0 overflow-x-hidden overflow-y-auto ${contentClassName}`}
      >
        <SystemBanner />
        {children}
      </section>
      {showMobileNav ? <MobileBottomNav /> : null}
    </main>
  );
}
