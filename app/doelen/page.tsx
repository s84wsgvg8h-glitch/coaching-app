"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DoelenPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/profile?section=athlete");
  }, [router]);

  return null;
}
