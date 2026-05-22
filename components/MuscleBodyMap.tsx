"use client";

import Image from "next/image";
import { useState } from "react";
import {
  BACK_MUSCLE_AREAS,
  BODY_MAP_IMAGE,
  BODY_MAP_LAYOUT,
  FRONT_MUSCLE_AREAS,
  MUSCLE_VIEWBOX,
  type MuscleArea,
} from "@/lib/muscleAreas";

type MuscleBodyMapProps = {
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
};

function MuscleSideOverlay({
  areas,
  layout,
  hoveredId,
  onHover,
}: {
  areas: MuscleArea[];
  layout: { translateX: number; translateY: number; scale: number };
  hoveredId: string | null;
  onHover: (area: MuscleArea | null) => void;
}) {
  return (
    <g
      transform={`translate(${layout.translateX} ${layout.translateY}) scale(${layout.scale})`}
    >
      {areas.map((area) => {
        const isHovered = hoveredId === area.id;

        return (
          <path
            key={area.id}
            d={area.path}
            fill="#2563eb"
            fillOpacity={isHovered ? 0.45 : 0}
            stroke={isHovered ? "#1d4ed8" : "transparent"}
            strokeWidth="1.5"
            className="cursor-pointer transition-all duration-150"
            onMouseEnter={() => onHover(area)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(area)}
            onBlur={() => onHover(null)}
            tabIndex={0}
            aria-label={area.labelNl}
          >
            <title>{area.labelNl}</title>
          </path>
        );
      })}
    </g>
  );
}

export default function MuscleBodyMap({
  showLabel = true,
  compact = false,
  className = "",
}: MuscleBodyMapProps) {
  const [hoveredArea, setHoveredArea] = useState<MuscleArea | null>(null);

  return (
    <div className={className}>
      <div
        className={`relative mx-auto w-full ${
          compact ? "max-w-[420px]" : "max-w-[656px]"
        }`}
        style={{ aspectRatio: `${BODY_MAP_IMAGE.width} / ${BODY_MAP_IMAGE.height}` }}
      >
        <Image
          src={BODY_MAP_IMAGE.src}
          alt="Lichaam voorkant en achterkant"
          width={BODY_MAP_IMAGE.width}
          height={BODY_MAP_IMAGE.height}
          className="h-auto w-full select-none"
          priority
        />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${BODY_MAP_IMAGE.width} ${BODY_MAP_IMAGE.height}`}
          aria-hidden="true"
        >
          <MuscleSideOverlay
            areas={FRONT_MUSCLE_AREAS}
            layout={BODY_MAP_LAYOUT.front}
            hoveredId={hoveredArea?.id ?? null}
            onHover={setHoveredArea}
          />
          <MuscleSideOverlay
            areas={BACK_MUSCLE_AREAS}
            layout={BODY_MAP_LAYOUT.back}
            hoveredId={hoveredArea?.id ?? null}
            onHover={setHoveredArea}
          />
        </svg>
      </div>

      {showLabel && (
        <div
          className={`mx-auto flex min-h-[44px] items-center justify-center rounded-2xl border border-gray-200 bg-white px-4 py-2 text-center shadow-sm ${
            compact ? "mt-3 max-w-[420px] text-xs" : "mt-6 max-w-md text-sm"
          }`}
        >
          <p className="font-bold text-black">
            {hoveredArea
              ? `${hoveredArea.labelNl} · ${hoveredArea.labelEn}`
              : "Beweeg over een spiergroep"}
          </p>
        </div>
      )}

      <span className="sr-only">
        Spierkaart met {MUSCLE_VIEWBOX.width} bij {MUSCLE_VIEWBOX.height} overlay
        per lichaamshelft.
      </span>
    </div>
  );
}
