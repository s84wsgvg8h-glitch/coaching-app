import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function AgendaLoading() {
  return (
    <AppShellRouteLoading>
      <AthleteGenericPageSkeleton rows={6} />
    </AppShellRouteLoading>
  );
}
