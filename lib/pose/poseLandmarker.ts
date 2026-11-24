import type { PoseLandmark } from "@/lib/pose/poseGeometry";

const WASM_BASE = "/mediapipe/wasm";
const MODEL_PATH = "/mediapipe/pose_landmarker_lite.task";

type PoseLandmarkerInstance = {
  detectForVideo: (
    video: HTMLVideoElement,
    timestamp: number,
  ) => {
    landmarks?: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
    worldLandmarks?: Array<Array<{ x: number; y: number; z: number; visibility?: number }>>;
  };
};

let landmarkerPromise: Promise<PoseLandmarkerInstance> | null = null;
let lastTimestamp = 0;

export type PoseFrame = {
  image: PoseLandmark[];
  world: PoseLandmark[];
};

export function loadPoseLandmarker() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Pose Landmarker draait alleen in de browser."));
  }

  if (!landmarkerPromise) {
    landmarkerPromise = createPoseLandmarker().catch((error) => {
      landmarkerPromise = null;
      throw error;
    });
  }

  return landmarkerPromise;
}

export function nextPoseTimestamp(now = performance.now()) {
  const timestamp = now <= lastTimestamp ? lastTimestamp + 1 : now;
  lastTimestamp = timestamp;
  return timestamp;
}

export async function detectPoseFrame(
  video: HTMLVideoElement,
  timestamp: number,
): Promise<PoseFrame | null> {
  const landmarker = await loadPoseLandmarker();
  const result = landmarker.detectForVideo(video, timestamp);
  const image = result.landmarks?.[0];

  if (!image?.length) return null;

  return {
    image: image.map(toLandmark),
    world: (result.worldLandmarks?.[0] ?? []).map(toLandmark),
  };
}

async function createPoseLandmarker(): Promise<PoseLandmarkerInstance> {
  const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  const canvas = document.createElement("canvas");
  const shared = {
    runningMode: "VIDEO" as const,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    canvas,
  };

  try {
    return await PoseLandmarker.createFromOptions(fileset, {
      ...shared,
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: "GPU",
      },
    });
  } catch (gpuError) {
    console.warn("Pose Landmarker GPU niet beschikbaar, val terug op CPU.", gpuError);
    const cpuFileset = await FilesetResolver.forVisionTasks(WASM_BASE);
    return PoseLandmarker.createFromOptions(cpuFileset, {
      ...shared,
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: "CPU",
      },
    });
  }
}

function toLandmark(landmark: {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}): PoseLandmark {
  return {
    x: landmark.x,
    y: landmark.y,
    z: landmark.z,
    visibility: landmark.visibility,
  };
}
