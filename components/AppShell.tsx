"use client";

import AppSidebar from "@/components/AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function AppShell({
  children,
  className = "min-h-[100dvh] bg-gray-100",
  contentClassName = "flex-1 p-6 pb-16 lg:pb-6",
}: AppShellProps) {
  return (
    <main className={`${className} lg:flex lg:min-h-screen`}>
      <AppSidebar />
      <section className={contentClassName}>{children}</section>
    </main>
  );
}
