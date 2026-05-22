export type MuscleArea = {
  id: string;
  labelNl: string;
  labelEn: string;
  path: string;
  side: "front" | "back";
};

/** Paths are authored in a 250×255 viewBox per body side. */
export const MUSCLE_VIEWBOX = { width: 250, height: 255 } as const;

const GAP = 32;
const LABEL_HEIGHT = 22;

/** Combined front + back canvas (SVG only, no background image). */
export const BODY_MAP_CANVAS = {
  width: MUSCLE_VIEWBOX.width * 2 + GAP,
  height: MUSCLE_VIEWBOX.height + LABEL_HEIGHT,
  gap: GAP,
  labelHeight: LABEL_HEIGHT,
} as const;

export const BODY_MAP_LAYOUT = {
  front: { translateX: 0, translateY: LABEL_HEIGHT, scale: 1 },
  back: {
    translateX: MUSCLE_VIEWBOX.width + GAP,
    translateY: LABEL_HEIGHT,
    scale: 1,
  },
} as const;

/** Decorative body outline per side (not interactive). */
export const FRONT_BODY_SILHOUETTE =
  "M125 6 C107 6 95 18 95 34 C95 42 99 48 105 50 L105 52 C96 54 86 58 76 64 L64 72 C54 78 46 88 40 100 L32 118 C26 134 24 152 26 170 L30 192 C34 210 40 226 50 238 L62 248 C70 252 78 250 84 242 L88 224 C90 206 92 188 94 172 L96 156 C98 144 100 132 102 122 L104 112 C106 104 108 98 110 94 L112 90 C114 86 116 82 118 78 L120 74 L122 72 L128 72 L130 74 L132 78 L134 82 L136 86 L138 90 L140 94 L142 98 L144 104 L146 112 L148 122 L150 132 L152 144 L154 156 L156 172 L158 188 L160 206 L162 224 L166 242 C172 250 180 252 188 248 L200 238 C210 226 216 210 220 192 L224 170 C226 152 224 134 218 118 L210 100 C204 88 196 78 186 72 L174 64 C164 58 154 54 145 52 L145 50 C151 48 155 42 155 34 C155 18 143 6 125 6 Z";

export const BACK_BODY_SILHOUETTE =
  "M125 6 C107 6 95 18 95 34 C95 42 99 48 105 50 L105 52 C96 54 86 58 76 64 L64 72 C54 78 46 88 40 100 L32 118 C26 134 24 152 26 170 L30 192 C34 210 40 226 50 238 L62 248 C68 252 74 250 78 244 L82 228 C84 212 86 196 88 180 L90 164 C92 150 94 138 96 128 L98 118 C100 110 102 104 104 100 L106 96 C108 92 110 88 112 84 L114 80 L116 76 L118 72 L120 70 L130 70 L132 72 L134 76 L136 80 L138 84 L140 88 L142 92 L144 96 L146 100 L148 104 L150 110 L152 118 L154 128 L156 138 L158 150 L160 164 L162 180 L164 196 L166 212 L170 228 L174 244 C178 250 184 252 190 250 L202 242 C212 230 218 214 222 196 L226 174 C228 156 226 138 220 122 L212 104 C206 92 198 82 188 76 L176 68 C166 62 156 58 147 56 L145 54 C148 52 150 48 152 44 C154 40 155 36 155 32 C155 18 143 6 125 6 Z M118 154 C114 152 110 152 106 154 L104 168 C102 178 106 186 114 188 L136 188 C144 186 148 178 146 168 L144 154 C140 152 136 152 132 154 L130 162 C128 166 122 166 120 162 Z";

