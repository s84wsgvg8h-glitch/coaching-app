"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import CoachAppointmentModal from "@/components/CoachAppointmentModal";
import CoachWeekCalendar from "@/components/CoachWeekCalendar";
import { PageContainer, PageHeader } from "@/components/ui/design-system";
import { supabase } from "@/lib/supabaseClient";
import { isCoachLikeRole } from "@/lib/authRoles";
import { createDefaultAppointmentDraft } from "@/lib/coachCalendarEvents";

export default function AgendaPage() {
  const [coachId, setCoachId] = useState("");
  const [loading, setLoading] = useState(true);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [appointmentDraft, setAppointmentDraft] = useState(
    createDefaultAppointmentDraft("", new Date()),
  );

  useEffect(() => {
    document.title = "Agenda";

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (!isCoachLikeRole(profile?.role)) {
        window.location.href = "/dashboard";
        return;
      }

      setCoachId(user.id);
      setAppointmentDraft(createDefaultAppointmentDraft(user.id, new Date()));
      setLoading(false);
    }

    void init();
  }, []);

  function openCreateModal() {
    if (!coachId) return;
    setAppointmentDraft(createDefaultAppointmentDraft(coachId, new Date()));
    setAppointmentModalOpen(true);
  }

  function handleSaved() {
    setAppointmentModalOpen(false);
  }

  if (loading || !coachId) {
    return (
      <AppShell>
        <PageContainer size="full">
          <p className="text-sm text-app-muted">Agenda laden...</p>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageContainer size="full" className="agenda-page-shell">
        <PageHeader
          title="Agenda"
          description="Weekoverzicht en planning."
          actions={
            <button
              type="button"
              onClick={openCreateModal}
              className="app-btn-primary app-focus-ring shrink-0"
            >
              Nieuwe afspraak
            </button>
          }
        />

        <CoachWeekCalendar
          userId={coachId}
          variant="embedded"
          forceExpanded
          fullPage
        />
      </PageContainer>

      <CoachAppointmentModal
        open={appointmentModalOpen}
        draft={appointmentDraft}
        onClose={() => setAppointmentModalOpen(false)}
        onSaved={handleSaved}
      />
    </AppShell>
  );
}
