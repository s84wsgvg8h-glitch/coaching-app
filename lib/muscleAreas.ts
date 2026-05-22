export type MuscleArea = {
  id: string;
  labelNl: string;
  labelEn: string;
  path: string;
  side: "front" | "back";
};

/** Paths are authored in a 250×255 viewBox per body side. */
export const MUSCLE_VIEWBOX = { width: 250, height: 255 } as const;

/** Decorative body outline per side (not interactive). */
export const FRONT_BODY_SILHOUETTE =
  "M125 6 C108 6 98 18 98 32 C98 38 100 42 102 44 L102 48 C95 50 88 54 82 60 L72 68 C62 74 52 82 44 92 L38 108 L32 128 L28 150 L26 168 L28 188 L32 208 L38 228 L44 242 L52 250 L58 252 L68 250 L74 242 L78 228 L82 210 L86 192 L88 178 L90 168 L92 158 L94 148 L96 140 L98 132 L100 124 L102 118 L104 112 L106 108 L108 104 L110 100 L112 96 L114 92 L116 88 L118 84 L120 80 L122 76 L124 72 L126 72 L128 76 L130 80 L132 84 L134 88 L136 92 L138 96 L140 100 L142 104 L144 108 L146 112 L148 118 L150 124 L152 132 L154 140 L156 148 L158 158 L160 168 L162 178 L164 192 L168 210 L172 228 L176 242 L182 250 L192 252 L202 250 L212 242 L218 228 L222 208 L226 188 L228 168 L226 150 L222 128 L216 108 L210 92 L202 82 L192 74 L182 68 L172 60 L166 54 L158 50 L152 48 L152 44 C154 42 156 38 156 32 C156 18 146 6 125 6 Z";

export const BACK_BODY_SILHOUETTE =
  "M125 6 C108 6 98 18 98 32 C98 38 100 42 102 44 L102 48 C95 50 88 54 82 60 L72 68 C62 74 52 82 44 92 L38 108 L32 128 L28 150 L26 168 L28 188 L32 208 L38 228 L44 242 L52 250 L58 252 L68 250 L74 242 L78 228 L82 210 L86 192 L88 178 L90 168 L92 158 L94 148 L96 140 L98 132 L100 124 L102 118 L104 112 L106 108 L108 104 L110 100 L112 96 L114 92 L116 88 L118 84 L120 80 L122 76 L124 72 L126 72 L128 76 L130 80 L132 84 L134 88 L136 92 L138 96 L140 100 L142 104 L144 108 L146 112 L148 118 L150 124 L152 132 L154 140 L156 148 L158 158 L160 168 L162 178 L164 192 L168 210 L172 228 L176 242 L182 250 L192 252 L202 250 L212 242 L218 228 L222 208 L226 188 L228 168 L226 150 L222 128 L216 108 L210 92 L202 82 L192 74 L182 68 L172 60 L166 54 L158 50 L152 48 L152 44 C154 42 156 38 156 32 C156 18 146 6 125 6 Z";

