import dynamic from "next/dynamic";

export const BlockIntakeWizardModalLazy = dynamic(
  () => import("@/components/programs/BlockIntakeWizardModal"),
  { ssr: false },
);

export const ProgramPlanningCalendarLazy = dynamic(
  () => import("@/components/planning/ProgramPlanningCalendar"),
  { ssr: false, loading: () => <div className="p-4 text-sm text-app-muted">Planning laden...</div> },
);

export const ApplyTemplateModalLazy = dynamic(
  () =>
    import("@/components/programs/ProgramTemplateActions").then((mod) => ({
      default: mod.ApplyTemplateModal,
    })),
  { ssr: false },
);

export const ExerciseLibraryPickerModalLazy = dynamic(
  () => import("@/components/ExerciseLibraryPickerModal"),
  { ssr: false },
);

export const ExerciseLibraryVideoModalLazy = dynamic(
  () => import("@/components/ExerciseLibraryVideoModal"),
  { ssr: false },
);
