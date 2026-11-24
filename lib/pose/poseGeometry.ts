import type { PoseChannel } from "@/lib/pose/movementPattern";

export type PoseLandmark = {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
};

export type PoseChannels = Record<PoseChannel, number | null>;

const VISIBILITY_MIN = 0.55;
const ASYMMETRY_GAP = 28;

const LEFT = {
  shoulder: 11,
  elbow: 13,
  wrist: 15,
  hip: 23,
  knee: 25,
  ankle: 27,
  foot: 31,
} as const;

const RIGHT = {
  shoulder: 12,
  elbow: 14,
  wrist: 16,
  hip: 24,
  knee: 26,
  ankle: 28,
  foot: 32,
} as const;

export function angleDegrees(
  a: { x: number; y: number; z?: number },
  b: { x: number; y: number; z?: number },
  c: { x: number; y: number; z?: number },
) {
  const abx = a.x - b.x;
  const aby = a.y - b.y;
  const abz = (a.z ?? 0) - (b.z ?? 0);
  const cbx = c.x - b.x;
  const cby = c.y - b.y;
  const cbz = (c.z ?? 0) - (b.z ?? 0);
  const dot = abx * cbx + aby * cby + abz * cbz;
  const magnitude = Math.hypot(abx, aby, abz) * Math.hypot(cbx, cby, cbz);

  if (magnitude < 1e-8) return null;

  const cosine = Math.min(1, Math.max(-1, dot / magnitude));
  return (Math.acos(cosine) * 180) / Math.PI;
}

export function readPoseChannels(
  world: PoseLandmark[] | null | undefined,
  image: PoseLandmark[] | null | undefined,
): PoseChannels {
  return {
    knee: combineAngles(
      jointAngle(world, image, LEFT.hip, LEFT.knee, LEFT.ankle),
      jointAngle(world, image, RIGHT.hip, RIGHT.knee, RIGHT.ankle),
    ),
    hip: combineAngles(
      jointAngle(world, image, LEFT.shoulder, LEFT.hip, LEFT.knee),
      jointAngle(world, image, RIGHT.shoulder, RIGHT.hip, RIGHT.knee),
    ),
    elbow: combineAngles(
      jointAngle(world, image, LEFT.shoulder, LEFT.elbow, LEFT.wrist),
      jointAngle(world, image, RIGHT.shoulder, RIGHT.elbow, RIGHT.wrist),
    ),
    shoulder: combineAngles(
      jointAngle(world, image, LEFT.hip, LEFT.shoulder, LEFT.elbow),
      jointAngle(world, image, RIGHT.hip, RIGHT.shoulder, RIGHT.elbow),
    ),
    ankle: combineAngles(
      jointAngle(world, image, LEFT.knee, LEFT.ankle, LEFT.foot),
      jointAngle(world, image, RIGHT.knee, RIGHT.ankle, RIGHT.foot),
    ),
  };
}

export function mapVideoPointToCover(
  normalizedX: number,
  normalizedY: number,
  videoWidth: number,
  videoHeight: number,
  elementWidth: number,
  elementHeight: number,
) {
  if (
    videoWidth <= 0 ||
    videoHeight <= 0 ||
    elementWidth <= 0 ||
    elementHeight <= 0
  ) {
    return { x: normalizedX * elementWidth, y: normalizedY * elementHeight };
  }

  const videoAspect = videoWidth / videoHeight;
  const elementAspect = elementWidth / elementHeight;
  let renderedWidth = elementWidth;
  let renderedHeight = elementHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (videoAspect > elementAspect) {
    renderedWidth = elementHeight * videoAspect;
    offsetX = (elementWidth - renderedWidth) / 2;
  } else {
    renderedHeight = elementWidth / videoAspect;
    offsetY = (elementHeight - renderedHeight) / 2;
  }

  return {
    x: offsetX + normalizedX * renderedWidth,
    y: offsetY + normalizedY * renderedHeight,
  };
}

function jointAngle(
  world: PoseLandmark[] | null | undefined,
  image: PoseLandmark[] | null | undefined,
  a: number,
  b: number,
  c: number,
) {
  if (!isJointVisible(world, image, a, b, c)) return null;

  const pa = pointAt(world, image, a);
  const pb = pointAt(world, image, b);
  const pc = pointAt(world, image, c);

  if (!pa || !pb || !pc) return null;

  return angleDegrees(pa, pb, pc);
}

function isJointVisible(
  world: PoseLandmark[] | null | undefined,
  image: PoseLandmark[] | null | undefined,
  a: number,
  b: number,
  c: number,
) {
  return [a, b, c].every((index) => {
    const visibility = image?.[index]?.visibility ?? world?.[index]?.visibility;
    return visibility == null || visibility >= VISIBILITY_MIN;
  });
}

function pointAt(
  world: PoseLandmark[] | null | undefined,
  image: PoseLandmark[] | null | undefined,
  index: number,
) {
  return world?.[index] ?? image?.[index] ?? null;
}

function combineAngles(a: number | null, b: number | null) {
  if (a == null || !Number.isFinite(a)) return b;
  if (b == null || !Number.isFinite(b)) return a;
  if (Math.abs(a - b) >= ASYMMETRY_GAP) return Math.min(a, b);
  return (a + b) / 2;
}
