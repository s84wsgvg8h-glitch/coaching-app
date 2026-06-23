"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getChatEntryReturn } from "@/lib/chatNavigation";

const HIDE_BACK_PATHS = ["/dashboard", "/login", "/signup", "/intake"];

const DASHBOARD_BACK_PATHS = ["/athletes", "/profile"];

function shouldHideBack(pathname: string) {
  return HIDE_BACK_PATHS.includes(pathname);
}

type PageBackButtonProps = {
  variant?: "inline" | "topbar";
};

export default function PageBackButton({
  variant = "inline",
}: PageBackButtonProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (shouldHideBack(pathname)) return null;

  function handleBack() {
    if (pathname.startsWith("/chat")) {
      const fromParam = searchParams.get("from");
      if (fromParam && fromParam.startsWith("/")) {
        router.push(fromParam);
        return;
      }
      router.push(getChatEntryReturn());
      return;
    }

    if (DASHBOARD_BACK_PATHS.includes(pathname)) {
      router.push("/dashboard");
      return;
    }

    router.back();
  }

  if (variant === "topbar") {
    return (
      <button
        type="button"
        onClick={handleBack}
        className="page-back-btn page-back-btn--topbar app-focus-ring"
        aria-label="Terug naar vorige pagina"
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
      aria-label="Terug naar vorige pagina"
    >
      <ChevronLeft className="h-4 w-4" />
      Terug
    </button>
  );
}
