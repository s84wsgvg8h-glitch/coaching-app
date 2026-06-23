"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AiVragenPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/kennisbank?tab=vragen");
  }, [router]);

  return null;
}