export const FRONT_MUSCLE_AREAS: MuscleArea[] = [
  {
    id: "front-neck",
    labelNl: "Nek",
    labelEn: "Neck",
    side: "front",
    path: "M114 48 C114 44 118 42 125 42 C132 42 136 44 136 48 L134 58 C134 62 130 64 125 64 C120 64 116 62 114 58 Z",
  },
  {
    id: "front-right-shoulder",
    labelNl: "Rechter schouder",
    labelEn: "Right shoulder",
    side: "front",
    path: "M76 58 C86 52 96 54 102 60 L106 68 C108 74 104 80 98 84 L86 88 C78 88 72 82 70 74 L72 64 Z",
  },
  {
    id: "front-left-shoulder",
    labelNl: "Linker schouder",
    labelEn: "Left shoulder",
    side: "front",
    path: "M174 58 C164 52 154 54 148 60 L144 68 C142 74 146 80 152 84 L164 88 C172 88 178 82 180 74 L178 64 Z",
  },
  {
    id: "front-right-chest",
    labelNl: "Rechter borst",
    labelEn: "Right chest",
    side: "front",
    path: "M92 68 C100 64 112 64 120 68 L122 74 C124 82 122 90 116 96 L104 100 C96 100 90 94 88 86 L90 76 Z",
  },
  {
    id: "front-left-chest",
    labelNl: "Linker borst",
    labelEn: "Left chest",
    side: "front",
    path: "M158 68 C150 64 138 64 130 68 L128 74 C126 82 128 90 134 96 L146 100 C154 100 160 94 162 86 L160 76 Z",
  },
  {
    id: "front-right-biceps",
    labelNl: "Rechter biceps",
    labelEn: "Right biceps",
    side: "front",
    path: "M42 72 C52 68 60 70 66 76 L70 86 C72 96 70 106 66 116 L58 128 C52 132 44 128 40 118 L36 98 C34 84 36 76 42 72 Z",
  },
  {
    id: "front-left-biceps",
    labelNl: "Linker biceps",
    labelEn: "Left biceps",
    side: "front",
    path: "M208 72 C198 68 190 70 184 76 L180 86 C178 96 180 106 184 116 L192 128 C198 132 206 128 210 118 L214 98 C216 84 214 76 208 72 Z",
  },
  {
    id: "front-right-forearm",
    labelNl: "Rechter onderarm",
    labelEn: "Right forearm",
    side: "front",
    path: "M36 126 C42 122 50 124 56 130 L60 146 C62 160 58 172 50 182 L42 188 C36 190 30 184 28 170 L26 150 C26 138 30 130 36 126 Z",
  },
  {
    id: "front-left-forearm",
    labelNl: "Linker onderarm",
    labelEn: "Left forearm",
    side: "front",
    path: "M214 126 C208 122 200 124 194 130 L190 146 C188 160 192 172 200 182 L208 188 C214 190 220 184 222 170 L224 150 C224 138 220 130 214 126 Z",
  },
  {
    id: "front-right-abs",
    labelNl: "Rechter buik",
    labelEn: "Right abs",
    side: "front",
    path: "M110 102 C114 100 120 100 124 102 L126 114 C126 124 124 132 120 138 L114 142 C110 142 108 136 108 128 L108 112 Z",
  },
  {
    id: "front-left-abs",
    labelNl: "Linker buik",
    labelEn: "Left abs",
    side: "front",
    path: "M140 102 C136 100 130 100 126 102 L124 114 C124 124 126 132 130 138 L136 142 C140 142 142 136 142 128 L142 112 Z",
  },
  {
    id: "front-right-oblique",
    labelNl: "Rechter schuine buik",
    labelEn: "Right oblique",
    side: "front",
    path: "M88 92 C92 90 100 92 106 96 L110 108 C112 122 108 134 102 144 L94 150 C88 150 84 142 82 128 L84 104 Z",
  },
  {
    id: "front-left-oblique",
    labelNl: "Linker schuine buik",
    labelEn: "Left oblique",
    side: "front",
    path: "M162 92 C158 90 150 92 144 96 L140 108 C138 122 142 134 148 144 L156 150 C162 150 166 142 168 128 L166 104 Z",
  },
  {
    id: "front-groin",
    labelNl: "Lies",
    labelEn: "Groin",
    side: "front",
    path: "M108 142 C114 140 120 140 125 142 L140 142 C146 140 152 144 154 150 L152 164 C150 172 144 176 125 176 C106 176 100 172 98 164 L100 150 Z",
  },
  {
    id: "front-right-quad",
    labelNl: "Rechter quad",
    labelEn: "Right quad",
    side: "front",
    path: "M92 176 C102 172 110 174 116 180 L120 198 C122 212 118 226 110 236 L100 240 C92 240 86 232 84 218 L86 196 Z",
  },
  {
    id: "front-left-quad",
    labelNl: "Linker quad",
    labelEn: "Left quad",
    side: "front",
    path: "M158 176 C148 172 140 174 134 180 L130 198 C128 212 132 226 140 236 L150 240 C158 240 164 232 166 218 L164 196 Z",
  },
  {
    id: "front-right-calf",
    labelNl: "Rechter kuit",
    labelEn: "Right calf",
    side: "front",
    path: "M94 240 C100 238 106 240 110 246 L112 252 C112 254 108 255 102 255 L92 255 C88 254 86 250 88 244 Z",
  },
  {
    id: "front-left-calf",
    labelNl: "Linker kuit",
    labelEn: "Left calf",
    side: "front",
    path: "M156 240 C150 238 144 240 140 246 L138 252 C138 254 142 255 148 255 L158 255 C162 254 164 250 162 244 Z",
  },
];

