import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteProfileSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function ProfileLoading() {
  return (
    <AppShellRouteLoading contentClassName="flex-1 px-2 pb-4 pt-0 md:p-6 lg:px-8">
      <AthleteProfileSkeleton />
    </AppShellRouteLoading>
  );
}
