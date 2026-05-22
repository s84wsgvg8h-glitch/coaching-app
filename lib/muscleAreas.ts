export type MuscleArea = {
  id: string;
  labelNl: string;
  labelEn: string;
  path: string;
  side: "front" | "back";
};

/** Paths are authored in a 250×255 viewBox per body side. */
export const MUSCLE_VIEWBOX = { width: 250, height: 255 } as const;

export const FRONT_MUSCLE_AREAS: MuscleArea[] = [
  {
    id: "front-neck",
    labelNl: "Nek",
    labelEn: "Neck",
    side: "front",
    path: "M112 38 L138 38 L136 58 L114 58 Z",
  },
  {
    id: "front-right-shoulder",
    labelNl: "Rechter schouder",
    labelEn: "Right shoulder",
    side: "front",
    path: "M44 54 L68 46 L82 58 L74 78 L50 80 Z",
  },
  {
    id: "front-left-shoulder",
    labelNl: "Linker schouder",
    labelEn: "Left shoulder",
    side: "front",
    path: "M206 54 L182 46 L168 58 L176 78 L200 80 Z",
  },
  {
    id: "front-right-chest",
    labelNl: "Rechter borst",
    labelEn: "Right chest",
    side: "front",
    path: "M72 78 L118 74 L118 108 L72 112 Z",
  },
  {
    id: "front-left-chest",
    labelNl: "Linker borst",
    labelEn: "Left chest",
    side: "front",
    path: "M178 78 L132 74 L132 108 L178 112 Z",
  },
  {
    id: "front-right-biceps",
    labelNl: "Rechter biceps",
    labelEn: "Right biceps",
    side: "front",
    path: "M12 72 L42 68 L48 118 L38 156 L18 150 L10 108 Z",
  },
  {
    id: "front-left-biceps",
    labelNl: "Linker biceps",
    labelEn: "Left biceps",
    side: "front",
    path: "M238 72 L208 68 L202 118 L212 156 L232 150 L240 108 Z",
  },
  {
    id: "front-right-forearm",
    labelNl: "Rechter onderarm",
    labelEn: "Right forearm",
    side: "front",
    path: "M16 152 L38 158 L44 198 L18 204 L8 170 Z",
  },
  {
    id: "front-left-forearm",
    labelNl: "Linker onderarm",
    labelEn: "Left forearm",
    side: "front",
    path: "M234 152 L212 158 L206 198 L232 204 L242 170 Z",
  },
  {
    id: "front-right-abs",
    labelNl: "Rechter buik",
    labelEn: "Right abs",
    side: "front",
    path: "M98 112 L124 110 L124 162 L98 164 Z",
  },
  {
    id: "front-left-abs",
    labelNl: "Linker buik",
    labelEn: "Left abs",
    side: "front",
    path: "M152 112 L126 110 L126 162 L152 164 Z",
  },
  {
    id: "front-right-oblique",
    labelNl: "Rechter schuine buik",
    labelEn: "Right oblique",
    side: "front",
    path: "M72 112 L98 112 L98 164 L72 168 Z",
  },
  {
    id: "front-left-oblique",
    labelNl: "Linker schuine buik",
    labelEn: "Left oblique",
    side: "front",
    path: "M178 112 L152 112 L152 164 L178 168 Z",
  },
  {
    id: "front-groin",
    labelNl: "Lies",
    labelEn: "Groin",
    side: "front",
    path: "M98 164 L152 164 L144 204 L106 204 Z",
  },
  {
    id: "front-right-quad",
    labelNl: "Rechter quad",
    labelEn: "Right quad",
    side: "front",
    path: "M74 204 L118 206 L114 252 L72 252 Z",
  },
  {
    id: "front-left-quad",
    labelNl: "Linker quad",
    labelEn: "Left quad",
    side: "front",
    path: "M176 204 L132 206 L136 252 L178 252 Z",
  },
  {
    id: "front-right-calf",
    labelNl: "Rechter kuit",
    labelEn: "Right calf",
    side: "front",
    path: "M78 252 L112 252 L110 255 L76 255 Z",
  },
  {
    id: "front-left-calf",
    labelNl: "Linker kuit",
    labelEn: "Left calf",
    side: "front",
    path: "M172 252 L138 252 L140 255 L174 255 Z",
  },
];

