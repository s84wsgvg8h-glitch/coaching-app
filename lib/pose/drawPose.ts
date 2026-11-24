import type { PoseLandmark } from "@/lib/pose/poseGeometry";
import { mapVideoPointToCover } from "@/lib/pose/poseGeometry";

const CONNECTIONS: Array<[number, number]> = [
  [11, 12],
  [11, 23],
  [12, 24],
  [23, 24],
  [11, 13],
  [13, 15],
  [12, 14],
  [14, 16],
  [23, 25],
  [25, 27],
  [24, 26],
  [26, 28],
  [27, 31],
  [28, 32],
];

export function drawPoseSkeleton(
  context: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number,
  videoWidth: number,
  videoHeight: number,
) {
  context.clearRect(0, 0, width, height);
  context.lineWidth = 3;
  context.lineCap = "round";
  context.strokeStyle = "rgba(255,255,255,0.88)";
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.shadowColor = "rgba(0,0,0,0.45)";
  context.shadowBlur = 6;

  for (const [from, to] of CONNECTIONS) {
    const start = point(landmarks, from, width, height, videoWidth, videoHeight);
    const end = point(landmarks, to, width, height, videoWidth, videoHeight);
    if (!start || !end) continue;

    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  for (const index of new Set(CONNECTIONS.flat())) {
    const joint = point(landmarks, index, width, height, videoWidth, videoHeight);
    if (!joint) continue;

    context.beginPath();
    context.arc(joint.x, joint.y, 3.5, 0, Math.PI * 2);
    context.fill();
  }

  context.shadowBlur = 0;
}

function point(
  landmarks: PoseLandmark[],
  index: number,
  width: number,
  height: number,
  videoWidth: number,
  videoHeight: number,
) {
  const landmark = landmarks[index];
  if (!landmark) return null;
  if (landmark.visibility != null && landmark.visibility < 0.45) return null;

  return mapVideoPointToCover(
    landmark.x,
    landmark.y,
    videoWidth,
    videoHeight,
    width,
    height,
  );
}
