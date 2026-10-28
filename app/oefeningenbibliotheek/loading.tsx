import AppShellRouteLoading from "@/components/loading/AppShellRouteLoading";
import { AthleteGenericPageSkeleton } from "@/components/mobile/AthleteMobileSkeletons";

export default function ExerciseLibraryLoading() {
  return (
    <AppShellRouteLoading>
      <AthleteGenericPageSkeleton rows={7} />
    </AppShellRouteLoading>
  );
}
