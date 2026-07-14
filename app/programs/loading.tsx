import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { PageLoading } from "@/components/ui/Skeleton";

export default function ProgramsLoading() {
  return (
    <AppShellRouteLoading>
      <PageLoading label="Programma openen…" />
    </AppShellRouteLoading>
  );
}