export const BACK_MUSCLE_AREAS: MuscleArea[] = [
  {
    id: "back-traps",
    labelNl: "Trapezius",
    labelEn: "Traps",
    side: "back",
    path: "M125 48 L146 58 L154 72 L140 80 L125 76 L110 80 L96 72 L104 58 Z",
  },
  {
    id: "back-right-shoulder",
    labelNl: "Rechter achter schouder",
    labelEn: "Right rear delt",
    side: "back",
    path: "M76 58 C86 52 96 54 102 60 L106 68 C108 74 104 80 98 84 L86 88 C78 88 72 82 70 74 L72 64 Z",
  },
  {
    id: "back-left-shoulder",
    labelNl: "Linker achter schouder",
    labelEn: "Left rear delt",
    side: "back",
    path: "M174 58 C164 52 154 54 148 60 L144 68 C142 74 146 80 152 84 L164 88 C172 88 178 82 180 74 L178 64 Z",
  },
  {
    id: "back-right-upper",
    labelNl: "Rechter bovenrug",
    labelEn: "Right upper back",
    side: "back",
    path: "M96 78 C104 74 114 74 120 78 L122 92 C122 102 118 110 112 116 L102 118 C96 116 92 108 90 96 L92 82 Z",
  },
  {
    id: "back-left-upper",
    labelNl: "Linker bovenrug",
    labelEn: "Left upper back",
    side: "back",
    path: "M154 78 C146 74 136 74 130 78 L128 92 C128 102 132 110 138 116 L148 118 C154 116 158 108 160 96 L158 82 Z",
  },
  {
    id: "back-right-lat",
    labelNl: "Rechter lat",
    labelEn: "Right lat",
    side: "back",
    path: "M72 92 C80 88 90 92 96 100 L100 116 C102 130 98 144 90 154 L80 160 C72 158 68 148 66 132 L68 108 Z",
  },
  {
    id: "back-left-lat",
    labelNl: "Linker lat",
    labelEn: "Left lat",
    side: "back",
    path: "M178 92 C170 88 160 92 154 100 L150 116 C148 130 152 144 160 154 L170 160 C178 158 182 148 184 132 L182 108 Z",
  },
  {
    id: "back-lower",
    labelNl: "Onderrug",
    labelEn: "Lower back",
    side: "back",
    path: "M110 118 C114 116 120 116 125 118 L140 118 C146 116 150 120 152 128 L150 144 C148 152 142 156 125 156 C108 156 102 152 100 144 L98 128 Z",
  },
  {
    id: "back-right-triceps",
    labelNl: "Rechter triceps",
    labelEn: "Right triceps",
    side: "back",
    path: "M42 72 C52 68 60 70 66 76 L70 86 C72 96 70 106 66 116 L58 128 C52 132 44 128 40 118 L36 98 C34 84 36 76 42 72 Z",
  },
  {
    id: "back-left-triceps",
    labelNl: "Linker triceps",
    labelEn: "Left triceps",
    side: "back",
    path: "M208 72 C198 68 190 70 184 76 L180 86 C178 96 180 106 184 116 L192 128 C198 132 206 128 210 118 L214 98 C216 84 214 76 208 72 Z",
  },
  {
    id: "back-right-glute",
    labelNl: "Rechter bil",
    labelEn: "Right glute",
    side: "back",
    path: "M92 156 C100 152 108 154 114 160 L116 174 C116 184 110 192 100 194 L90 192 C84 188 82 178 84 166 Z",
  },
  {
    id: "back-left-glute",
    labelNl: "Linker bil",
    labelEn: "Left glute",
    side: "back",
    path: "M158 156 C150 152 142 154 136 160 L134 174 C134 184 140 192 150 194 L160 192 C166 188 168 178 166 166 Z",
  },
  {
    id: "back-right-hamstring",
    labelNl: "Rechter hamstring",
    labelEn: "Right hamstring",
    side: "back",
    path: "M88 194 C96 190 104 192 110 198 L112 216 C112 228 106 238 98 242 L88 240 C82 236 80 224 82 210 Z",
  },
  {
    id: "back-left-hamstring",
    labelNl: "Linker hamstring",
    labelEn: "Left hamstring",
    side: "back",
    path: "M162 194 C154 190 146 192 140 198 L138 216 C138 228 144 238 152 242 L162 240 C168 236 170 224 168 210 Z",
  },
  {
    id: "back-right-calf",
    labelNl: "Rechter kuit",
    labelEn: "Right calf",
    side: "back",
    path: "M92 242 C98 240 104 242 108 248 L110 254 C110 255 106 255 100 255 L90 255 C86 254 84 250 86 244 Z",
  },
  {
    id: "back-left-calf",
    labelNl: "Linker kuit",
    labelEn: "Left calf",
    side: "back",
    path: "M158 242 C152 240 146 242 142 248 L140 254 C140 255 144 255 150 255 L160 255 C164 254 166 250 164 244 Z",
  },
];

export const ALL_MUSCLE_AREAS = [...FRONT_MUSCLE_AREAS, ...BACK_MUSCLE_AREAS];

export function getMuscleAreaById(areaId: string) {
  return ALL_MUSCLE_AREAS.find((area) => area.id === areaId);
}
