import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteProfileSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function ProfileLoading() {
  return (
    <AppShellRouteLoading>
      <AthleteProfileSkeleton />
    </AppShellRouteLoading>
  );
}
