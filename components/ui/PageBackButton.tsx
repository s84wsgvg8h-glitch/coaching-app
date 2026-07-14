"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import {
  getLogicalBackRoute,
  shouldShowBackButton,
} from "@/lib/appBackNavigation";

type PageBackButtonProps = {
  variant?: "inline" | "topbar";
};

export default function PageBackButton({
  variant = "inline",
}: PageBackButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { role } = useAuth();

  if (!shouldShowBackButton(pathname)) return null;

  function handleBack() {
    const href = getLogicalBackRoute({
      pathname,
      searchParams,
      role,
    });
    router.push(href);
  }

  if (variant === "topbar") {
    return (
      <button
        type="button"
        onClick={handleBack}
        className="page-back-btn page-back-btn--topbar app-focus-ring"
        aria-label="Terug naar vorige stap"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Terug</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="page-back-btn app-focus-ring"
      aria-label="Terug naar vorige stap"
    >
      <ChevronLeft className="h-4 w-4" />
      Terug
    </button>
  );
}
