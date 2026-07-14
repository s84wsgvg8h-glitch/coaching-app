"use client";

import { useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import {
  getLogicalBackLabel,
  getLogicalBackRoute,
} from "@/lib/appBackNavigation";

export function useLogicalBack() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { role } = useAuth();

  const href = useMemo(
    () =>
      getLogicalBackRoute({
        pathname,
        searchParams,
        role,
      }),
    [pathname, searchParams, role],
  );

  const label = useMemo(() => getLogicalBackLabel(href), [href]);

  return { href, label };
}
