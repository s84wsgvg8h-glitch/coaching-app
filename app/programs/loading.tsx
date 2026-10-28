import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteProgramsSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function ProgramsLoading() {
  return (
    <AppShellRouteLoading hideMobileTopBar>
      <AthleteProgramsSkeleton />
    </AppShellRouteLoading>
  );
}
