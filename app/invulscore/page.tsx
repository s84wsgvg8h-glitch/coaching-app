"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InvulscorePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/athletes");
  }, [router]);

  return null;
}
