"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { isCoachLikeRole } from "@/lib/authRoles";
import {
  buildProgramWeekPath,
  resolveProgramEntryFromBlockId,
} from "@/lib/programNavigation";

export default function ProgramBlockRedirectPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { userId, role } = useAuth();
  const blockId = params.id as string;
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!userId || !blockId) return;

    async function redirectToWeek() {
      const { data, error } = await resolveProgramEntryFromBlockId(
        blockId,
        searchParams.get("athlete"),
      );

      if (error || !data) {
        setErrorMessage(error || "Programma kon niet worden geopend.");
        return;
      }

      router.replace(
        buildProgramWeekPath(data, {
          coachViewingAthlete: isCoachLikeRole(role),
        }),
      );
    }

    void redirectToWeek();
  }, [userId, blockId, role, router, searchParams]);

  return (
    <AppShell contentClassName="flex-1 p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-app-border bg-app-surface p-8 shadow">
        <p className="text-gray-500">
          {errorMessage || "Programma openen..."}
        </p>
      </div>
    </AppShell>
  );
}