export const BACK_MUSCLE_AREAS: MuscleArea[] = [
  {
    id: "back-traps",
    labelNl: "Trapezius",
    labelEn: "Traps",
    side: "back",
    path: "M98 48 L152 48 L162 82 L88 82 Z",
  },
  {
    id: "back-right-shoulder",
    labelNl: "Rechter achter schouder",
    labelEn: "Right rear delt",
    side: "back",
    path: "M44 54 L68 46 L82 58 L74 78 L50 80 Z",
  },
  {
    id: "back-left-shoulder",
    labelNl: "Linker achter schouder",
    labelEn: "Left rear delt",
    side: "back",
    path: "M206 54 L182 46 L168 58 L176 78 L200 80 Z",
  },
  {
    id: "back-right-upper",
    labelNl: "Rechter bovenrug",
    labelEn: "Right upper back",
    side: "back",
    path: "M88 78 L124 72 L124 132 L88 138 Z",
  },
  {
    id: "back-left-upper",
    labelNl: "Linker bovenrug",
    labelEn: "Left upper back",
    side: "back",
    path: "M162 78 L126 72 L126 132 L162 138 Z",
  },
  {
    id: "back-right-lat",
    labelNl: "Rechter lat",
    labelEn: "Right lat",
    side: "back",
    path: "M62 118 L88 112 L96 176 L70 182 Z",
  },
  {
    id: "back-left-lat",
    labelNl: "Linker lat",
    labelEn: "Left lat",
    side: "back",
    path: "M188 118 L162 112 L154 176 L180 182 Z",
  },
  {
    id: "back-lower",
    labelNl: "Onderrug",
    labelEn: "Lower back",
    side: "back",
    path: "M98 176 L152 176 L144 214 L106 214 Z",
  },
  {
    id: "back-right-triceps",
    labelNl: "Rechter triceps",
    labelEn: "Right triceps",
    side: "back",
    path: "M12 72 L42 68 L48 118 L38 156 L18 150 L10 108 Z",
  },
  {
    id: "back-left-triceps",
    labelNl: "Linker triceps",
    labelEn: "Left triceps",
    side: "back",
    path: "M238 72 L208 68 L202 118 L212 156 L232 150 L240 108 Z",
  },
  {
    id: "back-right-glute",
    labelNl: "Rechter bil",
    labelEn: "Right glute",
    side: "back",
    path: "M74 214 L118 214 L114 252 L72 248 Z",
  },
  {
    id: "back-left-glute",
    labelNl: "Linker bil",
    labelEn: "Left glute",
    side: "back",
    path: "M176 214 L132 214 L136 252 L178 248 Z",
  },
  {
    id: "back-right-hamstring",
    labelNl: "Rechter hamstring",
    labelEn: "Right hamstring",
    side: "back",
    path: "M78 248 L112 252 L108 255 L74 255 Z",
  },
  {
    id: "back-left-hamstring",
    labelNl: "Linker hamstring",
    labelEn: "Left hamstring",
    side: "back",
    path: "M172 248 L138 252 L142 255 L176 255 Z",
  },
  {
    id: "back-right-calf",
    labelNl: "Rechter kuit",
    labelEn: "Right calf",
    side: "back",
    path: "M78 252 L112 252 L110 255 L76 255 Z",
  },
  {
    id: "back-left-calf",
    labelNl: "Linker kuit",
    labelEn: "Left calf",
    side: "back",
    path: "M172 252 L138 252 L140 255 L174 255 Z",
  },
];

export const ALL_MUSCLE_AREAS = [...FRONT_MUSCLE_AREAS, ...BACK_MUSCLE_AREAS];

export function getMuscleAreaById(areaId: string) {
  return ALL_MUSCLE_AREAS.find((area) => area.id === areaId);
}

export const BODY_MAP_IMAGE = {
  src: "/body-map.png",
  width: 656,
  height: 564,
} as const;

/** Align authored 250×255 paths onto each half of the combined body-map image. */
export const BODY_MAP_LAYOUT = {
  front: { translateX: 39, translateY: 18, scale: 1.08 },
  back: { translateX: 367, translateY: 18, scale: 1.08 },
} as const;
