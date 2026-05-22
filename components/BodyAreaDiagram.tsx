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
    <div className="rounded-3xl border border-gray-200 bg-[#eceff3] p-8 shadow-xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-black">Lichaamsgebieden</h2>
        <p className="mt-2 text-gray-500">
          Beweeg over een spiergroep om de naam te zien. Klik op een gebied om
          een blessure toe te voegen. Voorkant links, achterkant rechts.
        </p>
      </div>

      <InjuriesSection athleteId={athleteId} canEdit={canEdit} />
    </div>
  );
}
