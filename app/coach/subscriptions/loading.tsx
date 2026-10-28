import AppShell from "@/components/AppShell";
import { PageContainer, Panel } from "@/components/ui/design-system";
import { Loader2 } from "lucide-react";

export default function CoachSubscriptionsLoading() {
  return (
    <AppShell>
      <PageContainer size="full">
        <Panel className="flex min-h-[220px] items-center justify-center gap-2 text-[13px] text-app-muted">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          Betalingen laden…
        </Panel>
      </PageContainer>
    </AppShell>
  );
}
