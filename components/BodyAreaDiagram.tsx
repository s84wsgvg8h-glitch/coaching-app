"use client";

import InjuriesSection from "@/components/InjuriesSection";

type BodyAreaDiagramProps = {
  athleteId: string;
  canEdit?: boolean;
};

export default function BodyAreaDiagram({
  athleteId,
  canEdit = true,
}: BodyAreaDiagramProps) {
  return (
    <div className="rounded-3xl border border-app-border bg-app-surface p-5 shadow-sm sm:p-8">
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl font-bold text-app-text sm:text-3xl">
          Lichaamsgebieden
        </h2>
        <p className="mt-2 text-sm text-app-muted sm:text-base">
          Beweeg over een spiergroep om de naam te zien. Klik op een gebied om
          een blessure toe te voegen. Voorkant links, achterkant rechts.
        </p>
      </div>

      <InjuriesSection athleteId={athleteId} canEdit={canEdit} />
    </div>
  );
}
