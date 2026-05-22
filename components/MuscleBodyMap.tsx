"use client";

import { useState } from "react";
import {
  BACK_BODY_SILHOUETTE,
  BACK_MUSCLE_AREAS,
  BODY_MAP_IMAGE,
  BODY_MAP_LAYOUT,
  FRONT_BODY_SILHOUETTE,
  FRONT_MUSCLE_AREAS,
  getMuscleAreaById,
  type MuscleArea,
} from "@/lib/muscleAreas";
import type { AthleteInjury, InjuryUrgency } from "@/lib/injuries";

type MuscleBodyMapProps = {
  showLabel?: boolean;
  compact?: boolean;
  className?: string;
  selectedAreaId?: string | null;
  injuredAreaIds?: Record<string, InjuryUrgency | null>;
  onAreaClick?: (area: MuscleArea) => void;
  interactive?: boolean;
};

const URGENCY_FILL: Record<InjuryUrgency, string> = {
  laag: "#fde68a",
  medium: "#fdba74",
  hoog: "#fca5a5",
};

const URGENCY_STROKE: Record<InjuryUrgency, string> = {
  laag: "#ca8a04",
  medium: "#ea580c",
  hoog: "#dc2626",
};

function MuscleSideOverlay({
  areas,
  layout,
  hoveredId,
  selectedAreaId,
  injuredAreaIds,
  interactive,
  onHover,
  onAreaClick,
}: {
  areas: MuscleArea[];
  layout: { translateX: number; translateY: number; scale: number };
  hoveredId: string | null;
  selectedAreaId: string | null;
  injuredAreaIds: Record<string, InjuryUrgency | null>;
  interactive: boolean;
  onHover: (area: MuscleArea | null) => void;
  onAreaClick?: (area: MuscleArea) => void;
}) {
  return (
    <g
      transform={`translate(${layout.translateX} ${layout.translateY}) scale(${layout.scale})`}
    >
      {areas.map((area) => {
        const isHovered = hoveredId === area.id;
        const isSelected = selectedAreaId === area.id;
        const injuryUrgency = injuredAreaIds[area.id] ?? null;
        const isInjured = injuryUrgency !== null;

        let fill = "transparent";
        let fillOpacity = 0;
        let stroke = "#94a3b8";
        let strokeWidth = 1.2;

        if (isInjured && injuryUrgency) {
          fill = URGENCY_FILL[injuryUrgency];
          fillOpacity = isHovered || isSelected ? 0.75 : 0.55;
          stroke = URGENCY_STROKE[injuryUrgency];
          strokeWidth = 1.6;
        } else if (isSelected) {
          fill = "#2563eb";
          fillOpacity = 0.45;
          stroke = "#1d4ed8";
          strokeWidth = 1.8;
        } else if (isHovered) {
          fill = "#2563eb";
          fillOpacity = 0.35;
          stroke = "#1d4ed8";
          strokeWidth = 1.6;
        }

        return (
          <path
            key={area.id}
            d={area.path}
            fill={fill}
            fillOpacity={fillOpacity}
            stroke={stroke}
            strokeWidth={strokeWidth}
            className={`transition-all duration-150 ${
              interactive ? "cursor-pointer" : "cursor-default"
            }`}
            onMouseEnter={() => onHover(area)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(area)}
            onBlur={() => onHover(null)}
            onClick={() => onAreaClick?.(area)}
            tabIndex={interactive ? 0 : -1}
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
  selectedAreaId = null,
  injuredAreaIds = {},
  onAreaClick,
  interactive = false,
}: MuscleBodyMapProps) {
  const [hoveredArea, setHoveredArea] = useState<MuscleArea | null>(null);
  const selectedArea = selectedAreaId ? getMuscleAreaById(selectedAreaId) : null;
  const labelArea = hoveredArea || selectedArea;

  return (
    <div className={className}>
      <div
        className={`relative mx-auto w-full rounded-3xl border border-gray-200 bg-white ${
          compact ? "max-w-[420px]" : "max-w-[656px]"
        }`}
        style={{ aspectRatio: `${BODY_MAP_IMAGE.width} / ${BODY_MAP_IMAGE.height}` }}
      >
        <svg
          className="h-full w-full"
          viewBox={`0 0 ${BODY_MAP_IMAGE.width} ${BODY_MAP_IMAGE.height}`}
          aria-hidden="true"
        >
          <rect
            x="0"
            y="0"
            width={BODY_MAP_IMAGE.width}
            height={BODY_MAP_IMAGE.height}
            fill="#f8fafc"
            rx="24"
          />
          <text
            x={BODY_MAP_IMAGE.width * 0.25}
            y="16"
            textAnchor="middle"
            className="fill-gray-400 text-[11px] font-bold uppercase tracking-wide"
          >
            Voorkant
          </text>
          <text
            x={BODY_MAP_IMAGE.width * 0.75}
            y="16"
            textAnchor="middle"
            className="fill-gray-400 text-[11px] font-bold uppercase tracking-wide"
          >
            Achterkant
          </text>
          <line
            x1={BODY_MAP_IMAGE.width / 2}
            y1="24"
            x2={BODY_MAP_IMAGE.width / 2}
            y2={BODY_MAP_IMAGE.height - 12}
            stroke="#e2e8f0"
            strokeDasharray="4 4"
          />
          <g
            transform={`translate(${BODY_MAP_LAYOUT.front.translateX} ${BODY_MAP_LAYOUT.front.translateY}) scale(${BODY_MAP_LAYOUT.front.scale})`}
          >
            <path
              d={FRONT_BODY_SILHOUETTE}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          </g>
          <g
            transform={`translate(${BODY_MAP_LAYOUT.back.translateX} ${BODY_MAP_LAYOUT.back.translateY}) scale(${BODY_MAP_LAYOUT.back.scale})`}
          >
            <path
              d={BACK_BODY_SILHOUETTE}
              fill="none"
              stroke="#cbd5e1"
              strokeWidth={1.5}
              pointerEvents="none"
            />
          </g>
          <MuscleSideOverlay
            areas={FRONT_MUSCLE_AREAS}
            layout={BODY_MAP_LAYOUT.front}
            hoveredId={hoveredArea?.id ?? null}
            selectedAreaId={selectedAreaId}
            injuredAreaIds={injuredAreaIds}
            interactive={interactive}
            onHover={setHoveredArea}
            onAreaClick={onAreaClick}
          />
          <MuscleSideOverlay
            areas={BACK_MUSCLE_AREAS}
            layout={BODY_MAP_LAYOUT.back}
            hoveredId={hoveredArea?.id ?? null}
            selectedAreaId={selectedAreaId}
            injuredAreaIds={injuredAreaIds}
            interactive={interactive}
            onHover={setHoveredArea}
            onAreaClick={onAreaClick}
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
            {labelArea
              ? `${labelArea.labelNl} · ${labelArea.labelEn}`
              : interactive
                ? "Klik op een spiergroep om een blessure toe te voegen"
                : "Beweeg over een spiergroep"}
          </p>
        </div>
      )}
    </div>
  );
}