export const FRONT_MUSCLE_AREAS: MuscleArea[] = [
  {
    id: "front-neck",
    labelNl: "Nek",
    labelEn: "Neck",
    side: "front",
    path: "M112 42 C112 38 116 36 125 36 C134 36 138 38 138 42 L136 58 C136 60 134 62 125 62 C116 62 114 60 112 58 Z",
  },
  {
    id: "front-right-shoulder",
    labelNl: "Rechter schouder",
    labelEn: "Right shoulder",
    side: "front",
    path: "M72 52 C82 46 92 48 98 54 L102 62 C104 68 100 74 94 78 L82 82 C74 82 68 76 66 68 L68 58 Z",
  },
  {
    id: "front-left-shoulder",
    labelNl: "Linker schouder",
    labelEn: "Left shoulder",
    side: "front",
    path: "M178 52 C168 46 158 48 152 54 L148 62 C146 68 150 74 156 78 L168 82 C176 82 182 76 184 68 L182 58 Z",
  },
  {
    id: "front-right-chest",
    labelNl: "Rechter borst",
    labelEn: "Right chest",
    side: "front",
    path: "M88 62 C96 58 108 58 118 62 L122 68 C124 76 122 84 118 90 L104 96 C96 96 90 92 86 84 L84 72 Z",
  },
  {
    id: "front-left-chest",
    labelNl: "Linker borst",
    labelEn: "Left chest",
    side: "front",
    path: "M162 62 C154 58 142 58 132 62 L128 68 C126 76 128 84 132 90 L146 96 C154 96 160 92 164 84 L166 72 Z",
  },
  {
    id: "front-right-biceps",
    labelNl: "Rechter biceps",
    labelEn: "Right biceps",
    side: "front",
    path: "M38 68 C48 64 58 66 64 72 L68 82 C70 92 68 102 64 112 L58 124 C52 128 44 126 38 118 L32 98 C30 84 32 74 38 68 Z",
  },
  {
    id: "front-left-biceps",
    labelNl: "Linker biceps",
    labelEn: "Left biceps",
    side: "front",
    path: "M212 68 C202 64 192 66 186 72 L182 82 C180 92 182 102 186 112 L192 124 C198 128 206 126 212 118 L218 98 C220 84 218 74 212 68 Z",
  },
  {
    id: "front-right-forearm",
    labelNl: "Rechter onderarm",
    labelEn: "Right forearm",
    side: "front",
    path: "M34 122 C40 118 48 120 54 126 L58 140 C60 152 58 164 52 174 L44 182 C38 184 32 178 30 166 L28 148 C28 136 30 128 34 122 Z",
  },
  {
    id: "front-left-forearm",
    labelNl: "Linker onderarm",
    labelEn: "Left forearm",
    side: "front",
    path: "M216 122 C210 118 202 120 196 126 L192 140 C190 152 192 164 198 174 L206 182 C212 184 218 178 220 166 L222 148 C222 136 220 128 216 122 Z",
  },
  {
    id: "front-right-abs",
    labelNl: "Rechter buik",
    labelEn: "Right abs",
    side: "front",
    path: "M108 96 C112 94 118 94 122 96 L124 108 C124 118 122 128 118 136 L112 140 C108 140 106 136 106 128 L106 108 Z",
  },
  {
    id: "front-left-abs",
    labelNl: "Linker buik",
    labelEn: "Left abs",
    side: "front",
    path: "M142 96 C138 94 132 94 128 96 L126 108 C126 118 128 128 132 136 L138 140 C142 140 144 136 144 128 L144 108 Z",
  },
  {
    id: "front-right-oblique",
    labelNl: "Rechter schuine buik",
    labelEn: "Right oblique",
    side: "front",
    path: "M84 88 C88 86 96 88 102 92 L106 104 C108 118 106 132 100 144 L92 150 C86 150 82 144 80 132 L82 104 Z",
  },
  {
    id: "front-left-oblique",
    labelNl: "Linker schuine buik",
    labelEn: "Left oblique",
    side: "front",
    path: "M166 88 C162 86 154 88 148 92 L144 104 C142 118 144 132 150 144 L158 150 C164 150 168 144 170 132 L168 104 Z",
  },
  {
    id: "front-groin",
    labelNl: "Lies",
    labelEn: "Groin",
    side: "front",
    path: "M106 140 C112 138 118 138 124 140 L138 140 C144 138 150 140 154 144 L152 162 C150 170 144 176 125 176 C106 176 100 170 98 162 L100 144 Z",
  },
  {
    id: "front-right-quad",
    labelNl: "Rechter quad",
    labelEn: "Right quad",
    side: "front",
    path: "M88 176 C98 172 108 174 114 180 L118 196 C120 210 116 224 108 234 L98 238 C90 238 84 230 82 218 L84 196 Z",
  },
  {
    id: "front-left-quad",
    labelNl: "Linker quad",
    labelEn: "Left quad",
    side: "front",
    path: "M162 176 C152 172 142 174 136 180 L132 196 C130 210 134 224 142 234 L152 238 C160 238 166 230 168 218 L166 196 Z",
  },
  {
    id: "front-right-calf",
    labelNl: "Rechter kuit",
    labelEn: "Right calf",
    side: "front",
    path: "M92 238 C98 236 104 238 108 244 L110 252 C110 254 108 255 102 255 L90 255 C86 254 84 250 86 244 L88 238 Z",
  },
  {
    id: "front-left-calf",
    labelNl: "Linker kuit",
    labelEn: "Left calf",
    side: "front",
    path: "M158 238 C152 236 146 238 142 244 L140 252 C140 254 142 255 148 255 L160 255 C164 254 166 250 164 244 L162 238 Z",
  },
];

