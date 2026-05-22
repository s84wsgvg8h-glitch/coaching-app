"use client";

import AppSidebar from "@/components/AppSidebar";

type AppShellProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function AppShell({
  children,
  className = "min-h-screen bg-gray-100",
  contentClassName = "flex-1 p-6",
}: AppShellProps) {
  return (
    <main className={className}>
      <div className="flex min-h-screen">
        <AppSidebar />
        <section className={contentClassName}>{children}</section>
      </div>
    </main>
  );
}
