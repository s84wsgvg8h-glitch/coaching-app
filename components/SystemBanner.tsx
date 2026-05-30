"use client";

import { useEffect, useState } from "react";
import { loadActiveSystemBanner, type SystemBanner } from "@/lib/systemBanner";

const typeStyles: Record<SystemBanner["banner_type"], string> = {
  info: "bg-blue-50 text-blue-900 border-blue-200",
  warning: "bg-amber-50 text-amber-900 border-amber-200",
  success: "bg-emerald-50 text-emerald-900 border-emerald-200",
  error: "bg-red-50 text-red-900 border-red-200",
};

export default function SystemBanner() {
  const [banner, setBanner] = useState<SystemBanner | null>(null);

  useEffect(() => {
    void loadActiveSystemBanner().then(setBanner);
  }, []);

  if (!banner) return null;

  return (
    <div
      className={`border-b px-4 py-2.5 text-sm font-medium ${typeStyles[banner.banner_type]}`}
      role="status"
    >
      {banner.message}
    </div>
  );
}