export const BACK_MUSCLE_AREAS: MuscleArea[] = [
  {
    id: "back-traps",
    labelNl: "Trapezius",
    labelEn: "Traps",
    side: "back",
    path: "M125 42 L148 52 L158 68 L142 78 L125 74 L108 78 L92 68 L102 52 Z",
  },
  {
    id: "back-right-shoulder",
    labelNl: "Rechter achter schouder",
    labelEn: "Right rear delt",
    side: "back",
    path: "M72 52 C82 46 92 48 98 54 L102 62 C104 68 100 74 94 78 L82 82 C74 82 68 76 66 68 L68 58 Z",
  },
  {
    id: "back-left-shoulder",
    labelNl: "Linker achter schouder",
    labelEn: "Left rear delt",
    side: "back",
    path: "M178 52 C168 46 158 48 152 54 L148 62 C146 68 150 74 156 78 L168 82 C176 82 182 76 184 68 L182 58 Z",
  },
  {
    id: "back-right-upper",
    labelNl: "Rechter bovenrug",
    labelEn: "Right upper back",
    side: "back",
    path: "M92 72 C100 68 112 68 120 72 L122 88 C122 98 118 108 112 114 L102 116 C96 114 92 106 90 94 L92 72 Z",
  },
  {
    id: "back-left-upper",
    labelNl: "Linker bovenrug",
    labelEn: "Left upper back",
    side: "back",
    path: "M158 72 C150 68 138 68 130 72 L128 88 C128 98 132 108 138 114 L148 116 C154 114 158 106 160 94 L158 72 Z",
  },
  {
    id: "back-right-lat",
    labelNl: "Rechter lat",
    labelEn: "Right lat",
    side: "back",
    path: "M68 88 C76 84 86 88 92 96 L96 112 C98 128 94 144 86 156 L76 162 C68 160 64 150 62 134 L64 108 Z",
  },
  {
    id: "back-left-lat",
    labelNl: "Linker lat",
    labelEn: "Left lat",
    side: "back",
    path: "M182 88 C174 84 164 88 158 96 L154 112 C152 128 156 144 164 156 L174 162 C182 160 186 150 188 134 L186 108 Z",
  },
  {
    id: "back-lower",
    labelNl: "Onderrug",
    labelEn: "Lower back",
    side: "back",
    path: "M108 114 C114 112 120 112 125 114 L142 114 C148 112 154 116 156 124 L154 142 C152 150 146 154 125 154 C104 154 98 150 96 142 L94 124 Z",
  },
  {
    id: "back-right-triceps",
    labelNl: "Rechter triceps",
    labelEn: "Right triceps",
    side: "back",
    path: "M38 68 C48 64 58 66 64 72 L68 82 C70 92 68 102 64 112 L58 124 C52 128 44 126 38 118 L32 98 C30 84 32 74 38 68 Z",
  },
  {
    id: "back-left-triceps",
    labelNl: "Linker triceps",
    labelEn: "Left triceps",
    side: "back",
    path: "M212 68 C202 64 192 66 186 72 L182 82 C180 92 182 102 186 112 L192 124 C198 128 206 126 212 118 L218 98 C220 84 218 74 212 68 Z",
  },
  {
    id: "back-right-glute",
    labelNl: "Rechter bil",
    labelEn: "Right glute",
    side: "back",
    path: "M88 154 C98 150 108 152 114 158 L116 172 C116 182 110 190 100 192 L90 190 C84 186 82 178 84 166 Z",
  },
  {
    id: "back-left-glute",
    labelNl: "Linker bil",
    labelEn: "Left glute",
    side: "back",
    path: "M162 154 C152 150 142 152 136 158 L134 172 C134 182 140 190 150 192 L160 190 C166 186 168 178 166 166 Z",
  },
  {
    id: "back-right-hamstring",
    labelNl: "Rechter hamstring",
    labelEn: "Right hamstring",
    side: "back",
    path: "M86 192 C94 188 104 190 110 196 L112 214 C112 226 106 236 98 240 L88 238 C82 234 80 224 82 210 Z",
  },
  {
    id: "back-left-hamstring",
    labelNl: "Linker hamstring",
    labelEn: "Left hamstring",
    side: "back",
    path: "M164 192 C156 188 146 190 140 196 L138 214 C138 226 144 236 152 240 L162 238 C168 234 170 224 168 210 Z",
  },
  {
    id: "back-right-calf",
    labelNl: "Rechter kuit",
    labelEn: "Right calf",
    side: "back",
    path: "M90 240 C96 238 102 240 106 246 L108 252 C108 254 104 255 98 255 L88 255 C84 254 82 250 84 244 Z",
  },
  {
    id: "back-left-calf",
    labelNl: "Linker kuit",
    labelEn: "Left calf",
    side: "back",
    path: "M160 240 C154 238 148 240 144 246 L142 252 C142 254 146 255 152 255 L162 255 C166 254 168 250 166 244 Z",
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

/** Align authored 250×255 paths onto each half of the combined body-map canvas. */
export const BODY_MAP_LAYOUT = {
  front: { translateX: 39, translateY: 18, scale: 1.08 },
  back: { translateX: 367, translateY: 18, scale: 1.08 },
} as const;
