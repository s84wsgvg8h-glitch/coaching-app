"use client";

import Image from "next/image";
import { useState } from "react";

type BodyArea = {
  id: string;
  label: string;
  path: string;
};

const frontAreas: BodyArea[] = [
  {
    id: "front-right-shoulder",
    label: "Rechts schouder",
    path: "M44 54 L68 46 L82 58 L74 78 L50 80 Z",
  },
  {
    id: "front-left-shoulder",
    label: "Links schouder",
    path: "M206 54 L182 46 L168 58 L176 78 L200 80 Z",
  },
  {
    id: "front-right-chest",
    label: "Rechts borst",
    path: "M72 78 L118 74 L118 108 L72 112 Z",
  },
  {
    id: "front-left-chest",
    label: "Links borst",
    path: "M178 78 L132 74 L132 108 L178 112 Z",
  },
  {
    id: "front-right-arm",
    label: "Rechts biceps",
    path: "M12 72 L42 68 L48 118 L38 156 L18 150 L10 108 Z",
  },
  {
    id: "front-left-arm",
    label: "Links biceps",
    path: "M238 72 L208 68 L202 118 L212 156 L232 150 L240 108 Z",
  },
  {
    id: "front-right-abs",
    label: "Rechts buik",
    path: "M98 112 L124 110 L124 162 L98 164 Z",
  },
  {
    id: "front-left-abs",
    label: "Links buik",
    path: "M152 112 L126 110 L126 162 L152 164 Z",
  },
  {
    id: "front-groin",
    label: "Lies",
    path: "M98 164 L152 164 L144 204 L106 204 Z",
  },
  {
    id: "front-right-quad",
    label: "Rechts quad",
    path: "M74 204 L118 206 L114 252 L72 252 Z",
  },
  {
    id: "front-left-quad",
    label: "Links quad",
    path: "M176 204 L132 206 L136 252 L178 252 Z",
  },
  {
    id: "front-right-calf",
    label: "Rechts kuit",
    path: "M78 252 L112 252 L110 255 L76 255 Z",
  },
  {
    id: "front-left-calf",
    label: "Links kuit",
    path: "M172 252 L138 252 L140 255 L174 255 Z",
  },
];

const backAreas: BodyArea[] = [
  {
    id: "back-right-shoulder",
    label: "Rechts achter schouder",
    path: "M44 54 L68 46 L82 58 L74 78 L50 80 Z",
  },
  {
    id: "back-left-shoulder",
    label: "Links achter schouder",
    path: "M206 54 L182 46 L168 58 L176 78 L200 80 Z",
  },
  {
    id: "back-right-upper",
    label: "Rechts bovenrug",
    path: "M88 78 L124 72 L124 132 L88 138 Z",
  },
  {
    id: "back-left-upper",
    label: "Links bovenrug",
    path: "M162 78 L126 72 L126 132 L162 138 Z",
  },
  {
    id: "back-right-lat",
    label: "Rechts lat",
    path: "M62 118 L88 112 L96 176 L70 182 Z",
  },
  {
    id: "back-left-lat",
    label: "Links lat",
    path: "M188 118 L162 112 L154 176 L180 182 Z",
  },
  {
    id: "back-lower",
    label: "Onderrug",
    path: "M98 176 L152 176 L144 214 L106 214 Z",
  },
  {
    id: "back-right-glute",
    label: "Rechts bil",
    path: "M74 214 L118 214 L114 252 L72 248 Z",
  },
  {
    id: "back-left-glute",
    label: "Links bil",
    path: "M176 214 L132 214 L136 252 L178 248 Z",
  },
  {
    id: "back-right-hamstring",
    label: "Rechts hamstring",
    path: "M78 248 L112 252 L108 255 L74 255 Z",
  },
  {
    id: "back-left-hamstring",
    label: "Links hamstring",
    path: "M172 248 L138 252 L142 255 L176 255 Z",
  },
];

function BodySideMap({
  title,
  imageSrc,
  areas,
  hoveredId,
  onHover,
}: {
  title: string;
  imageSrc: string;
  areas: BodyArea[];
  hoveredId: string | null;
  onHover: (area: BodyArea | null) => void;
}) {
  return (
    <div className="flex flex-col items-center">
      <h3 className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-gray-500">
        {title}
      </h3>

      <div className="relative w-[250px] max-w-full">
        <Image
          src={imageSrc}
          alt={title}
          width={250}
          height={255}
          className="h-auto w-full select-none"
          priority
        />

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 250 255"
          aria-hidden="true"
        >
          {areas.map((area) => {
            const isHovered = hoveredId === area.id;

            return (
              <path
                key={area.id}
                d={area.path}
                fill="#dc2626"
                fillOpacity={isHovered ? 0.92 : 0}
                stroke={isHovered ? "#991b1b" : "transparent"}
                strokeWidth="1.5"
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => onHover(area)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => onHover(area)}
                onBlur={() => onHover(null)}
                tabIndex={0}
              >
                <title>{area.label}</title>
              </path>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function BodyAreaDiagram() {
  const [hoveredArea, setHoveredArea] = useState<BodyArea | null>(null);

  return (
    <div className="rounded-3xl border border-gray-200 bg-[#eceff3] p-8 shadow-xl">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-black">Lichaamsgebieden</h2>
        <p className="mt-2 text-gray-500">
          Beweeg over een gebied om de naam te zien. Links en rechts zijn apart
          aangegeven.
        </p>
      </div>

      <div className="flex flex-col items-center justify-center gap-10 xl:flex-row xl:items-start xl:justify-center">
        <BodySideMap
          title="Voorkant"
          imageSrc="/body-map-front.png"
          areas={frontAreas}
          hoveredId={hoveredArea?.id ?? null}
          onHover={setHoveredArea}
        />
        <BodySideMap
          title="Achterkant"
          imageSrc="/body-map-back.png"
          areas={backAreas}
          hoveredId={hoveredArea?.id ?? null}
          onHover={setHoveredArea}
        />
      </div>

      <div className="mx-auto mt-8 flex min-h-[52px] max-w-md items-center justify-center rounded-2xl border border-gray-200 bg-white px-6 py-3 text-center shadow-sm">
        <p className="text-sm font-bold text-black">
          {hoveredArea ? hoveredArea.label : "Hover over een lichaamsgebied"}
        </p>
      </div>
    </div>
  );
}
