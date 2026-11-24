import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wasmSource = path.join(root, "node_modules/@mediapipe/tasks-vision/wasm");
const wasmTarget = path.join(root, "public/mediapipe/wasm");
const wasmFiles = ["vision_wasm_internal.js", "vision_wasm_internal.wasm"];
const modelTarget = path.join(root, "public/mediapipe/pose_landmarker_lite.task");
const modelUrl =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

mkdirSync(wasmTarget, { recursive: true });

for (const fileName of wasmFiles) {
  const from = path.join(wasmSource, fileName);
  const to = path.join(wasmTarget, fileName);

  if (!existsSync(from)) {
    throw new Error(
      `MediaPipe wasm ontbreekt (${from}). Installeer eerst @mediapipe/tasks-vision.`,
    );
  }

  const sourceStat = statSync(from);
  const targetStat = existsSync(to) ? statSync(to) : null;

  if (!targetStat || targetStat.size !== sourceStat.size) {
    copyFileSync(from, to);
  }
}

if (!existsSync(modelTarget) || statSync(modelTarget).size < 1_000_000) {
  const response = await fetch(modelUrl);

  if (!response.ok) {
    throw new Error(`Pose-model download mislukt (${response.status}).`);
  }

  const { writeFileSync } = await import("node:fs");
  writeFileSync(modelTarget, Buffer.from(await response.arrayBuffer()));
}
